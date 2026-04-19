"""Pydantic models for auth requests and responses."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UserRegister(BaseModel):
    """Payload to create a new user account."""
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """Payload to log in with username and password."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Tokens returned after login or refresh."""
    access_token: str
    refresh_token: str
    token_type: str


class UserRead(BaseModel):
    """Public user data returned in API responses."""
    id: int
    username: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
