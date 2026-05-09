#!/bin/sh
export PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
export PYTHONPATH=/app:${PYTHONPATH}
celery -A task_queue.celery_app worker --loglevel=info --pool=solo -Q default &
uvicorn app.main:app --host 0.0.0.0 --port 8000
