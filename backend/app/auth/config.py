from pathlib import Path
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend folder (one level above 'app')
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class AuthSettings(BaseSettings):
    """Required authentication configuration."""
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    
    # Explicitly look for .env in the backend folder
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        extra="ignore"
    )

try:
    auth_settings = AuthSettings()
except ValidationError as exc:
    # Print more informative error
    print(f"Auth configuration error: {exc}")
    raise RuntimeError("Missing required auth environment variables") from exc
