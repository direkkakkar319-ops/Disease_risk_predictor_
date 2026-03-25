"""Configuration values loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application configuration with sane defaults for local development."""
    PROJECT_NAME: str = "Disease Risk Predictor"
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str = "postgresql://user:pass@db:5432/disease_risk_db"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
