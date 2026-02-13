from fastapi import FastAPI
from app.api import upload, status
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(status.router, prefix="/api", tags=["status"])

@app.get("/")
async def root():
    return {"message": "Welcome to Disease Risk Predictor API"}
