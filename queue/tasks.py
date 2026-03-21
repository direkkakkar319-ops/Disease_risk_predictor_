from .celery_app import celery_app
from ml_models.paddle_ocr.ocr_runner import extract_text_from_report  # fixed path & filename

@celery_app.task(name="process_medical_report", bind=True)  
def process_medical_report(self, file_path: str, task_id: str):  #added self (bind=True requires it), added task_id
    try:
        # Step 1: OCR
        raw_text = extract_text_from_report(file_path)  #fixed typo: extracted_text → extract_text
        
        # Step 2: (Later) Feature engineering + XGBoost prediction
        # result = predict_from_text(raw_text)

        return {
            "status": "SUCCESS",
            "task_id": task_id,
            "extracted_text": raw_text
        }
    except Exception as exc:
        raise self.retry(exc=exc, countdown=5, max_retries=3)  #added error handling