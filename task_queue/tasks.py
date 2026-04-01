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
import asyncio
import logging
from datetime import datetime
from task_queue.celery_app import celery_app
from app.database import AsyncSessionLocal

"""
Database Connection
"""
from app.models import Report as MedicalReport, Task as Prediction
# Note: Report Comparison model seems to be missing, using Task for now or a dummy
try:
    from app.models import ReportComparison
except ImportError:
    ReportComparison = Prediction  # Placeholder

"""
OCR and ML imports
"""
from ml_models.paddle_ocr.ocr_runner import get_ocr_runner
from ml_models.predict import RiskPredictor

"""
Comparison Service
"""
from services.ml_service import ReportComparator
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _run_async(coro):
    """
    Safely run an async coroutine from a synchronous Celery task.
    Celery workers may already have an event loop running in some configurations,
    so we always create a fresh loop to avoid 'attached to a different loop' errors.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


"""TASKS ARE AS FOLLOWS"""

"""
Task 1 - OCR Preprocessing
"""
@celery_app.task(
    bind=True,
    max_retries=3,
    name="task_queue.tasks.process_medical_report"
)
def process_medical_report(self, report_id: int, file_path: str, report_type: str):
    """
    Reads a medical report using PaddleOCR and extracts the lab values.
    Steps:
        1. Mark the report as preprocessing in database.
        2. Run OCR on the image.
        3. Extract text and lab values.
        4. Save the data to database.
        5. Kickoff prediction task 2 automatically

    Args:
        report_id  - integer ID of the Report row
        file_path  - absolute path to the uploaded image file
        report_type - one of: blood, lipid, vitamin_d, hormone, kidney, liver
    """
    try:
        _run_async(_update_report_status(report_id, "preprocessing"))
        self.update_state(state="PROGRESS", meta={"step": "initialising_ocr"})

        ocr_runner = get_ocr_runner()  # gatekeeping function / singleton
        self.update_state(state="PROGRESS", meta={"step": "ocr_extraction"})
        result = ocr_runner.process_report(file_path, report_type)

        self.update_state(state="PROGRESS", meta={"step": "saving_ocr_results"})
        _run_async(_save_ocr_results(
            report_id=report_id,
            raw_text=result["raw_text"],
            metrics=result["structured_metrics"],
            tables=result.get("tables", []),
            confidence=result.get("average_confidence", 0.0)
        ))

        predict_disease_risk.delay(
            report_id,
            result["structured_metrics"],
            report_type
        )

        return {
            "status": "completed",
            "report_id": report_id,
            "metrics_extracted": len(result["structured_metrics"])
        }

    except Exception as exc:
        logger.error(f"[process_medical_report] failed for report {report_id}: {exc}", exc_info=True)
        _run_async(_update_report_status(report_id, "failed"))
        raise self.retry(exc=exc)


"""
Task 2 - Disease Risk Prediction
"""
@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="task_queue.tasks.predict_disease_risk"
)
def predict_disease_risk(self, report_id: int, metrics: dict, report_type: str):
    """
    Runs the XGBoost ML model on the extracted lab values and saves
    the disease risk predictions to the database

    Args:
        report_id
        metrics
        report_type
    """
    try:
        self.update_state(state="PROGRESS", meta={"step": "loading_model"})
        predictor = RiskPredictor()

        self.update_state(state="PROGRESS", meta={"step": "predicting"})
        prediction_result = predictor.predict(metrics, report_type)

        self.update_state(state="PROGRESS", meta={"step": "saving_prediction"})
        _run_async(_save_predictions(report_id, prediction_result))

        return {
            "status": "completed",
            "report_id": report_id,
            "risk_level": prediction_result.get("risk_level")
        }

    except Exception as exc:
        logger.error(f"[predict_disease_risk] failed for report {report_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


"""
Task 3 - Report Comparison
"""
@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="task_queue.tasks.compare_reports"
)
def compare_reports(self, comparison_id: str, report_1_id: int, report_2_id: int):
    """
    Compare two health reports and save the results in the database

    Args:
        comparison_id
        report_1_id
        report_2_id
    """
    try:
        self.update_state(state="PROGRESS", meta={"step": "fetching_reports"})
        report_1 = _run_async(_get_report_data(report_1_id))
        report_2 = _run_async(_get_report_data(report_2_id))

        self.update_state(state="PROGRESS", meta={"step": "comparing"})
        comparator = ReportComparator()
        comparison = comparator.compare_medical_reports(report_1, report_2)

        self.update_state(state="PROGRESS", meta={"step": "saving_comparison"})
        _run_async(_save_comparison(comparison_id, comparison))

        return {
            "status": "completed",
            "comparison_id": comparison_id,
            "trend": comparison["summary"]["overall_trend"]
        }

    except Exception as exc:
        logger.error(f"[compare_reports] failed for comparison {comparison_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


"""
Private database helper `async` functions

Our database SQLAlchemy uses async/await for all the queries
but Celery tasks are regular `synchronous functions`.
_run_async() is the bridge — it creates a fresh event loop each call
so there are never 'attached to a different loop' conflicts.
Each helper opens a DB session, does one job, then closes the session.
"""

async def _update_report_status(report_id: int, status: str):
    """
    Update the status column of a report row in the database.
    Sets processed_at timestamp when status becomes `completed`.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MedicalReport).where(MedicalReport.id == report_id)
        )
        report = result.scalar_one_or_none()  # returns None if the report is not found

        if report:
            report.status = status
            if status == "completed":
                report.processed_at = datetime.utcnow()
            await session.commit()


async def _save_ocr_results(
    report_id: int,
    raw_text: str,
    metrics: dict,
    tables: list,
    confidence: float,
):
    """
    Saves everything OCR has extracted from the image of the health report.
    Called after OCR finishes task 1.
    Marks the report as 'completed' and records the finish time.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MedicalReport).where(MedicalReport.id == report_id)
        )
        report = result.scalar_one_or_none()

        if report:
            report.raw_text = raw_text
            report.extracted_metrics = metrics
            report.ocr_confidence = confidence
            report.status = "ocr_complete"
            report.processed_at = datetime.utcnow()
            await session.commit()


async def _save_predictions(report_id: int, prediction_result: dict):
    """
    Creates a new row in the predictions table with the ML model output.
    Called after Task-2 (Disease Risk Prediction).

    prediction_result is a dictionary returned by RiskPredictor.predict():
        risks
        risk_level
        shap_values
        model_version
        recommendations
        key_factors
    """
    async with AsyncSessionLocal() as session:
        # user_id for linking it to prediction results
        result = await session.execute(
            select(MedicalReport).where(MedicalReport.id == report_id)
        )
        report = result.scalar_one_or_none()

        if report:
            prediction = Prediction(
                user_id=report.user_id,
                report_id=report_id,
                disease_risk=prediction_result.get("risks", {}),
                risk_level=prediction_result.get("risk_level"),
                shap_values=prediction_result.get("shap_values"),
                model_version=prediction_result.get("model_version"),
                recommendations=prediction_result.get("recommendations", []),
                key_factors=prediction_result.get("key_factors", [])
            )
            session.add(prediction)
            await session.commit()


async def _get_report_data(report_id: int) -> dict:
    """
    Reads report from the database and returns its data as a plain dictionary.
    Called by Task 3 (compare reports).
    Returns an empty dictionary if report_id does not exist in the database.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MedicalReport).where(MedicalReport.id == report_id)
        )
        report = result.scalar_one_or_none()

        if report:
            return {
                "structured_metrics": report.extracted_metrics or {},
                "raw_text": report.raw_text or "",
                "report_type": report.report_type,
                "created_at": report.created_at.isoformat(),
            }

        return {}


async def _save_comparison(comparison_id: str, comparison_data: dict):
    """
    Saves the finished comparison of two reports.
    Writes to the report_comparison table.
    Called after task-3 (Comparison).

    comparison_data is a dict returned by ReportComparator.compare_medical_reports():
        significant_changes
        summary.overall_trend
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ReportComparison).where(ReportComparison.id == comparison_id)
        )
        comp = result.scalar_one_or_none()

        if comp:
            comp.comparison_data = comparison_data
            comp.significant_changes = comparison_data.get("significant_changes", [])
            comp.trend_analysis = comparison_data["summary"]["overall_trend"]

        await session.commit()
