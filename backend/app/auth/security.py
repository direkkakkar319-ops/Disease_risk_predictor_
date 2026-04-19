"""Security helpers for hashing passwords and creating JWTs."""

from datetime import datetime, timedelta, timezone
import os
from jose import jwt
from passlib.context import CryptContext
from passlib.handlers.bcrypt import bcrypt as bcrypt_handler
from app.auth.config import auth_settings

ALGORITHM = "HS256"


def _init_bcrypt_backend() -> None:
    """Choose an available bcrypt backend for passlib."""
    try:
        bcrypt_handler.set_backend("bcrypt")
    except Exception:
        os.environ.setdefault("PASSLIB_BUILTIN_BCRYPT", "1")
        bcrypt_handler.set_backend("builtin")


_init_bcrypt_backend()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain password against a stored hash."""
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    """Hash a plain password for storage."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a short-lived access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, auth_settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a long-lived refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, auth_settings.SECRET_KEY, algorithm=ALGORITHM)
