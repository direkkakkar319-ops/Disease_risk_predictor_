# Use official Python 3.10 slim image as base (smaller size, fewer vulnerabilities)
FROM python:3.10-slim

# Set /app as the working directory inside the container
WORKDIR /app

# Install system-level dependencies needed by OpenCV, PaddleOCR, and psycopg2
# libglib2.0-0     → Core GLib library required by OpenCV and PaddleOCR
# libsm6           → X11 Session Management library (OpenCV needs even without display)
# libxext6         → X11 extensions library (required by OpenCV in headless mode)
# libxrender-dev   → X Rendering Extension (OpenCV dependency)
# libgomp1         → OpenMP for multi-threading (used by PaddleOCR/numpy operations)
# libgl1           → OpenGL support required by OpenCV for image processing
# libpq-dev        → PostgreSQL client headers (needed to compile psycopg2)
# gcc              → C compiler required to build native Python extensions
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements.txt first (before the rest of the code)
# This allows Docker to cache the pip install layer separately —
# if your code changes but requirements.txt doesn't, pip won't re-run
COPY backend/requirements.txt .

# Install all Python dependencies from requirements.txt
# --no-cache-dir → skip saving pip's download cache, keeps image size smaller
RUN pip install --no-cache-dir --timeout 300 --retries 10 -r requirements.txt

# Pre-download PaddleOCR ML models at build time
# Without this, models download on first API request (slow cold start)
# With this, models are baked into the image and ready immediately
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='en', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)"

# Copy backend source, then repo-root modules that the backend imports
COPY backend/ ./
COPY task_queue/ ./task_queue/
COPY ml_models/ ./ml_models/

# Create the uploads directory for storing user-uploaded report images
# -p flag prevents errors if the directory already exists
RUN mkdir -p data/uploads

# Document that the container listens on port 8000
# Note: This does NOT open the port — you still need -p 8000:8000 when running
EXPOSE 8000

# Default command to start the FastAPI app using Uvicorn
# app.main:app   → points to the FastAPI instance in app/main.py
# --host 0.0.0.0 → listen on all network interfaces (required inside Docker)
# --port 8000    → run on port 8000
COPY backend/start.sh ./start.sh
RUN sed -i 's/\r//' start.sh && chmod +x start.sh

CMD ["./start.sh"]
