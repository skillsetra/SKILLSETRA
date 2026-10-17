from uuid import UUID
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings
from .workspace import workspace_store

security = HTTPBearer(auto_error=False)

async def current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(security),
    demo_session: str | None = Header(default=None, alias="X-SKILLSETRA-Demo-Session"),
):
    """Allow authenticated Supabase accounts and explicitly selected demo sessions side by side.

    A valid bearer token always selects the real user-scoped Supabase workspace. Demo mode only
    applies when a request has no bearer token and supplies a valid, session-scoped demo UUID.
    """
    environment = (settings.environment or "demo").lower()

    if creds and creds.credentials:
        if not settings.supabase_url or not settings.supabase_anon_key or not settings.supabase_service_role_key:
            raise HTTPException(status_code=503, detail="Supabase production authentication is not configured")
        try:
            from supabase import create_client
            sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
            result = sb.auth.get_user(creds.credentials)
            if not result.user:
                raise ValueError("No user")
            uid = str(result.user.id)
            workspace_store.bind(uid, creds.credentials, is_demo=False)
            request.state.ws_uid = uid
            request.state.ws_token = creds.credentials
            request.state.ws_is_demo = False
            return {"id": uid, "email": result.user.email or "", "mode": "supabase"}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session") from exc

    if demo_session:
        if not settings.demo_mode or (environment in {"production", "prod"} and not settings.allow_production_demo):
            raise HTTPException(status_code=503, detail="Demo mode is disabled for production unless ALLOW_PRODUCTION_DEMO=true is intentionally enabled. Otherwise, sign in with your account.")
        try:
            session_id = str(UUID(demo_session))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=401, detail="Invalid demo session. Start a fresh demo.")
        uid = f"demo-{session_id}"
        workspace_store.bind(uid, None, is_demo=True)
        request.state.ws_uid = uid
        request.state.ws_token = None
        request.state.ws_is_demo = True
        return {"id": uid, "email": "", "mode": "demo"}

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
