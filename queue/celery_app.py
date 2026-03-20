from celery import Celery
from celery.signals import worker_ready, worker_process_init
import os
import logging
"""
worker_ready-->fires once the entire worker is up
worker_process_init-->fires onces inside the EACH worker process at startup
"""

"""Sets-up logger for this file so we can print messages to the console"""
logger = logging.getLogger(__name__)

"""
Broker and backend URLs
"""
# Broker -> where celery sends the tasks 
# Backend-> where celery stores task after completion
CELERY_BROKER_URL     = os.getenv("CELERY_BROKER_URL",     "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

"""
Celery application
"""
celery_app = Celery(
    "MEDSCAN AI", # name of celery app
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["queue.tasks"]# tells where tasks are defined
)

"""
Celerey Configuration
"""
celery_app.conf.upadte(
    # Format for sending/reciving tasks
    task_serializer = "json",
    accept_content = ["json"],
    result_serializer = "json",
    
    # Timezone
    timzone = "UTC",
    enable_utc = True,
    
    # Track task progress
    task_time_limit = 300,
    
    # Number of tasks a worker will pick at a time
    worker_process_multiplier = 1,

    # Number of worker processes
    worker_currency = int(os.getenv("CELERY_WORKER_CONCURRENCY", "4")),

    # how long to keep results of the completed task
    result_expire = 3600,

    # Seperate queues for each tasks
    task_routs = {
        "queue.tasks.process_medical_reports":{"queue":"ocr"},
        "queue.tasks.process_disease_risk":{"queue":"prediction"},
        "queue.tasks.compare_reports":{"queue":"comparison"}
    },

    # queue for un-listed tasks
    task_default_queue = "default"
)

"""
Worker lifecycle hooks
"""

@worker_process_init.connect
def _init_worker(**kwargs):
    """
    Runs once when each worker process starts.(before reciving any task)
    We load the OCR model here so it makes it ready in the memory before 
    the first task arrives. 

    **kwargs is needed as celery passes extra info to this function
    Without it error would be thrown by Python
    """
    logger.info(f"Worker process initialising--Loading the OCR engine........")

    try:
        # import in function prevents crash if PaddleOCR is not installed
        from ml_models.paddle_ocr.ocr_runner import get_ocr_runner
        get_ocr_runner()#paddle ocr engine is loaded here
        logger.info("OCR engine is successfully loaded")
    
    except Exception as exc:
        logger.error(f"Failed to pre-load OCR engine:{exc}")

@worker_ready.connect
def on_worker_ready(**kwargs):
    """
    Runs once when the whole celery worker is up and connected to Redis
    Prints confirmation message so we know the worker started correctly
    """
    logger.info("Celery worker is ready and is listening tasks.")

"""
Running direclty for development
Start with: python -m queue.celery_app
For production docker runs the celery commnads insted
"""
if __name__=="__main__":
    celery_app.start()