from fastapi import APIRouter, UploadFile, File
import shutil
import os

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_location = f"data/raw_uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)    
    return {"info": f"file '{file.filename}' saved at '{file_location}'"}
