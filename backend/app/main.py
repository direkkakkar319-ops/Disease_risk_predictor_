from fastapi import FastAPI
from app.api import upload, status
from app.config import settings
from app.database import engine
from app import models
from app.auth import router as auth_router

app = FastAPI(title=settings.PROJECT_NAME)

@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=engine)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(status.router, prefix="/api", tags=["status"])
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "Welcome to Disease Risk Predictor API"}
