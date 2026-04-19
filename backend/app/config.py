import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """Application configuration with environment variable support."""
    PROJECT_NAME: str = "Disease Risk Predictor"
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str = "postgresql://user:pass@db:5432/disease_risk_db"
    ASYNC_DATABASE_URL: str | None = None
    
    # Use environment variables first
    model_config = SettingsConfigDict(extra="ignore")

    def __init__(self, **values):
        super().__init__(**values)
        # Manually override with NEON_ prefixed vars if they exist
        neon_db = os.getenv("NEON_DB_URL")
        neon_async = os.getenv("NEON_ASYNC_DB_URL")
        if neon_db:
            self.DATABASE_URL = neon_db
        if neon_async:
            self.ASYNC_DATABASE_URL = neon_async
        # Ensure ASYNC_DATABASE_URL is set if only NEON_DB_URL is provided
        if self.DATABASE_URL and not self.ASYNC_DATABASE_URL:
             self.ASYNC_DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    

settings = Settings()
