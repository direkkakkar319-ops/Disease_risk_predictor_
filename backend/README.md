# Backend

## `alembic`
### `versions`
#### `env.py`

## `app`
### `app/config.py`
### `app/crud.py`
### `app/database.py`
### `app/dependencies.py`
### `app/main.py`
### `app/models.py`
### `app/schmeas.py`
### `routers`
#### `app/routers/__init__.py`
#### `app/routers/auth.py`
#### `app/routers/comaprision.py`
#### `app/routers/predictons.py`
#### `app/routers/reports.py`

## `services`
### `services/ml_service.py`
### `services/ocr_service.py`

## `alembic.ini`

## `Dockerfile`
- Use official Python 3.10 slim image as base
- Install system-level dependencies needed by OpenCV, PaddleOCR, and psycopg2
- Copy only requirements.txt first (before the rest of the code)
- Install all Python dependencies from requirements.txt
- Pre-download PaddleOCR ML models at build time
- Copy the entire project source code into /app inside the container
- Create the uploads directory for storing user-uploaded report images
- Document that the container listens on port 8000
- Starts the FastAPI app using Uvicorn

## `requirements.txt`
- Has the required items that needs to be installed before running the code