"""
Application configuration (config.py)
=======================================
Uses pydantic-settings to load config from environment variables.
Fields have safe defaults for local Docker Compose development.

Why NEON_ prefix vars?
  Neon PostgreSQL connection strings are provided as NEON_DB_URL /
  NEON_ASYNC_DB_URL in the Render environment. Pydantic-settings would
  need DATABASE_URL / ASYNC_DATABASE_URL, which conflicts with other
  services' naming. The __init__ override maps NEON_ → internal names.

BASE_DIR is the backend/ directory — used by Alembic to find alembic.ini
and the migrations folder at startup.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolves to backend/ (parent of backend/app/)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """Application configuration with environment variable support."""
    PROJECT_NAME: str = "Disease Risk Predictor"
    REDIS_URL: str = "redis://localhost:6379/0"
    # Default points to Docker Compose service name "db"
    DATABASE_URL: str = "postgresql://user:pass@db:5432/disease_risk_db"
    ASYNC_DATABASE_URL: str | None = None

    model_config = SettingsConfigDict(extra="ignore")

    def __init__(self, **values):
        super().__init__(**values)
        # Neon provides NEON_DB_URL; remap it to the internal DATABASE_URL field.
        neon_db = os.getenv("NEON_DB_URL")
        neon_async = os.getenv("NEON_ASYNC_DB_URL")
        if neon_db:
            self.DATABASE_URL = neon_db
        if neon_async:
            self.ASYNC_DATABASE_URL = neon_async
        # Auto-derive async URL from sync URL if not explicitly provided.
        if self.DATABASE_URL and not self.ASYNC_DATABASE_URL:
             self.ASYNC_DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")


settings = Settings()
