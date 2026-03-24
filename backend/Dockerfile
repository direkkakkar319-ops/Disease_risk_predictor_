FROM python:3.9-slim

# Prevent Python from buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for OCR / XGBoost
RUN apt-get update && apt-get install -y \
<<<<<<< Updated upstream
    build-essential \
=======
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    libpq-dev \
>>>>>>> Stashed changes
    gcc \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

<<<<<<< Updated upstream
# Copy project
=======
# Pre-download PaddleOCR ML models at build time
# Without this, models download on first API request (slow cold start)
# With this, models are baked into the image and ready immediately
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR()"

# Copy the entire project source code into /app inside the container
# Done AFTER pip install so that code changes don't invalidate the dependency cache layer
>>>>>>> Stashed changes
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]