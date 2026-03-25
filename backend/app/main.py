"""App entrypoint that creates the FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, status
from app.config import settings
from app.database import engine
from app import models
from app.auth.router import router as auth_router

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
    """Create database tables at startup."""
    models.Base.metadata.create_all(bind=engine)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(status.router, prefix="/api", tags=["status"])
app.include_router(auth_router)

@app.get("/")
async def root():
    """Basic health-style response for the root route."""
    return {"message": "Welcome to Disease Risk Predictor API"}
