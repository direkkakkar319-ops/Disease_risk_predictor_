"""
FastAPI application entrypoint (main.py)
=========================================
Responsibilities:
  1. Create the FastAPI app and attach global middleware (CORS, rate limiting)
  2. Register all API routers under /api and /auth prefixes
  3. Run Alembic migrations on startup so the DB schema is always up-to-date

Key design decisions:
  • CORS uses allow_origin_regex rather than a list so localhost dev works on
    any port (5173, 3000, etc.) without re-configuring.
  • slowapi (SlowAPI) rate-limiter uses the client's IP as the key. Per-route
    limits are set with @limiter.limit("N/minute") decorators in each router.
  • Alembic migrations run automatically on startup (on_startup hook) so
    Render deployments never require manual migration steps. Falls back to
    SQLAlchemy create_all if Alembic fails (e.g. first-ever cold start with
    no alembic_version table).
"""

import logging
from alembic.config import Config
from alembic import command
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api import upload, status, reports, compare
from app.config import settings, BASE_DIR
from app.database import engine
from app import models
from app.auth.router import router as auth_router

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title=settings.PROJECT_NAME)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: regex allows localhost on any port (dev) + production Render domain.
# allow_credentials=True is needed so the frontend can send the Authorization header.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://medscan-ai-s7t1\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    """Run Alembic migrations then ensure all tables exist."""
    try:
        alembic_cfg = Config(str(BASE_DIR / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(BASE_DIR / "alembic"))
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic migrations applied successfully")
    except Exception as e:
        logger.warning(f"Alembic migration failed ({e}), falling back to create_all")
        models.Base.metadata.create_all(bind=engine)

app.include_router(upload.router,  prefix="/api", tags=["upload"])
app.include_router(status.router,  prefix="/api", tags=["status"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(compare.router, prefix="/api", tags=["compare"])
app.include_router(auth_router)

@app.get("/")
async def root():
    """Basic health-style response for the root route."""
    return {"message": "Welcome to Disease Risk Predictor API"}
