"""Auth-specific settings loaded from environment variables."""

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthSettings(BaseSettings):
    """Required authentication configuration."""
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


try:
    auth_settings = AuthSettings()
except ValidationError as exc:
    raise RuntimeError("Missing required auth environment variables") from exc
