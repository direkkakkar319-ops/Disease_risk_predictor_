import os
import shutil
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Report
from app.auth.dependencies import get_current_active_user
from app.auth.models import User
from task_queue.tasks import process_medical_report

from app.config import settings, BASE_DIR

router = APIRouter()

VALID_REPORT_TYPES = {"blood", "lipid", "vitamin_d", "hormone", "kidney", "liver"}

# Shared volume path — must match the Docker volume mount in docker-compose.yml
# Both the API and Worker containers mount upload_data at this exact path.
UPLOAD_DIR = Path("/app/data/raw_uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload", response_model=List[dict])
async def upload_reports(
    files: List[UploadFile] = File(...),
    report_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload medical reports and save metadata to the database.
    """
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid report type '{report_type}'. Must be one of: {', '.join(sorted(VALID_REPORT_TYPES))}"
        )

    uploaded_files_metadata = []

    for file in files:
        try:
            # Create a unique filename to avoid collisions
            file_extension = Path(file.filename).suffix
            unique_filename = f"{current_user.id}_{os.urandom(8).hex()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename

            # Save file to disk
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Save metadata to database
            new_report = Report(
                filename=file.filename,
                content_type=file.content_type,
                file_path=str(file_path),
                user_id=current_user.id,
                report_type=report_type,
                status="uploaded"
            )
            db.add(new_report)
            db.commit()
            db.refresh(new_report)

            # Trigger the background processing task
            # Pass report_id as int to match Report.id (Integer column)
            process_medical_report.delay(
                new_report.id,
                str(file_path),
                report_type
            )

            uploaded_files_metadata.append({
                "id": new_report.id,
                "filename": new_report.filename,
                "report_type": report_type,
                "status": "success"
            })

        except Exception as e:
            # Log the error (in a real app, use a proper logger)
            print(f"Error uploading {file.filename}: {e}")
            uploaded_files_metadata.append({
                "filename": file.filename,
                "status": "failed",
                "error": str(e)
            })

    return uploaded_files_metadata

