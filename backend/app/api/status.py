from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Task

router = APIRouter()

@router.get("/status/{task_id}")
<<<<<<< Updated upstream
async def get_status(task_id: str, db: Session=Depends(get_db)):

    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "task_id": task_id,
        "status": task.status,
        "result": task.result,
        "created_at": task.created_at
    }
=======
async def get_status(task_id: str):
<<<<<<< Updated upstream
    return {"task_id": task_id, "status": "PENDING"}
=======
    return {"task_id": task_id, "status": "Placeholder status"}
>>>>>>> Stashed changes
>>>>>>> Stashed changes
