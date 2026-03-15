from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
import shutil
import os
import uuid

from app.db.database import get_db
from app.db.models import Task
from queue.tasks import process_medical_report

router = APIRouter()

UPLOAD_DIR = "data/raw_uploads"

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
    ):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # saving file
    file_location = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)   

    task_id = str(uuid.uuid4())
    new_task = Task(
        task_id=task_id,
        status = "PENDING",
        result=None
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    process_medical_report.delay(file_location, task_id)

    return {
        "task_id": task_id,
        "status": "PENDING",
        "message": "File uploaded successfully. Processing started."
    }