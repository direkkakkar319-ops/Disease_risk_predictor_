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