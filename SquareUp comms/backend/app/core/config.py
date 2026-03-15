from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SquareUp Comms"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/squareup_comms"

    # Firebase
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None

    # Claude / Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_MODEL: str = "claude-sonnet-4-6"

    # LiveKit
    LIVEKIT_URL: str = "ws://localhost:7880"
    LIVEKIT_API_KEY: Optional[str] = None
    LIVEKIT_API_SECRET: Optional[str] = None

    # File Storage
    FIREBASE_STORAGE_BUCKET: Optional[str] = None

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # Encryption
    ENCRYPTION_KEY: Optional[str] = None  # Fernet key for OAuth tokens

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
