"""
Compare API (compare.py)
==========================
Allows users to diff two health reports of the same type over time.

Endpoints:
  POST /api/compare              — validate + create comparison row + queue task
  GET  /api/compare              — list user's past comparisons
  GET  /api/compare/{id}         — poll for status/result of a specific comparison

Flow:
  1. Client sends { report1_id, report2_id }
  2. API validates: both reports exist, belong to the user, same type, both completed
  3. A ReportComparison row is created with status="pending"
  4. compare_reports Celery task is queued with the comparison_id
  5. Client polls GET /api/compare/{id} until status="completed"
  6. Worker calls ReportComparator.compare_medical_reports() which diffs the
     extracted_metrics between the two reports (done locally, NOT on HF Space)

Why local comparison instead of HF Space?
  Comparison is a simple metric diff — no OCR or ML inference needed.
  It runs fast enough on the API server without burning HF compute.

Error safety: if the Celery task fails to queue, the row is immediately
  marked "failed" so the frontend stops polling and shows an error.
"""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Report, ReportComparison
from app.auth.dependencies import get_current_active_user
from app.auth.models import User
from task_queue.celery_app import celery_app

router = APIRouter()
logger = logging.getLogger(__name__)


class CompareRequest(BaseModel):
    report1_id: int
    report2_id: int


@router.post("/compare")
async def trigger_comparison(
    body: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Validate two reports, create a ReportComparison row, kick off the Celery task.
    Returns the comparison_id to poll.
    """
    r1 = db.query(Report).filter(
        Report.id == body.report1_id,
        Report.user_id == current_user.id,
    ).first()
    r2 = db.query(Report).filter(
        Report.id == body.report2_id,
        Report.user_id == current_user.id,
    ).first()

    if not r1 or not r2:
        raise HTTPException(status_code=404, detail="One or both reports not found")
    if r1.report_type != r2.report_type:
        raise HTTPException(
            status_code=400,
            detail=f"Reports must be the same type to compare (got {r1.report_type} vs {r2.report_type})",
        )
    if r1.status != "completed" or r2.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Both reports must be fully processed before comparing",
        )

    comparison_id = str(uuid.uuid4())
    try:
        comp = ReportComparison(
            id=comparison_id,
            user_id=current_user.id,
            report1_id=body.report1_id,
            report2_id=body.report2_id,
            report_type=r1.report_type,
            status="pending",
        )
        db.add(comp)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"[trigger_comparison] DB error creating comparison row: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    try:
        celery_app.send_task(
            'task_queue.tasks.compare_reports',
            args=[comparison_id, body.report1_id, body.report2_id],
        )
    except Exception as exc:
        logger.error(f"[trigger_comparison] Failed to queue task: {exc}", exc_info=True)
        # Mark the row failed so the frontend doesn't poll forever
        try:
            comp = db.query(ReportComparison).filter(ReportComparison.id == comparison_id).first()
            if comp:
                comp.status = "failed"
                db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to queue comparison task: {exc}")

    return {"comparison_id": comparison_id}


@router.get("/compare")
async def list_comparisons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return the current user's past comparisons, newest first."""
    comps = (
        db.query(ReportComparison)
        .filter(ReportComparison.user_id == current_user.id)
        .order_by(ReportComparison.created_at.desc())
        .all()
    )
    return [
        {
            "comparison_id":  c.id,
            "report1_id":     c.report1_id,
            "report2_id":     c.report2_id,
            "report_type":    c.report_type,
            "status":         c.status,
            "trend_analysis": c.trend_analysis,
            "created_at":     c.created_at.isoformat() if c.created_at else None,
        }
        for c in comps
    ]


@router.get("/compare/{comparison_id}")
async def get_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return the status and result of a comparison."""
    comp = db.query(ReportComparison).filter(
        ReportComparison.id == comparison_id,
        ReportComparison.user_id == current_user.id,
    ).first()

    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")

    return {
        "comparison_id":      comp.id,
        "status":             comp.status,
        "report_type":        comp.report_type,
        "report1_id":         comp.report1_id,
        "report2_id":         comp.report2_id,
        "trend_analysis":     comp.trend_analysis,
        "comparison_data":    comp.comparison_data,
        "significant_changes": comp.significant_changes,
        "created_at":         comp.created_at.isoformat() if comp.created_at else None,
    }
