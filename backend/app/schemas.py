"""Pydantic request/response schemas for the app."""

from pydantic import BaseModel
from datetime import datetime

class PredictionRequest(BaseModel):
    """Input data for a prediction request."""
    file_name: str
    user_id: str

class ReportBase(BaseModel):
    filename: str
    content_type: str

class ReportCreate(ReportBase):
    user_id: int
    file_path: str

class Report(ReportBase):
    id: int
    user_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
