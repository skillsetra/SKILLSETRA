from contextvars import ContextVar
from copy import deepcopy
from pathlib import Path
import os
import json, sqlite3, hashlib
from datetime import datetime, timezone, timedelta
from ..data import DEMO_PROFILE
from .config import settings

_workspace_user:ContextVar[str]=ContextVar('skillsetra_workspace_user',default='')
_workspace_token:ContextVar[str|None]=ContextVar('skillsetra_workspace_token',default=None)
_workspace_is_demo:ContextVar[bool|None]=ContextVar('skillsetra_workspace_is_demo',default=None)
_ROOT=Path(__file__).resolve().parents[2]
_DB=Path(os.getenv('SKILLSETRA_DB_PATH', str(_ROOT/'data'/'skillsetra_demo.db'))).expanduser()
if not _DB.is_absolute(): _DB=_ROOT/_DB
_BASE_TEMPLATE={
 'profile':{'id':'','name':'','email':'','target_role':'','experience':'','goal':'','primary_goal':''},
 'settings':{'ai_provider':settings.ai_provider,'ai_model':settings.puter_model,'notifications':True,'appearance':'dark','privacy':True,'language':'English'},
 'evidence':[],'evidence_claims':[],'competency_progress':{},'competency_signal_history':{},'role_skill_progress':{},'role_skill_signal_history':{},'retest_index':0,'selected_repos':[],'github_analysis':None,'learning_links':[],'interview_sessions':[],
 'notifications':[],'contact_messages':[],'roadmap_materials':[],'learning_progress':{},'bookmarks':[],'roadmap':None,'assessment_attempts':[],'challenge_attempts':[],'projects':[],'resume_draft':None,'ai_history':[],'generated_assessments':{}
}
_DEMO_TEMPLATE=deepcopy(_BASE_TEMPLATE)
_DEMO_TEMPLATE['profile']=deepcopy(DEMO_PROFILE)
_DEMO_TEMPLATE['profile']['email']=''
_DEMO_TEMPLATE['evidence']=[]

def _sqlite():
 _DB.parent.mkdir(parents=True,exist_ok=True); c=sqlite3.connect(_DB, timeout=15); c.execute('PRAGMA busy_timeout=15000'); c.execute('PRAGMA journal_mode=WAL'); c.execute('PRAGMA synchronous=NORMAL'); c.execute('create table if not exists workspace_snapshots(user_id text primary key,data text not null,updated_at text default current_timestamp)'); c.commit();return c

def _supabase_client():
 if not settings.supabase_url or not settings.supabase_anon_key:return None
 token=_workspace_token.get()
 if not token:return None
 try:
  from supabase import create_client
  sb=create_client(settings.supabase_url,settings.supabase_anon_key)
  sb.postgrest.auth(token)
  return sb
 except Exception:return None

class WorkspaceStore:
 MAX_CACHED_WORKSPACES=500
 def __init__(self): self._cache={}; self._last_seen={}; self._saved_hash={}
 def bind(self,user_id:str,token:str|None=None,is_demo:bool|None=None):
  _workspace_user.set(user_id);_workspace_token.set(token);_workspace_is_demo.set(settings.demo_mode if is_demo is None else bool(is_demo));return user_id
 def is_demo(self)->bool:
  mode=_workspace_is_demo.get()
  return settings.demo_mode if mode is None else mode
 def _load(self,uid):
  if self.is_demo():
   c=_sqlite();r=c.execute('select data,updated_at from workspace_snapshots where user_id=?',(uid,)).fetchone();c.close()
   if r:
    try:
     saved_at=datetime.fromisoformat(r[1]).replace(tzinfo=timezone.utc) if r[1] else datetime.now(timezone.utc)
     ttl=timedelta(hours=max(1,settings.demo_session_ttl_hours))
     if datetime.now(timezone.utc)-saved_at > ttl:
      c=_sqlite();c.execute('delete from workspace_snapshots where user_id=?',(uid,));c.commit();c.close()
      raise ValueError('Expired demo workspace')
     self._last_seen[uid]=saved_at
     loaded=json.loads(r[0]);base=deepcopy(_DEMO_TEMPLATE if self.is_demo() else _BASE_TEMPLATE)
     for key,value in base.items(): loaded.setdefault(key,deepcopy(value))
     loaded.setdefault('profile', {})['id']=uid
     if self.is_demo(): loaded['profile']['email']=''
     saved_settings=loaded.setdefault('settings',deepcopy(base['settings']))
     # Migrate saved workspace preferences to the currently supported providers.
     if saved_settings.get('ai_provider') != 'puter': saved_settings['ai_provider']='puter'; saved_settings['ai_model']=settings.puter_model
     return loaded
    except Exception:pass
   fresh=deepcopy(_DEMO_TEMPLATE if self.is_demo() else _BASE_TEMPLATE)
   fresh['profile']['id']=uid
   if self.is_demo(): fresh['profile']['email']=''
   return fresh
  sb=_supabase_client()
  if not sb:
   raise RuntimeError('Supabase workspace read is unavailable; refusing to substitute an empty workspace.')
  try:
   r=sb.table('workspace_snapshots').select('data').eq('user_id',uid).maybe_single().execute()
   if r.data and r.data.get('data'):
    loaded=r.data['data'];base=deepcopy(_BASE_TEMPLATE)
    for key,value in base.items(): loaded.setdefault(key,deepcopy(value))
    loaded.setdefault('profile', {})['id']=uid
    saved_settings=loaded.setdefault('settings',deepcopy(_BASE_TEMPLATE['settings']))
    if saved_settings.get('ai_provider') != 'puter':
     saved_settings['ai_provider']='puter';saved_settings['ai_model']=settings.puter_model
    return loaded
   fresh=deepcopy(_BASE_TEMPLATE)
   fresh['profile']['id']=uid
   return fresh
  except Exception as exc:
   raise RuntimeError('Supabase workspace read failed; refusing to overwrite data with a blank workspace.') from exc
 def _current(self):
  uid=_workspace_user.get()
  if self.is_demo() and uid in self._cache:
   last=self._last_seen.get(uid)
   ttl=timedelta(hours=max(1,settings.demo_session_ttl_hours))
   if last and datetime.now(timezone.utc)-last > ttl:
    self._cache.pop(uid,None);self._last_seen.pop(uid,None)
    c=_sqlite();c.execute('delete from workspace_snapshots where user_id=?',(uid,));c.commit();c.close()
  if uid not in self._cache:
   self._cache[uid]=self._load(uid)
   # Bound memory: every request persists its workspace, so the oldest cached entries can be dropped safely.
   while len(self._cache)>self.MAX_CACHED_WORKSPACES:
    oldest=next(iter(self._cache))
    if oldest==uid:break
    self._cache.pop(oldest,None);self._last_seen.pop(oldest,None);self._saved_hash.pop(oldest,None)
  return self._cache[uid]
 def persist(self):
  uid=_workspace_user.get();data=self._cache.get(uid)
  if data is None:return
  payload=json.dumps(data,sort_keys=True,default=str)
  digest=hashlib.sha256(payload.encode()).hexdigest()
  if self._saved_hash.get(uid)==digest:return  # nothing changed since the last successful save
  if self.is_demo():
   c=_sqlite()
   try:
    c.execute('insert into workspace_snapshots(user_id,data,updated_at) values(?,?,current_timestamp) on conflict(user_id) do update set data=excluded.data,updated_at=current_timestamp',(uid,payload));c.commit()
   finally:c.close()
   self._last_seen[uid]=datetime.now(timezone.utc);self._saved_hash[uid]=digest;return
  sb=_supabase_client()
  if not sb:
   raise RuntimeError('Supabase workspace persistence is unavailable; refusing to report a successful write.')
  sb.table('workspace_snapshots').upsert({'user_id':uid,'data':json.loads(payload),'updated_at':datetime.now(timezone.utc).isoformat()}).execute()
  self._saved_hash[uid]=digest
 def reset(self,uid:str):
  self._cache.pop(uid,None);self._saved_hash.pop(uid,None);self._last_seen.pop(uid,None)
  if self.is_demo():
   c=_sqlite();c.execute('delete from workspace_snapshots where user_id=?',(uid,));c.commit();c.close()
  return self.bind(uid,None,is_demo=self.is_demo())

 def __getitem__(self,key):return self._current()[key]
 def __setitem__(self,key,value):self._current()[key]=value
 def get(self,key,default=None):return self._current().get(key,default)

workspace_store=WorkspaceStore()
