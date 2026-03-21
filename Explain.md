# 🩺 Disease Risk Predictor: Project Deep Dive

Welcome to the **Disease Risk Predictor** (also known as *Health Insight AI*). This project is a state-of-the-art, asynchronous medical report analysis system that converts unstructured health reports (PDFs/Images) into structured data and actionable disease risk predictions.

---

## 🏗️ 1. Orchestration & Architecture

The system is built on a distributed micro-services philosophy, ensuring that heavy computation like AI processing doesn't slow down the user experience.

### System Architecture Diagram
![System Architecture](./System_Architecture.svg)

**The Stack:**
- **Frontend:** React (Vite) + Tailwind CSS + Recharts (for trend visualization).
- **API Engine:** FastAPI (Python) - High-performance asynchronous backend.
- **Message Broker:** Redis - Coordinates tasks between the API and Workers.
- **Background Workers:** Celery - Handles OCR and ML inference tasks in the background.
- **OCR Engine:** PaddleOCR - Extracts text from scans with high precision.
- **ML Model:** XGBoost - Predicts risk scores based on extracted features.

---

## 🚀 2. Step-by-Step Workflow

The journey of a medical report follows this 5-step pipeline:

### Step 1: User Upload (Frontend)
The user interacts with a clean, drag-and-drop interface.
- **File Support:** PDF, JPG, PNG, CSV, XLSX.
- **Location:** `src/components/Upload.jsx`
- **Action:** Files are selected and sent via POST request to the API.

### Step 2: Ingestion & Queuing (Backend API)
FastAPI receives the file and hands it off.
- **Endpoint:** `POST /api/upload`
- **Storage:** The file is saved to `data/raw_uploads/`.
- **Async Trigger:** A task is pushed to the Redis queue so the user doesn't have to wait for the OCR to finish.

### Step 3: Text Extraction (OCR Layer)
The Celery worker picks up the task and runs PaddleOCR.
- **Service:** `ml_models/paddle_ocr/ocr_runner.py`
- **Process:** The AI "reads" the document, looking for specific headers (e.g., Glucose, Cholesterol, RBC).
- **Output:** Raw text is converted into a structured JSON format.

### Step 4: Machine Learning Inference (Predictor)
Structured metrics are passed through an XGBoost pipeline.
- **Feature Engineering:** Normalizes units (e.g., mg/dL to mmol/L) and maps medical synonyms.
- **Prediction:** The model calculates a probability score for various disease risks.
- **Location:** `ml_models/xgboost/predict.py`

### Step 5: Visualization & Results (Dashboard)
The final results are returned to the frontend.
- **Display:** Risk badges (Low/Medium/High) and historical trend charts.
- **Location:** `src/components/ResultView.jsx`

---

## 📊 3. Visual Flows

### User Journey Flow
![Customer Flow](./CustomerFlow.png)

### Data Processing Flowchart
![System Work Flow](./System_Work_Flow.png)

### Data Persistence
The extracted metrics and historical predictions are stored in a relational database to allow users to track their health over time.
![Database Schema](./databaseSchema.png)

---

## 🛠️ 4. Key Directory Structure

```text
Disease_risk_predictor/
├── frontend/         # React application (UI/UX)
├── backend/          # FastAPI server (Logistics)
├── ml_models/        # AI Brain (PaddleOCR & XGBoost)
├── queue/            # Asynchronous Task Manager (Celery/Redis)
├── data/             # Storage for uploads and results
└── SYSTEM/           # Documentation, Diagrams, and Assets
```

---

## 🔒 5. Future Enhancements
- **SHAP Integration:** For providing explainable AI (showing *why* a risk score is high).
- **HIPAA Compliance:** Adding end-to-end encryption for report data.
- **Unit Conversion Engine:** Smarter automated unit mapping for international reports.

##    6. Required Dependencies installed
- **Install PaddlePaddle (CPU version)**
python -m pip install paddlepaddle==3.0.0 -i https://pypi.tuna.tsinghua.edu.cn/simple

- **Or GPU version (CUDA 11.8)**
python -m pip install paddlepaddle-gpu==3.0.0 -i https://pypi.tuna.tsinghua.edu.cn/simple

- **Install PaddleOCR (Basic OCR only)**
python -m pip install paddleocr

- **For full document parsing (tables, charts, formulas - recommended for medical reports)**
python -m pip install "paddleocr[all]"

- **Install all dependencies**
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 sqlalchemy==2.0.23 pydantic==2.5.0 pydantic-settings==2.1.0 python-dotenv==1.0.0

- **Database drivers (choose based on your SQL database)**
- **For PostgreSQL (Recommended)**
pip install asyncpg==0.29.0 psycopg2-binary==2.9.9

- **For MySQL**
pip install aiomysql==0.2.0 pymysql==1.1.0

- **For SQLite (Development/Testing)**
pip install aiosqlite==0.19.0

- **Additional utilities**
pip install alembic==1.13.1 passlib[bcrypt]==1.7.4 python-jose[cryptography]==3.3.0 python-multipart==0.0.6
---
*Created by the Health Insight AI Development Team.*
