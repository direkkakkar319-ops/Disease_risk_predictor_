from fastapi import APIRouter

router = APIRouter()
UPLOAD_DIR = "data/raw_uploads"

@router.post("/upload")
async def upload_file():
    return {"message": "Upload endpoint placeholder"}