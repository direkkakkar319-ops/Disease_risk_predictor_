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