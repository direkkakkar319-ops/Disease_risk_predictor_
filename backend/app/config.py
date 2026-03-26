import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """Application configuration with sane defaults for local development."""
    PROJECT_NAME: str = "Disease Risk Predictor"
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str = "postgresql://user:pass@db:5432/disease_risk_db"
    
    # Explicitly look for .env in the backend folder
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        extra="ignore"
    )
    

settings = Settings()
