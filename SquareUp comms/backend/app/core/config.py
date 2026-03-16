from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SquareUp Comms"
    DEBUG: bool = True

    # Database (SQLite for local dev; docker-compose overrides to PostgreSQL)
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"

    # Firebase
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-credentials.json"

    # Auth
    ENABLE_DEV_AUTH: bool = True  # When False, X-User-Id fallback is rejected

    # Google OAuth (Calendar + Gmail integration)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/calendar/callback"

    # Gmail Sync
    GMAIL_SYNC_ENABLED: bool = False
    GMAIL_SYNC_INTERVAL_SECONDS: int = 300  # 5 minutes

    # Email tracking base URL
    EMAIL_TRACKING_BASE_URL: str = "http://localhost:8000/api/crm/v2"

    # Claude / Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_MODEL: str = "claude-sonnet-4-6"

    # LLM Provider (Groq via OpenAI-compatible API)
    GROQ_API_KEY: Optional[str] = None
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_MODEL: str = "llama-3.3-70b-versatile"

    # LiveKit
    LIVEKIT_URL: str = "ws://localhost:7880"
    LIVEKIT_API_KEY: Optional[str] = None
    LIVEKIT_API_SECRET: Optional[str] = None

    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # File Storage
    FIREBASE_STORAGE_BUCKET: Optional[str] = None

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # Encryption
    ENCRYPTION_KEY: Optional[str] = None  # Fernet key for OAuth tokens

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
