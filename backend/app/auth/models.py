"""User database model used for authentication."""

import enum

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class PlanType(str, enum.Enum):
    basic      = "basic"
    premium    = "premium"
    enterprise = "enterprise"


class User(Base):
    """Application user table."""
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    plan            = Column(String, default="basic", nullable=False, server_default="basic")
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at      = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
