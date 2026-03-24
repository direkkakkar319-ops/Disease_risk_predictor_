from pydantic import ValidationError
from pydantic_settings import BaseSettings


class AuthSettings(BaseSettings):
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int

    class Config:
        env_file = ".env"


try:
    auth_settings = AuthSettings()
except ValidationError as exc:
    raise RuntimeError("Missing required auth environment variables") from exc
