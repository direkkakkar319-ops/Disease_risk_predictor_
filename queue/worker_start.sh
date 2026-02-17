#!/bin/bash
celery -A queue.celery_app worker --loglevel=info
