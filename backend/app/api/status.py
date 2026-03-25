"""Status API routes."""

from fastapi import APIRouter

router = APIRouter()

@router.get("/status/{task_id}")
async def get_status(task_id: str):
    """Return a placeholder status for a task."""
    return {"task_id": task_id, "status": "Placeholder status"}
