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
from queue.celery_app import celery_app

"""
Database Connection
"""
from app.database import AsyncSessionLocal

"""
Database Table Models
"""
from app.models import MedicalReport, Prediction, Report Comparision

"""
OCR and ML imports
"""
from ml_models.paddle_ocr.ocr_runner import get_ocr_runner  
from ml_models.predict import RiskPredictor 

"""
Comaparision Service
"""
from services.ml_service import ReportComparator
from sqlalchemy import select

logger = logging.getLogger(__name__)

"""TASKS ARE AS FOLLOWS"""

"""
Task 1 - OCR Preprocessing
"""
@celery_app.task(
    bind=True,
    max_retries=3,
    name="quene.tasks.process_medical_report"
)
def process_medical_report(self, report_id:str, file_path:str, report_type:str):
    """
    Reads a medical report using PaddleOCR and extracts the lab values.
    Steps:
        1. Mark the report as preprocessing in database.
        2. Run OCR on the image.
        3. Extract text and lab values.
        4. Save the data to database.
        5. Kickoff prediction task 2-automatically

    Args:
        report_id
        file_path
        report_type
    """
    try:
        asyncio.run(_update_report_status(report_id, "preprocessing"))
        self.update_state(state="PROGRESS", meta={"step":"intialising_ocr"})

        ocr_runner = get_ocr_runner()#gate keeping function
        self.update_state(state="PROGRESS", meta={"step": "ocr_extraction"})
        result = ocr_runner.process_report(file_path, report_type)

        self.update_state(state="PROGRESS", meta={"step":"saving_ocr_results"})
        asyncio.run(_save_ocr_results(
            report_id = report_id,
            raw_text = result["raw_text"],
            metrics = result["structured_metrics"],
            tables = result.get("tables", []),
            confidence = result.get("average_confidence", 0.0)
            )
        )
        
        predict_disease_risk.delay(
            report_id,
            result["structured_metrics"],
            report_type
        )

        return{
            "status":"completed",
            "report_id":report_id,
            "metrics_extracted":len(result["structured_metrics"])
        }
    
    except Exception as exc:
        logger.error(f"[process_medical_report] failed for {report_id}: {exc}")
        asyncio.run(_update_report_status(report_id, "failed"))
        raise self.retry(exc=exc)

"""
Task 2 - Disease Risk Prediction
"""
@celery_app.task(
    bind = True,
    max_retries = 2,
    default_retry_delay = 30,
    name = "queue.tasks.predict_disease_risk"
)
def predict_disease_risk(self, report_id:str, metrics:dict,report_type:str):
    """
    Runs the XGBoost ML model on the extracted lab values and saves 
    the disease risk predictions to the database

    Args:
        report_id
        metrics
        report_type
    """
    try:
        self.update(state="PROGRESS", meta={"step":"loading model"})
        predictor = RiskPredictor()

        self.update_state(state="PROGRESS", meta={"step":"predicting"})
        asyncio.run(_save_prediction(report_id, prediction_result))

        return {
            "status":"completed",
            "report_id":report_id,
            "risk_level":prediction_result.get("risk level")
        }

    except Exception as exc:
        logger.error(f"[predict_disease_risk] failed for {report_id}:{exc}")
        raise self.retry(exc=exc)

"""
Task 3 - Report Comparision
"""
@celery_app.task(
    bind = True,
    max_retries = 2,
    default_retry_delay = 30,
    name = "queue.tasks.compare_reports"
)
def compare_reports(self, comparision_id:str, report_1_id:str, report_2_id:str):
    """
    Compare two health reports and saves the results in the database
    
    Args:
        comparision_id
        report_1_id
        report_2_id
    """
    try:
        self.update_state(state="PROGRESS", meta={"step":"fetching_reports"})
        report_1 = asyncio.run(_get_report_data(report_1_id))
        report_2 = asyncio.run(_get_report_data(report_2_id))

        self.update_state(state="PROGRESS", meta={"step":"comparing"})
        comparator = ReportComparator()
        comparison = comparator.compare_medical_reports(report_1, report_2)

        self.update_state(state="PROGRESS", meta={"step":"saving_comparision"})
        asyncio.run(_save_comparision(comparision_id, comparision))

        return {
            "status":"completed",
            "comparision_id":comparision_id,
            "trend":comparison["summary"]["overall_trend"]
        }

    except Exception as exc:
        logger.error(f"[compare_reports] failed for comparison {comparision_id}:{exc}")
        raise self.retry(exc=exc)

"""
Private database helper `async` functions

our database SQLAlchemy uses async/await for all the queries
but celery uses tasks are regular `synchronous functions`
asyncio.run() is the bridge — it lets a sync function call an async one.
Each helper opens a DB session, does one job, then closes the session.
"""
async def _update_report_status(report_id:str, status:str):
    """
    Update the status column of a report row in the database
    Sets processed_at timestamp when status becomes `completed`
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MedicalReport).where(MedicalReport.id == report_id)
        )

        report = result.scaler_one_or_none()# returns none if the report is not found
        
        if report:
            report.status = status

            if status == "completed":
                report.processed_at = datetime.utcnow() 
            
            # Keep changes 
            await session.commit()

async def _save_ocr_results(
    report_id : str,
    raw_text  : str,
    metrics   : dict,
    tables    : list,
    confidence: float,
    ):
    """
    Saves everthing OCR has extracted from the image of the health report
    It is called after OCR finishes task 1 
    Marks the report as 'completed' and record the finish time
    """
    async with AsyncSessionLocal() as session:

        result = await session.execute(
            select(MedicalReport).where(MedicalReport.id==report_id)
        )

        report = result.scalar_one_or_none()

        if report:
            # Each columns is filled with OCR output
            report.raw_text = raw_text
            report.extracted_,etrics = metrics
            report.ocr_confidence = confidence

            # status updated and time recorded
            report.status = "completed"
            report.processed_at = datetime.utcnow()

            await session.commit()

async def _save_predictions(report_id:str, prediction_result:dict):
    """
    Creates a new row in the predictions table with the ML model output
    Called after Task-2(Disease Risk Prediction[predict_disease_risk])
    
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
            # one row in prediction table
            prediction = Prediction(
                user_id = report.user_id,
                
                report_id = report_id,

                disease_risk = prediction_result.get("risks", {}),
                
                risk_level = prediction_result.get("risk_level"),
                
                #tells why model gave this score
                shap_values = prediction_result.get("shap_values"),

                model_version = prediction_result.get("model_version"),

                recommendations = prediction_result.get("recommendations", []),

                key_factors = prediction_result.get("key_factors", [])
            )
            # Stages new rows in sql
            session.add(prediction)

            await session.commit()

async def _get_report_data(report_id:str) -> dict:
    """
    Reads report from the database and returns its data as a plain dictionary
    Called by Task 3(compare reports)
    Empty dictionary is returned if report_id does not exists in the database
    """
    async with AsyncSessionLocal() as session:

        result = await session.execute(
            select(MedicalReport).where(MedicalReport.id == report_id)
        )

        report = result.scalar_one_or_none()

        if report:
            return{
                "structured metrics":report.extracted_metrics or {},

                "raw text":report.raw_text or "",

                "report_type":report.report_type,

                "created_at":report.createdat.isoformat(),
            }

        return {}