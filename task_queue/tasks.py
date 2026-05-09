"""
This file defines the three background tasks that Celery runs.
The three tasks run in order:
    1. process_medical_report  → reads the image and extracts lab values (OCR)
    2. predict_disease_risk    → runs the ML model on those lab values
    3. compare_reports         → compares two reports side by side
"""

"""
Important imports
"""
import logging
import os
import traceback
from datetime import datetime
from celery.exceptions import MaxRetriesExceededError
from task_queue.celery_app import celery_app

"""
Database — use the SYNCHRONOUS session in Celery workers.
asyncpg connections are tied to an event loop; Celery workers are plain
synchronous processes. Mixing them causes:
  'Future attached to a different loop' / 'another operation is in progress'
The sync engine (psycopg2) has no such restriction and works perfectly here.
"""
from app.database import SessionLocal

from app.models import Report as MedicalReport, Task as Prediction
try:
    from app.models import ReportComparison
except ImportError:
    ReportComparison = None

from services.ml_service import ReportComparator

logger = logging.getLogger(__name__)

_USE_S3 = os.getenv("USE_S3", "false").lower() == "true"


def _get_s3():
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


# ─────────────────────────────────────────────
#  Helper — thin sync DB context manager
# ─────────────────────────────────────────────
def _get_db():
    """Yield a synchronous SQLAlchemy session and close it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────
#  Task 1 — OCR Preprocessing
# ─────────────────────────────────────────────
@celery_app.task(
    bind=True,
    max_retries=3,
    name="task_queue.tasks.process_medical_report"
)
def process_medical_report(self, report_id: int, file_path: str, report_type: str):
    """
    Reads a medical report using PaddleOCR and extracts the lab values.

    Steps:
        1. Mark the report as 'preprocessing' in the database.
        2. Run OCR on the image.
        3. Extract text and lab values.
        4. Save results to the database.
        5. Kick off Task 2 (predict_disease_risk) automatically.

    Args:
        report_id  — integer ID of the Report row
        file_path  — absolute path to the uploaded image inside the container
        report_type — one of: blood, lipid, vitamin_d, hormone, kidney, liver
    """
    logger.info(f"[process_medical_report] Starting for report {report_id}, file={file_path}")
    local_tmp = None
    try:
        _update_report_status(report_id, "preprocessing")
        self.update_state(state="PROGRESS", meta={"step": "downloading_file"})

        if _USE_S3:
            local_tmp = f"/tmp/{os.path.basename(file_path)}"
            _get_s3().download_file(os.getenv("S3_BUCKET_NAME"), file_path, local_tmp)
            image_path = local_tmp
        else:
            image_path = file_path

        # ── Step 1: OCR ───────────────────────────────────────────────────
        self.update_state(state="PROGRESS", meta={"step": "running_ocr"})
        logger.info(f"[process_medical_report] Running OCR on {image_path}")

        from ml_models.paddle_ocr.ocr_runner import get_ocr_runner
        ocr_runner = get_ocr_runner()
        ocr_result = ocr_runner.process_report(image_path, report_type)

        structured_metrics = ocr_result["structured_metrics"]
        raw_text = ocr_result["raw_text"]
        avg_confidence = ocr_result.get("average_confidence", 0.0)

        logger.info(f"[process_medical_report] OCR done: "
                    f"{len(structured_metrics)} metrics extracted, "
                    f"confidence={avg_confidence:.3f}")

        _save_ocr_results(
            report_id=report_id,
            raw_text=raw_text,
            metrics=structured_metrics,
            confidence=avg_confidence,
        )

        # ── Step 2: Disease risk prediction ──────────────────────────────
        self.update_state(state="PROGRESS", meta={"step": "running_prediction"})
        logger.info(f"[process_medical_report] Running risk prediction for report {report_id}")

        from ml_models.predict import RiskPredictor
        predictor = RiskPredictor()
        prediction = predictor.predict(metrics=structured_metrics, report_type=report_type)

        logger.info(f"[process_medical_report] Prediction done: "
                    f"risk_level={prediction.get('risk_level')}")

        self.update_state(state="PROGRESS", meta={"step": "saving_results"})
        _save_prediction(report_id, prediction)

        # ── Cleanup: delete temp file and S3 object only on success ─────────
        if local_tmp and os.path.exists(local_tmp):
            os.remove(local_tmp)
        if _USE_S3:
            try:
                _get_s3().delete_object(Bucket=os.getenv("S3_BUCKET_NAME"), Key=file_path)
                logger.info(f"[process_medical_report] deleted S3 object {file_path}")
            except Exception as e:
                logger.warning(f"[process_medical_report] failed to delete S3 object {file_path}: {e}")

        return {
            "status": "completed",
            "report_id": report_id,
            "metrics_extracted": len(structured_metrics),
            "risk_level": prediction.get("risk_level"),
        }

    except Exception as exc:
        tb = traceback.format_exc()
        logger.error(f"[process_medical_report] failed for report {report_id}: {exc}\n{tb}")
        _save_task_error(report_id, exc, tb)
        # Clean up local tmp on failure but keep the S3 object so retries can re-download it
        if local_tmp and os.path.exists(local_tmp):
            os.remove(local_tmp)
        raise self.retry(exc=exc)


# ─────────────────────────────────────────────
#  Task 2 — Disease Risk Prediction
# ─────────────────────────────────────────────
@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="task_queue.tasks.predict_disease_risk"
)
def predict_disease_risk(self, report_id: int, metrics: dict, report_type: str):
    """
    Runs the XGBoost ML model on the extracted lab values and saves
    the disease risk predictions to the database.
    """
    logger.info(f"[predict_disease_risk] Starting for report {report_id}")
    try:
        self.update_state(state="PROGRESS", meta={"step": "loading_models"})
        predictor = RiskPredictor()

        self.update_state(state="PROGRESS", meta={"step": "predicting"})
        prediction_result = predictor.predict(
            metrics=metrics,
            report_type=report_type,
        )

        coverage = prediction_result.get("ocr_coverage", {})
        logger.info(
            f"[predict_disease_risk] report {report_id} — "
            f"risk_level={prediction_result.get('risk_level')}  "
            f"coverage={coverage.get('coverage_pct')}%  "
            f"risks={prediction_result.get('risks')}"
        )

        self.update_state(state="PROGRESS", meta={"step": "saving_results"})
        _save_prediction(report_id, prediction_result)

        return {
            "status":     "completed",
            "report_id":  report_id,
            "risk_level": prediction_result.get("risk_level"),
            "coverage_pct": coverage.get("coverage_pct"),
        }

    except Exception as exc:
        logger.error(f"[predict_disease_risk] failed for report {report_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# ─────────────────────────────────────────────
#  Task 3 — Report Comparison
# ─────────────────────────────────────────────
@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="task_queue.tasks.compare_reports"
)
def compare_reports(self, comparison_id: str, report_1_id: int, report_2_id: int):
    """
    Compare two health reports and save the results in the database.
    """
    logger.info(f"[compare_reports] Starting for comparison {comparison_id}")
    try:
        self.update_state(state="PROGRESS", meta={"step": "fetching_reports"})
        report_1 = _get_report_data(report_1_id)
        report_2 = _get_report_data(report_2_id)

        self.update_state(state="PROGRESS", meta={"step": "comparing"})
        comparator = ReportComparator()
        comparison = comparator.compare_medical_reports(report_1, report_2)

        self.update_state(state="PROGRESS", meta={"step": "saving_comparison"})
        _save_comparison(comparison_id, comparison)

        return {
            "status": "completed",
            "comparison_id": comparison_id,
            "trend": comparison["summary"]["overall_trend"],
        }

    except Exception as exc:
        logger.error(f"[compare_reports] failed for comparison {comparison_id}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            _mark_comparison_failed(comparison_id)
            raise


# ─────────────────────────────────────────────
#  Private synchronous DB helpers
# ─────────────────────────────────────────────

def _save_task_error(report_id: int, exc: Exception, tb: str):
    """Mark the report as failed and store the error so the status API can return it."""
    db = SessionLocal()
    try:
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if report:
            report.status = "failed"
            report.extracted_metrics = {
                "error": str(exc),
                "traceback": tb[-3000:],
            }
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[_save_task_error] could not save error for report {report_id}: {e}")
    finally:
        db.close()


def _update_report_status(report_id: int, status: str):
    """Update the status column of a report row."""
    db = SessionLocal()
    try:
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if report:
            report.status = status
            if status == "completed":
                report.processed_at = datetime.utcnow()
            db.commit()
            logger.info(f"[_update_report_status] report {report_id} → {status}")
        else:
            logger.warning(f"[_update_report_status] report {report_id} not found")
    except Exception as e:
        db.rollback()
        logger.error(f"[_update_report_status] error: {e}", exc_info=True)
        raise
    finally:
        db.close()


def _save_ocr_results(report_id: int, raw_text: str, metrics: dict, confidence: float):
    """
    Save everything OCR extracted from the image.
    Marks the report as 'ocr_complete' and records the finish time.
    """
    db = SessionLocal()
    try:
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if report:
            report.raw_text = raw_text
            report.extracted_metrics = metrics
            report.ocr_confidence = confidence
            report.status = "ocr_complete"
            report.processed_at = datetime.utcnow()
            db.commit()
            logger.info(f"[_save_ocr_results] report {report_id} saved, "
                        f"{len(metrics)} metrics, confidence={confidence:.3f}")
        else:
            logger.warning(f"[_save_ocr_results] report {report_id} not found")
    except Exception as e:
        db.rollback()
        logger.error(f"[_save_ocr_results] error: {e}", exc_info=True)
        raise
    finally:
        db.close()


def _save_prediction(report_id: int, prediction_result: dict):
    """
    Save the ML model output as a Task row, linked by report_id.
    Also marks the Report status as 'completed'.
    """
    db = SessionLocal()
    try:
        import uuid
        task_row = Prediction(
            task_id=f"predict-{report_id}-{uuid.uuid4().hex[:8]}",
            status="completed",
            result={
                "report_id":      report_id,
                "risks":          prediction_result.get("risks", {}),
                "risk_level":     prediction_result.get("risk_level"),
                "key_factors":    prediction_result.get("key_factors", []),
                "recommendations": prediction_result.get("recommendations", []),
                "model_version":  prediction_result.get("model_version"),
                "raw_xgb_probas": prediction_result.get("raw_xgb_probas", {}),
                "ocr_coverage":   prediction_result.get("ocr_coverage", {}),
            },
        )
        db.add(task_row)

        # Mark the parent report as fully done
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if report:
            report.status = "completed"
            report.processed_at = datetime.utcnow()

        db.commit()
        logger.info(f"[_save_prediction] saved prediction for report {report_id}, "
                    f"risk_level={prediction_result.get('risk_level')}")
    except Exception as e:
        db.rollback()
        logger.error(f"[_save_prediction] error: {e}", exc_info=True)
        raise
    finally:
        db.close()


def _get_report_data(report_id: int) -> dict:
    """
    Read a report from the database and return it as a plain dictionary.
    Returns an empty dict if the report_id does not exist.
    """
    db = SessionLocal()
    try:
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if report:
            prediction = (
                db.query(Prediction)
                .filter(Prediction.task_id.like(f"predict-{report_id}-%"))
                .order_by(Prediction.created_at.desc())
                .first()
            )
            prediction_risks = (
                prediction.result.get("risks", {})
                if prediction and prediction.result else {}
            )
            return {
                "structured_metrics": report.extracted_metrics or {},
                "raw_text":           report.raw_text or "",
                "report_type":        report.report_type,
                "created_at":         report.created_at.isoformat(),
                "prediction_risks":   prediction_risks,
            }
        return {}
    finally:
        db.close()


def _mark_comparison_failed(comparison_id: str):
    """Set a comparison row's status to 'failed' so the frontend stops polling."""
    if ReportComparison is None:
        return
    db = SessionLocal()
    try:
        comp = db.query(ReportComparison).filter(ReportComparison.id == comparison_id).first()
        if comp:
            comp.status = "failed"
            db.commit()
            logger.info(f"[_mark_comparison_failed] comparison {comparison_id} → failed")
    except Exception as e:
        db.rollback()
        logger.error(f"[_mark_comparison_failed] error: {e}", exc_info=True)
    finally:
        db.close()


def _save_comparison(comparison_id: str, comparison_data: dict):
    """
    Save a finished comparison of two reports.
    """
    if ReportComparison is None:
        logger.warning("[_save_comparison] ReportComparison model not available, skipping save")
        return

    db = SessionLocal()
    try:
        comp = db.query(ReportComparison).filter(ReportComparison.id == comparison_id).first()
        if comp:
            comp.status = "completed"
            comp.comparison_data = comparison_data
            comp.significant_changes = comparison_data.get("significant_changes", [])
            comp.trend_analysis = comparison_data["summary"]["overall_trend"]
            db.commit()
            logger.info(f"[_save_comparison] saved comparison {comparison_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"[_save_comparison] error: {e}", exc_info=True)
        raise
    finally:
        db.close()
