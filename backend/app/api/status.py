"""Status API — real task/report status from DB."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Report, Task
from app.auth.dependencies import get_current_active_user
from app.auth.models import User

router = APIRouter()


@router.get("/status/{report_id}")
async def get_report_status(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Poll the processing status of an uploaded report.

    Status progression:
        uploaded → preprocessing → ocr_complete → completed | failed

    When status == 'completed' the response includes the full prediction
    result and extracted metrics so the frontend can render results without
    a second request.
    """
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.user_id == current_user.id,
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Find the prediction task row written by the Celery worker
    task = (
        db.query(Task)
        .filter(Task.task_id.like(f"predict-{report_id}-%"))
        .first()
    )

    return {
        "report_id":         report_id,
        "status":            report.status,
        "report_type":       report.report_type,
        "filename":          report.filename,
        "ocr_confidence":    report.ocr_confidence,
        "extracted_metrics": report.extracted_metrics if report.status == "completed" else None,
        "created_at":        report.created_at.isoformat() if report.created_at else None,
        "processed_at":      report.processed_at.isoformat() if report.processed_at else None,
        "result":            task.result if task else None,
    }
