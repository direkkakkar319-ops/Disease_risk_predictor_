from celery import Celery
from celery.signals import worker_ready, worker_process_init
"""
worker_ready-->fires once the entire worker is up
worker_process_init-->fires onces inside the EACH worker process at startup
"""
import os
import logging

logger = logging.getLogger(__name__)

"""
Read broker / backend from environment (set in .env or docker-compose)
"""
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6390/0")