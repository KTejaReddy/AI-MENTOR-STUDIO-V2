from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pathlib import Path
import json

_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent
_env_path = _backend_dir / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_path),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "sqlite:///./data/mentor_ai_studio.db"
    log_level: str = "INFO"
    cors_origins: str = '["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000","http://127.0.0.1:3000"]'
    app_name: str = "Mentor AI Studio"
    app_version: str = "2.0.0"

    # Security Settings
    jwt_secret: str = "development-jwt-secret-replace-in-prod"
    jwt_refresh_secret: str = "development-jwt-refresh-secret-replace-in-prod"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    secure_cookies: bool = False  # Set to True in production (HTTPS)

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Supabase (requires DATABASE_URL to be set to the PostgreSQL connection string)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_db_password: str = ""
    
    # Orchestrator Configuration
    orchestrator_mode: str = "legacy"  # 'legacy' or 'adaptive'
    shadow_percentage: int = 5  # 0 to 100

    @property
    def cors_origin_list(self) -> List[str]:
        try:
            origins = json.loads(self.cors_origins)
            if not isinstance(origins, list):
                origins = [str(origins)]
        except json.JSONDecodeError:
            # If it's a simple comma-separated string
            origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
            
        # Ensure the frontend deployed origin is explicitly allowed
        frontend_origin = "https://ai-mentor-studio-v2-1.onrender.com"
        if frontend_origin not in origins:
            origins.append(frontend_origin)
            
        return origins


settings = Settings()
