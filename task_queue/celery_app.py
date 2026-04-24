"""
Celery application configuration (celery_app.py)
==================================================
Sets up the Celery worker that runs background ML tasks.

Architecture note — why Celery + Redis?
  Medical report analysis takes 30-120 seconds (OCR + HF Space round trip).
  FastAPI can't block a request that long without timing out or exhausting
  workers. Celery decouples upload (instant) from processing (async):
    Upload → save file → DB row → Redis queue ← Celery worker → update DB
  The frontend polls /api/status/{id} to track progress.

Broker vs Backend:
  broker  = Redis — where tasks are enqueued (task messages live here)
  backend = Redis — where Celery stores task results after completion
  Both point to the same Redis instance (Upstash in production).

SSL detection:
  Upstash Redis uses TLS: URL starts with "rediss://" (double-s).
  Celery needs explicit ssl_cert_reqs="none" to connect without a cert
  bundle — Upstash uses self-signed certs. The _use_ssl flag auto-detects
  this so the same config works on local (redis://) and prod (rediss://).

worker_concurrency = 1:
  The Render free tier has 512MB RAM. PaddleOCR + XGBoost models would OOM
  if multiple tasks ran concurrently. Single concurrency also means
  --pool=solo in start.sh, which avoids forking overhead entirely.

result_expires = 3600:
  Task results in Redis expire after 1 hour to prevent memory bloat.
  Permanent results are written to the PostgreSQL tasks table by the worker.
"""

from celery import Celery
from celery.signals import worker_ready, worker_process_init
import os
import logging

logger = logging.getLogger(__name__)

# Broker = where Celery sends tasks; Backend = where it stores results.
# Both point to Redis; in production these are the same Upstash URL.
CELERY_BROKER_URL     = os.getenv("CELERY_BROKER_URL",     "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "MEDSCAN AI",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["task_queue.tasks"]  # module where @celery_app.task functions are defined
)

# Auto-detect TLS: Upstash uses rediss:// (double-s), local Redis uses redis://
_use_ssl = CELERY_BROKER_URL.startswith("rediss://")
_ssl_opts = {"ssl_cert_reqs": "none"} if _use_ssl else {}

celery_app.conf.update(
    task_serializer = "json",       # tasks are serialised as JSON (not pickle)
    accept_content = ["json"],
    result_serializer = "json",
    timezone = "UTC",
    enable_utc = True,
    task_time_limit = 300,          # kill task after 5 min to prevent zombie workers
    worker_concurrency = 1,         # single concurrent task — fits in 512MB RAM on Render
    result_expires = 3600,          # Redis result TTL: 1 hour (permanent copy in DB)
    broker_connection_retry_on_startup = True,

    # TLS options — only set when connecting to Upstash (rediss://)
    broker_use_ssl = _ssl_opts if _use_ssl else None,
    redis_backend_use_ssl = _ssl_opts if _use_ssl else None,

    # Single queue: all tasks go to "default" so the single worker handles everything
    task_default_queue = "default",
    task_routes = {},
)

# worker_process_init fires inside EACH worker process at startup
@worker_process_init.connect
def _init_worker(**kwargs):
    # OCR engine is lazily loaded on first task call to save startup memory
    logger.info("Worker process initialising — OCR engine will load on first task")

# worker_ready fires once the entire worker is up and connected to the broker
@worker_ready.connect
def on_worker_ready(**kwargs):
    logger.info("Celery worker is ready and listening for tasks.")

if __name__ == "__main__":
    # Dev: python -m task_queue.celery_app
    # Production: start.sh runs: celery -A task_queue.celery_app worker ...
    celery_app.start()
