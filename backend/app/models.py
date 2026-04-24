"""
SQLAlchemy ORM models (models.py)
===================================
Three main tables power the application:

  reports            — one row per uploaded file
  tasks              — one row per ML prediction result, linked to a report
  report_comparisons — one row per side-by-side comparison of two reports

Relationship note: there is NO SQLAlchemy ForeignKey / relationship() between
reports and tasks by design. The link is a naming convention on task_id:
  task_id = "predict-{report_id}-{uuid}"
This lets the API query by pattern:  Task.task_id.like(f"predict-{report_id}-%")
Keeping them loosely coupled simplifies Celery task bookkeeping (no ORM joins
needed in the worker).

Report status lifecycle:
  uploaded → preprocessing → ocr_complete → completed (or failed)
"""

from sqlalchemy import Column, Integer, String, JSON, DateTime, Float, Text
from sqlalchemy.sql import func
from .database import Base

class Task(Base):
    """
    Stores the output of one ML prediction run.

    task_id format: "predict-{report_id}-{8-char uuid}"
    result JSON shape: { risks, risk_level, key_factors, recommendations,
                         model_version, raw_xgb_probas, ocr_coverage }
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)  # "predict-{report_id}-{uuid}"
    status = Column(String)                             # always "completed" when saved
    result = Column(JSON, nullable=True)                # full prediction payload
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    """
    One row per uploaded medical report file.

    status progresses through: uploaded → preprocessing → ocr_complete → completed
    OCR columns (raw_text, extracted_metrics, ocr_confidence) are NULL until
    the Celery worker finishes calling the HF Space /analyze endpoint.
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)           # original file name from the user's machine
    content_type = Column(String)                   # MIME type (image/jpeg, application/pdf, etc.)
    file_path = Column(String)                      # S3 key (prod) or absolute local path (dev)
    user_id = Column(Integer, index=True)           # FK to users.id (soft reference, no constraint)
    report_type = Column(String, index=True)        # blood/lipid/vitamin_d/hormone/kidney/liver
    status = Column(String, default="pending")      # lifecycle state (see docstring above)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # OCR extraction results — populated by the worker after PaddleOCR runs
    raw_text = Column(Text, nullable=True)           # full OCR output from PaddleOCR
    extracted_metrics = Column(JSON, nullable=True)  # structured key→{value,unit} dict
    ocr_confidence = Column(Float, nullable=True)    # average OCR confidence 0-1
    processed_at = Column(DateTime, nullable=True)   # timestamp when worker finished

class ReportComparison(Base):
    """Stores the result of comparing two same-type reports."""
    __tablename__ = "report_comparisons"

    id                  = Column(String, primary_key=True, index=True)  # UUID string
    user_id             = Column(Integer, index=True)
    report1_id          = Column(Integer, index=True)
    report2_id          = Column(Integer, index=True)
    report_type         = Column(String)
    status              = Column(String, default="pending")  # pending/completed/failed
    comparison_data     = Column(JSON, nullable=True)
    significant_changes = Column(JSON, nullable=True)
    trend_analysis      = Column(String, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
