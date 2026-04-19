"""SQLAlchemy ORM models used by the backend."""

from sqlalchemy import Column, Integer, String, JSON, DateTime, Float, Text
from sqlalchemy.sql import func
from .database import Base

class Task(Base):
    """Tracks background job status and results."""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)
    status = Column(String)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    """Stores uploaded report information and OCR extraction results."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    content_type = Column(String)
    file_path = Column(String)
    user_id = Column(Integer, index=True)
    report_type = Column(String, index=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # OCR extraction results — populated by the worker after PaddleOCR runs
    raw_text = Column(Text, nullable=True)
    extracted_metrics = Column(JSON, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    processed_at = Column(DateTime, nullable=True)

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
