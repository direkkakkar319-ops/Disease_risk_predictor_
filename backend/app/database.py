"""Database engine and session helpers."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
# Use ASYNC_DATABASE_URL if provided, otherwise derive it from DATABASE_URL
if settings.ASYNC_DATABASE_URL:
    async_db_url = settings.ASYNC_DATABASE_URL
else:
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
