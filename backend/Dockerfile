FROM python:3.10-slim

WORKDIR /app

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

COPY backend/requirements.txt .

RUN pip install --no-cache-dir --timeout 300 --retries 10 -r requirements.txt

# Pre-download PaddleOCR models at build time so the first request isn't slow
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='en', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)"

COPY backend/ ./
COPY task_queue/ ./task_queue/
COPY ml_models/ ./ml_models/

RUN mkdir -p data/uploads

EXPOSE 8000

COPY backend/start.sh ./start.sh
RUN sed -i 's/\r//' start.sh && chmod +x start.sh

CMD ["./start.sh"]
