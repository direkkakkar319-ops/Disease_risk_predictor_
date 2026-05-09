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
    include=["task_queue.tasks"]# tells where tasks are defined
)

"""
Celerey Configuration
"""
_use_ssl = CELERY_BROKER_URL.startswith("rediss://")
_ssl_opts = {"ssl_cert_reqs": "none"} if _use_ssl else {}

celery_app.conf.update(
    task_serializer = "json",
    accept_content = ["json"],
    result_serializer = "json",
    timezone = "UTC",
    enable_utc = True,
    task_time_limit = 600,
    worker_concurrency = 1,
    result_expires = 3600,
    broker_connection_retry_on_startup = True,

    # SSL for Upstash rediss:// URLs
    broker_use_ssl = _ssl_opts if _use_ssl else None,
    redis_backend_use_ssl = _ssl_opts if _use_ssl else None,

    # All tasks go to default queue so the single worker handles everything
    task_default_queue = "default",
    task_routes = {},
)

"""
Worker lifecycle hooks
"""

@worker_process_init.connect
def _init_worker(**kwargs):
    # Skip pre-loading on memory-constrained deployments; OCR runner uses its own cache
    logger.info("Worker process initialising — OCR engine will load on first task")

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
