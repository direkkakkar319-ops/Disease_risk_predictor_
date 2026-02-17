from pydantic import BaseModel

class PredictionRequest(BaseModel):
    file_name: str
    user_id: str
