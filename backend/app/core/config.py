import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name:str="SKILLSETRA API"
    environment:str = "production" if os.getenv("NODE_ENV", "").lower() == "production" else "demo"
    demo_mode:bool=True
    allow_production_demo:bool=False
    supabase_url:str="https://vlocisohebbxigjlfbhg.supabase.co"
    supabase_anon_key:str="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsb2Npc29oZWJieGlnamxmYmhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMzQ4ODAsImV4cCI6MjEwNzgxMDg4MH0.4Sj-XLS2rM0Amns8gu3AeC3UhgcnsLsTpPCGJx51gz4"
    supabase_service_role_key:str="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsb2Npc29oZWJieGlnamxmYmhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIzNDg4MCwiZXhwIjoyMTA3ODEwODgwfQ.d54zgapKNb7eCJq3U8Y9TOrWfUJ4KqTlAwgSEJqlBNA"
    ai_provider:str="puter"
    puter_model:str="openai/gpt-oss-20b"
    github_token:str=""
    admin_user_ids:str="skillsetra"
    demo_session_ttl_hours:int=720
    cors_origins:str="http://localhost:3000,https://skillsetra-lz2i.onrender.com"
    rate_limit_per_minute:int=60
    request_timeout_seconds:int=20
    model_config=SettingsConfigDict(env_file=".env",extra="ignore",case_sensitive=False)
settings=Settings()
# Migrate stale deployment environment values to a supported provider.
# Puter AI is the only supported runtime provider, including after upgrades from older env files.
settings.ai_provider = "puter"
