import hashlib,logging,time,uuid
from collections import defaultdict, deque
from threading import Lock
from fastapi import FastAPI,Request,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .core.config import settings
from .routes import router
from .core.workspace import workspace_store
_production = (settings.environment or 'demo').lower() in {'production', 'prod'}
app=FastAPI(title=settings.app_name,version='3.0.0',docs_url=None if _production else '/docs',redoc_url=None if _production else '/redoc',openapi_url=None if _production else '/openapi.json')
logger=logging.getLogger('skillsetra')
_rate_windows=defaultdict(deque)
_last_prune=[0.0]
_rate_lock=Lock()
def _client_identity(request:Request)->str:
 # Behind the same-origin Next.js proxy every request arrives from 127.0.0.1, so the socket peer alone
 # would put all users in one bucket. Add the demo session id or a hash of the bearer token.
 peer=request.client.host if request.client else 'unknown'
 session=request.headers.get('x-skillsetra-demo-session') or ''
 auth=request.headers.get('authorization') or ''
 token=hashlib.sha256(auth.encode()).hexdigest()[:16] if auth else ''
 return f"{peer}|{session[:64]}|{token}"
def _prune_rate_windows(now:float):
 if now-_last_prune[0]<60:return
 _last_prune[0]=now
 for k in [k for k,w in _rate_windows.items() if not w or now-w[-1]>=60]:_rate_windows.pop(k,None)
def _rate_limit_for(path: str) -> int:
 if any(part in path for part in ('/resume/extract','/github/analyze')): return min(settings.rate_limit_per_minute, 10)
 if '/contact' in path: return min(settings.rate_limit_per_minute, 5)
 if any(part in path for part in ('/ai/','/interview','/reasoning/analyze','/interpret/analyze','/project-defense','/practice/record-result','/assessment/submit','/assessment/generate')): return min(settings.rate_limit_per_minute, 20)
 return settings.rate_limit_per_minute
@app.exception_handler(HTTPException)
async def http_error(request:Request,exc:HTTPException):
 rid=request.headers.get('x-skillsetra-request-id') or str(uuid.uuid4());return JSONResponse(status_code=exc.status_code,content={'success':False,'error':{'code':f'HTTP_{exc.status_code}','message':str(exc.detail),'request_id':rid}},headers={'X-Request-ID':rid})
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.cors_origins.split(',') if x.strip()],allow_credentials=True,allow_methods=['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allow_headers=['*'])
@app.middleware('http')
async def request_guard(request:Request,call_next):
 if request.url.path.startswith('/api/') and not request.url.path.startswith('/api/v1/'):
  request.scope['path']='/api/v1/'+request.url.path[len('/api/'): ]
 rid=request.headers.get('x-skillsetra-request-id') or str(uuid.uuid4())
 path=request.url.path
 if path.startswith('/api/v1/') and path not in {'/api/v1/health'}:
  # Identity = socket peer + demo session / token hash; never an untrusted X-Forwarded-For header.
  route=path.split('?')[0]
  peer=request.client.host if request.client else 'unknown'
  # Session IDs are caller-controlled in demo mode. Keep the per-session bucket for usability,
  # plus a broader peer bucket so rotating UUIDs cannot completely bypass resource controls.
  keys_limits=[((_client_identity(request), route), max(1, _rate_limit_for(path))), ((f"peer:{peer}", route), max(600, _rate_limit_for(path) * 10))]
  now=time.monotonic()
  with _rate_lock:
   _prune_rate_windows(now)
   for key, limit in keys_limits:
    window=_rate_windows[key]
    while window and now-window[0] >= 60: window.popleft()
    if len(window) >= limit:
     retry=max(1,int(60-(now-window[0])))
     return JSONResponse(status_code=429,content={'success':False,'error':{'code':'RATE_LIMITED','message':'Too many requests. Wait briefly and try again.','request_id':rid}},headers={'X-Request-ID':rid,'Retry-After':str(retry),'X-Content-Type-Options':'nosniff'})
   for key, _limit in keys_limits:
    _rate_windows[key].append(now)
 try:
  response=await call_next(request)
  uid=getattr(request.state,'ws_uid',None)
  if uid and request.url.path.startswith('/api/v1') and response.status_code<500:
   # The auth dependency runs in a child task, so its context variables do not reach this middleware.
   # Re-bind from request.state, then save (a no-op when the workspace is unchanged).
   workspace_store.bind(uid,getattr(request.state,'ws_token',None),getattr(request.state,'ws_is_demo',None))
   workspace_store.persist()
  response.headers['X-Request-ID']=rid;response.headers['X-Content-Type-Options']='nosniff';response.headers['X-Frame-Options']='DENY';response.headers['Referrer-Policy']='strict-origin-when-cross-origin';response.headers['Permissions-Policy']='camera=(),microphone=(self),geolocation=()';response.headers['Content-Security-Policy']="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://js.puter.com; connect-src 'self' https:; frame-ancestors 'none'; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com"
  return response
 except Exception:
  logger.exception('Unhandled error for %s %s (request %s)',request.method,request.url.path,rid)
  return JSONResponse(status_code=500,content={'success':False,'error':{'code':'INTERNAL_ERROR','message':'Unexpected server error','request_id':rid}},headers={'X-Request-ID':rid,'X-Content-Type-Options':'nosniff'})
app.include_router(router)
# Learning materials are served only through the authenticated /api/v1/materials/file/ endpoint.
# (A public static mount used to bypass authentication and the file-type allowlist.)
@app.get('/')
async def root():
 return {'name':'SKILLSETRA API','status':'running','docs':'/docs' if not _production else None,'mode':'mixed' if settings.demo_mode and (not _production or settings.allow_production_demo) else 'production'}
