"""Reports API — list and retrieve user reports with prediction results."""

import os
import mimetypes
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Report, Task
from app.auth.dependencies import get_current_active_user
from app.auth.models import User

router = APIRouter()


@router.get("/reports")
async def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Return all reports belonging to the current user, newest first.
    Each item includes a summary: id, filename, type, status, risk_level.
    """
    reports = (
        db.query(Report)
        .filter(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )

    result = []
    for r in reports:
        task = (
            db.query(Task)
            .filter(Task.task_id.like(f"predict-{r.id}-%"))
            .first()
        )
        risk_level = None
        risks = {}
        if task and task.result:
            risk_level = task.result.get("risk_level")
            risks      = task.result.get("risks", {})

        result.append({
            "id":             r.id,
            "filename":       r.filename,
            "report_type":    r.report_type,
            "status":         r.status,
            "risk_level":     risk_level,
            "risks":          risks,
            "ocr_confidence": r.ocr_confidence,
            "created_at":     r.created_at.isoformat() if r.created_at else None,
            "processed_at":   r.processed_at.isoformat() if r.processed_at else None,
        })

    return result


@router.get("/reports/{report_id}")
async def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Return the full detail of a single report: OCR metrics + prediction result.
    """
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.user_id == current_user.id,
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    task = (
        db.query(Task)
        .filter(Task.task_id.like(f"predict-{report_id}-%"))
        .first()
    )

    return {
        "id":                report.id,
        "filename":          report.filename,
        "report_type":       report.report_type,
        "status":            report.status,
        "ocr_confidence":    report.ocr_confidence,
        "extracted_metrics": report.extracted_metrics,
        "created_at":        report.created_at.isoformat() if report.created_at else None,
        "processed_at":      report.processed_at.isoformat() if report.processed_at else None,
        "prediction":        task.result if task else None,
    }


@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Download the original uploaded file for a report.
    """
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.user_id == current_user.id,
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    file_path = report.file_path

    _USE_S3 = os.getenv("USE_S3", "false").lower() == "true"

    if _USE_S3:
        import boto3
        from botocore.config import Config
        s3_client = boto3.client(
            "s3",
            endpoint_url=os.getenv("S3_ENDPOINT_URL"),
            aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
            config=Config(signature_version="s3v4"),
            region_name=os.getenv("S3_REGION", "us-east-1"),
        )
        try:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': os.getenv("S3_BUCKET_NAME"),
                    'Key': file_path,
                    'ResponseContentDisposition': f'attachment; filename="{report.filename}"'
                },
                ExpiresIn=3600
            )
            return RedirectResponse(url=url)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"S3 download error: {str(e)}")
    else:
        pass
