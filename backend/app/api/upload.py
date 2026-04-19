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

# Local fallback path — used when USE_S3=false (local Docker Compose dev)
UPLOAD_DIR = Path("/app/data/raw_uploads")

_USE_S3 = os.getenv("USE_S3", "false").lower() == "true"


def _get_s3_client():
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
        config=Config(signature_version="s3v4"),
        region_name=os.getenv("S3_REGION", "us-east-1"),
    )


@router.post("/upload", response_model=List[dict])
async def upload_reports(
    files: List[UploadFile] = File(...),
    report_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid report type '{report_type}'. Must be one of: {', '.join(sorted(VALID_REPORT_TYPES))}"
        )

    if not _USE_S3:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    uploaded_files_metadata = []

    for file in files:
        try:
            file_extension = Path(file.filename).suffix
            unique_filename = f"{current_user.id}_{os.urandom(8).hex()}{file_extension}"

            if _USE_S3:
                s3_key = f"uploads/{unique_filename}"
                _get_s3_client().upload_fileobj(
                    file.file,
                    os.getenv("S3_BUCKET_NAME"),
                    s3_key,
                )
                stored_path = s3_key
            else:
                local_path = UPLOAD_DIR / unique_filename
                with local_path.open("wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                stored_path = str(local_path)

            new_report = Report(
                filename=file.filename,
                content_type=file.content_type,
                file_path=stored_path,
                user_id=current_user.id,
                report_type=report_type,
                status="uploaded"
            )
            db.add(new_report)
            db.commit()
            db.refresh(new_report)

            process_medical_report.delay(
                new_report.id,
                stored_path,
                report_type,
            )

            uploaded_files_metadata.append({
                "id": new_report.id,
                "filename": new_report.filename,
                "report_type": report_type,
                "status": "success"
            })

        except Exception as e:
            print(f"Error uploading {file.filename}: {e}")
            uploaded_files_metadata.append({
                "filename": file.filename,
                "status": "failed",
                "error": str(e)
            })

    return uploaded_files_metadata

