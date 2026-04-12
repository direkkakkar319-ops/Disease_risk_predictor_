"""App entrypoint that creates the FastAPI application."""

import logging
from alembic.config import Config
from alembic import command
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, status, reports
from app.config import settings, BASE_DIR
from app.database import engine
from app import models
from app.auth.router import router as auth_router

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
app.include_router(auth_router)

@app.get("/")
async def root():
    """Basic health-style response for the root route."""
    return {"message": "Welcome to Disease Risk Predictor API"}
