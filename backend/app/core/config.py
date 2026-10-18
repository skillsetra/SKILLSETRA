import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "SKILLSETRA API"
    environment: str = "production" if os.getenv("NODE_ENV", "").lower() == "production" else "demo"
    demo_mode: bool = True
    allow_production_demo: bool = False
    # Never ship credentials in source. Render/production must provide these as secrets.
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    ai_provider: str = "puter"
    puter_model: str = "openai/gpt-oss-20b"
    github_token: str = ""
    admin_user_ids: str = ""
    demo_session_ttl_hours: int = 720
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    rate_limit_per_minute: int = 60
    request_timeout_seconds: int = 20
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

settings = Settings()
# Puter AI is the only supported runtime provider.
settings.ai_provider = "puter"
