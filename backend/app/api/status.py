from fastapi import APIRouter

router = APIRouter()

@router.get("/status/{task_id}")
async def get_status(task_id: str):
    return {"task_id": task_id, "status": "PENDING"}
