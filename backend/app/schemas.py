"""Pydantic request/response schemas for the app."""

from pydantic import BaseModel

class PredictionRequest(BaseModel):
    """Input data for a prediction request."""
    file_name: str
    user_id: str
