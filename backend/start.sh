#!/bin/sh
export PYTHONPATH=/app:${PYTHONPATH}
celery -A task_queue.celery_app worker --loglevel=info --pool=solo -Q default &
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
