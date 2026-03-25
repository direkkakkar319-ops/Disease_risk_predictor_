"""Upload API routes."""

from fastapi import APIRouter

router = APIRouter()

@router.post("/upload")
async def upload_file():
    """Placeholder upload endpoint."""
    return {"message": "Upload endpoint placeholder"}
