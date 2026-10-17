from .config import settings
from .workspace import _workspace_token

def client():
    if not settings.supabase_url or not settings.supabase_anon_key:return None
    token=_workspace_token.get()
    if not token:return None
    try:
      from supabase import create_client
      sb=create_client(settings.supabase_url,settings.supabase_anon_key);sb.postgrest.auth(token);return sb
    except Exception:return None

def fetch_profile(user_id:str):
    sb=client();
    if not sb:return None
    r=sb.table('profiles').select('*').eq('id',user_id).maybe_single().execute();return r.data

def upsert_profile(user_id:str,data:dict):
    sb=client();
    if not sb:return None
    r=sb.table('profiles').upsert({'id':user_id,**data}).execute();return r.data[0] if r.data else data

def fetch_settings(user_id:str):
    sb=client();
    if not sb:return None
    r=sb.table('user_settings').select('*').eq('user_id',user_id).maybe_single().execute();return r.data

def upsert_settings(user_id:str,data:dict):
    sb=client();
    if not sb:return None
    r=sb.table('user_settings').upsert({'user_id':user_id,**data}).execute();return r.data[0] if r.data else data


def public_client():
    if not settings.supabase_url or not settings.supabase_anon_key:return None
    try:
      from supabase import create_client
      return create_client(settings.supabase_url,settings.supabase_anon_key)
    except Exception:return None

def fetch_catalog(table:str):
    sb=public_client();
    if not sb:return []
    try:
      return sb.table(table).select('*').execute().data or []
    except Exception:return []


def fetch_user_competencies(user_id:str):
    sb=client();
    if not sb:return []
    try:
      r=sb.table('user_competencies').select('*,competencies(name,description)').eq('user_id',user_id).execute();return r.data or []
    except Exception:return []
