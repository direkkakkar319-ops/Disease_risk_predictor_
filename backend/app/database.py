"""
Database engine and session helpers (database.py)
===================================================
Two engines / session factories are configured:

  engine / SessionLocal     — synchronous, psycopg2 driver
  async_engine / AsyncSessionLocal — async, asyncpg driver

WHY two engines?
  Celery workers are plain synchronous Python processes. asyncpg requires an
  active asyncio event loop; Celery doesn't run one. Using asyncpg inside a
  Celery task causes "Future attached to a different loop" errors.
  Solution: workers always use SessionLocal (sync). The async engine is wired
  up for potential future FastAPI async route handlers but is not actively used
  in any request handler right now — all API routes use get_db() (sync).

get_db() is a FastAPI dependency (used with Depends(get_db)) that yields a
session and guarantees cleanup even if the route handler raises an exception.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Sync engine — used by all API routes and Celery workers
engine = create_engine(settings.DATABASE_URL)

# Derive the asyncpg URL from the sync URL if not explicitly set
if settings.ASYNC_DATABASE_URL:
    async_db_url = settings.ASYNC_DATABASE_URL
else:
    async_db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Async engine — configured but currently unused in request handlers
async_engine = create_async_engine(async_db_url, echo=True)

# autocommit=False: transactions must be explicitly committed (db.commit())
# autoflush=False:  changes are not sent to DB until commit or explicit flush
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# expire_on_commit=False: loaded objects remain accessible after commit
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()  # all ORM models inherit from this

def get_db():
    """FastAPI dependency — yields a sync DB session, closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
