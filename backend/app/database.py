"""Database engine and session helpers."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
# Also create an async engine for the tasks/async routes if needed
# We use DATABASE_URL+asyncpg if it's not already there, or a separate env var.
# For simplicity, I'll derive the async URL from the sync one.
async_db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(async_db_url, echo=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

def get_db():
    """Provide a database session and clean it up after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
