"""Reports API — list and retrieve user reports with prediction results."""

import os
from fastapi import APIRouter, Depends, HTTPException
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
