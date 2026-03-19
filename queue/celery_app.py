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