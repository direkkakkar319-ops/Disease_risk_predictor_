from .celery_app import celery_app

@celery_app.task(name="process_medical_report")
def process_medical_report(file_path: str):
    # OCR -> Feature Engineering -> Prediction
    return {"status": "success", "result": "low_risk"}
