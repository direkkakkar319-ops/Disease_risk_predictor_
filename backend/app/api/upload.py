"""
Upload endpoint (upload.py)
============================
POST /api/upload — accepts one or more files + a report_type string.

Storage strategy (controlled by USE_S3 env var):
  USE_S3=true  → uploads go to Supabase S3 bucket "medscan-uploads"
                  stored as "uploads/{user_id}_{random8hex}.{ext}"
  USE_S3=false → uploads go to /app/data/raw_uploads (Docker shared volume)
                  used in local dev / Docker Compose

After saving the file, a Report row is immediately written to the DB with
status="uploaded", and then process_medical_report.delay(...) queues the
Celery task asynchronously. The response returns immediately (don't wait for OCR).

Why queue immediately and not wait?
  OCR + ML on HF Space can take 30-120 seconds. FastAPI would time out or
  block a request slot for the entire duration. Celery lets the API return
  a report ID instantly and the frontend polls separately.
"""

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


router = APIRouter()

VALID_REPORT_TYPES = {"blood", "lipid", "vitamin_d", "hormone", "kidney", "liver"}

# Local fallback path — used when USE_S3=false (local Docker Compose dev)
UPLOAD_DIR = Path("/app/data/raw_uploads")

_USE_S3 = os.getenv("USE_S3", "false").lower() == "true"


def _get_s3_client():
    # Lazy import: boto3 is only needed in production (USE_S3=true).
    # Avoids import error on local dev machines where boto3 may not be installed.
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
    """
    Accept one or more files, store them, create a Report DB row for each,
    and queue a Celery task. Returns immediately with report IDs.
    The frontend polls /api/status/{id} to track progress.
    """
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
            # Prefix with user_id to namespace files; random hex prevents collisions.
            unique_filename = f"{current_user.id}_{os.urandom(8).hex()}{file_extension}"

            if _USE_S3:
                s3_key = f"uploads/{unique_filename}"
                _get_s3_client().upload_fileobj(
                    file.file,
                    os.getenv("S3_BUCKET_NAME"),
                    s3_key,
                )
                stored_path = s3_key   # worker will download from S3 using this key
            else:
                local_path = UPLOAD_DIR / unique_filename
                with local_path.open("wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                stored_path = str(local_path)  # worker reads directly from shared volume

            # Persist the Report row BEFORE queuing the task so the worker can
            # look up report_id in the DB even if the task starts immediately.
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

            # .delay() = async Celery call; enqueues to Redis, returns immediately.
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

