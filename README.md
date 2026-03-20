# Disease Risk Predictor

This project is a disease risk predictor using React, FastAPI, PaddleOCR, and XGBoost.

## 🩺 Health Insight AI
AI-Powered Medical Report Processing & Risk Prediction System.
Health Insight AI is a scalable, asynchronous web application that transforms medical report images into structured health data and generates explainable disease risk predictions using machine learning.

### 🚀 Overview

Medical reports are commonly shared as scanned images or PDFs. These formats:
+ Are not machine-readable
+ Require manual interpretation
+ Cannot be easily analyzed historically
+ Prevent automated health analytics

Health Insight AI solves this problem by building an end-to-end AI pipeline that:
1. Extracts lab metrics from medical report images
2. Normalizes and structures the data
3. Predicts disease risk probabilities
4. Provides explainable AI insights
5. Stores and visualizes historical health trends

⚠️ Disclaimer:
This system is developed for educational and informational purposes only and must not be used for medical diagnosis.


## Project Structure

- `frontend/`: React App (Vite)
- `backend/`: FastAPI Backend
- `ml_models/`: Machine Learning Layer
- `queue/`: Celery Queue Config
- `data/`: Uploaded & processed data
- `system`:System workflows






## 🧠 Key Features

### 📄 Medical Report Processing
+ Upload JPG, PNG, or PDF reports
+ Automated OCR-based text extraction
+ Structured metric parsing

### 🧮 Data Normalization
- Metric synonym mapping
- Unit conversion
- Range validation
- Missing value handling

### 🤖 Machine Learning Prediction
- XGBoost-based disease risk modeling
- Probability-based risk outputs
- Scalable inference architecture

### 📊 Dashboard & Visualization
- Extracted metrics display
- Risk indicators
- Historical report tracking
- Trend analysis charts

### ⚡ Asynchronous Processing
- Redis message broker
- Celery background workers
- Non-blocking API design
- Scalable architecture

## ⚙️ How It Works

1️⃣ User uploads a health report <br>
2️⃣ Backend validates and stores file <br>
3️⃣ Job is pushed to Redis queue<br>
4️⃣ Celery worker processes report<br>
5️⃣ OCR extracts text and lab values<br>
6️⃣ Data is normalized and structured<br>
7️⃣ ML model predicts risk probabilities<br>
8️⃣ SHAP generates explainability insights<br>
9️⃣ Results are stored in PostgreSQL<br>
🔟 Dashboard fetches and visualizes results<br>



## 📈 Performance & Design Goals

- OCR extraction accuracy ≥ 90%
- Model AUC ≥ 0.80
- End-to-end processing time < 10 seconds
- Horizontally scalable worker architecture
- Stateless API services

## 🔒 Security Considerations

- File type validation
- Input sanitization
- Secure password hashing (if authentication enabled)
- HTTPS recommended for deployment
- Data anonymization (future enhancement)

## 🧪 Testing Strategy

- Unit tests for API endpoints
- OCR validation against known samples
- ML model evaluation (AUC, accuracy, F1-score)
- Pipeline latency benchmarking
- Manual UI testing

## 👨‍💻 Contributors

* Direk Kakkar
* Tannaya Supriya

## 🎯 Resume Summary

Designed and implemented a scalable asynchronous AI-powered health report processing system using React, FastAPI, Redis, Celery, XGBoost, and SHAP to convert unstructured medical reports into structured and explainable disease risk predictions.
