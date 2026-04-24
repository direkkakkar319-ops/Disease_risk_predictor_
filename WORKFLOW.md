# MEDSCAN.AI — File-to-File Workflow

This document traces every major user action through the codebase, file by file, function by function.

---

## Table of Contents

1. [App Startup](#1-app-startup)
2. [User Registration & Login](#2-user-registration--login)
3. [Upload & Analysis Pipeline](#3-upload--analysis-pipeline)
4. [Polling for Results](#4-polling-for-results)
5. [History Page](#5-history-page)
6. [Report Comparison](#6-report-comparison)
7. [PDF Download](#7-pdf-download)
8. [ML Inference Deep-Dive (HF Space)](#8-ml-inference-deep-dive-hf-space)

---

## 1. App Startup

### Frontend

```
frontend/src/main.jsx
  └─ mounts <App /> into #root

frontend/src/App.jsx
  └─ renders all section components in order:
       <Navbar> <Hero> <HowItWorks> <Diseases>
       <Results>   ← starts polling if localStorage has a pending report
       <History>   ← fetches /api/reports on mount (if logged in)
       <Compare>   ← passive until user triggers a comparison
       <Security> <Pricing> <Partners>
       <Footer>
```

### Backend

```
backend/app/main.py  →  on_startup()
  ├─ alembic.config.Config(alembic.ini)
  ├─ alembic.command.upgrade(cfg, "head")   — runs pending DB migrations
  │    └─ backend/alembic/versions/*.py     — migration scripts auto-detected via env.py
  │         └─ imports app.models so all ORM tables are visible to Alembic
  └─ fallback: models.Base.metadata.create_all(bind=engine)  — if Alembic fails

backend/app/main.py  → routers registered:
  /api   ← upload.router, status.router, reports.router, compare.router
  /auth  ← auth_router  (prefix="/auth")
```

---

## 2. User Registration & Login

### Registration

```
Browser
  └─ frontend/src/components/AuthModal.jsx
       └─ POST /auth/register  { username, email, password }
            via frontend/src/lib/api.js → apiFetch()
               └─ raw fetch() — no token yet (registration is unauthenticated)

backend/app/auth/router.py  →  register()
  ├─ rate limit: 3 requests/minute per IP  (slowapi)
  ├─ db.query(User).filter(username OR email already exists)
  │    └─ if found → 400 "Username or email already registered"
  ├─ backend/app/auth/security.py  →  get_password_hash(password)
  │    └─ passlib CryptContext  →  bcrypt (12 rounds)  →  returns "$2b$12$..."
  ├─ User(username, email, hashed_password, is_active=True)  →  db.commit()
  └─ returns UserRead schema  { id, username, email, is_active }
```

### Login

```
Browser
  └─ frontend/src/components/AuthModal.jsx
       └─ POST /auth/login  (application/x-www-form-urlencoded)
            { username, password }   ← OAuth2PasswordRequestForm requires form encoding

backend/app/auth/router.py  →  login()
  ├─ rate limit: 5/minute
  ├─ db.query(User).filter(username)
  ├─ backend/app/auth/security.py  →  verify_password(plain, hashed)
  │    └─ pwd_context.verify()  →  bcrypt comparison
  ├─ create_access_token({ "sub": username, "exp": now+30min, "type": "access" })
  │    └─ jose.jwt.encode()  →  HS256 signed with SECRET_KEY
  ├─ create_refresh_token({ "sub": username, "exp": now+7d, "type": "refresh" })
  └─ returns TokenResponse { access_token, refresh_token, token_type: "bearer" }

frontend/src/components/AuthModal.jsx
  └─ localStorage.setItem('access_token', ...)
     localStorage.setItem('refresh_token', ...)
```

### Silent Token Refresh (any 401 response)

```
frontend/src/lib/api.js  →  apiFetch(path, opts)
  ├─ attaches Authorization: Bearer {access_token} header
  ├─ fetch() → 401 received
  └─ tryRefresh()
       ├─ POST /auth/refresh  { refresh_token }
       │
       │   backend/app/auth/router.py  →  refresh()
       │     ├─ rate limit: 10/minute
       │     ├─ jose.jwt.decode(refresh_token)  — validates signature + expiry
       │     ├─ checks payload["type"] == "refresh"
       │     ├─ extracts username from payload["sub"]
       │     └─ create_access_token({ "sub": username })  →  new access token
       │         (no DB lookup needed — username is in the JWT)
       │
       ├─ localStorage.setItem('access_token', new_token)
       └─ retries original request with new token

If refresh also fails → localStorage.removeItem both tokens → user must log in again
```

### Request Auth Guard (every protected endpoint)

```
backend/app/auth/dependencies.py  →  get_current_active_user()
  └─ get_current_user()
       ├─ OAuth2PasswordBearer extracts token from Authorization header
       ├─ jose.jwt.decode(token, SECRET_KEY)
       ├─ verifies payload["type"] == "access"
       ├─ db.query(User).filter(username == payload["sub"])
       └─ returns User ORM object
```

---

## 3. Upload & Analysis Pipeline

### Step 1 — Frontend: File Selection & Upload

```
frontend/src/components/Navbar.jsx
  └─ <UploadReportModal>  (wraps the upload button as a Dialog trigger)

frontend/src/components/UploadReportModal.jsx
  ├─ User selects report type (blood/lipid/vitamin_d/hormone/kidney/liver)
  │    → state: reportType
  ├─ User drops files or uses file picker
  │    → processFiles()  — validates size ≤ 50MB
  │    → state: files[]
  └─ handleUpload()
       ├─ FormData.append('files', file)  for each file
       ├─ FormData.append('report_type', reportType)
       └─ frontend/src/lib/api.js  →  apiFetch('/api/upload', { method:'POST', body: formData })
            └─ Authorization: Bearer header auto-attached
```

### Step 2 — Backend: Save File + Queue Task

```
backend/app/api/upload.py  →  upload_reports()
  ├─ validates report_type against VALID_REPORT_TYPES set
  ├─ for each file:
  │    ├─ unique_filename = f"{user_id}_{os.urandom(8).hex()}{ext}"
  │    │
  │    ├─ [USE_S3=true]  ─────────────────────────────────────────────────
  │    │    └─ _get_s3_client()  →  boto3.client("s3", endpoint=Supabase, sig=s3v4)
  │    │         └─ upload_fileobj(file.file, bucket, "uploads/{unique_filename}")
  │    │         stored_path = "uploads/{unique_filename}"  (S3 key)
  │    │
  │    ├─ [USE_S3=false]  ────────────────────────────────────────────────
  │    │    └─ shutil.copyfileobj → /app/data/raw_uploads/{unique_filename}
  │    │         stored_path = "/app/data/raw_uploads/{unique_filename}"
  │    │
  │    ├─ backend/app/models.py → Report(filename, content_type, file_path,
  │    │    user_id, report_type, status="uploaded")
  │    │    db.add(report) → db.commit() → db.refresh(report)
  │    │
  │    └─ task_queue/tasks.py  →  process_medical_report.delay(
  │             report_id, stored_path, report_type)
  │         └─ .delay() serialises args as JSON → pushes to Redis "default" queue
  │
  └─ returns [{ id, filename, report_type, status: "success" }, ...]

frontend/src/components/UploadReportModal.jsx  →  handleUpload() continued
  ├─ localStorage.setItem('healthinsight_pending_report_id', reportIds[0])
  ├─ window.dispatchEvent(new CustomEvent('reportUploaded', { detail: { reportIds } }))
  │    ├─ → Results.jsx  listener  →  startPolling(reportId)
  │    └─ → History.jsx  listener  →  setTimeout(fetchReports, 2000)
  └─ document.getElementById('results').scrollIntoView()
```

### Step 3 — Celery Worker: OCR + ML via HF Space

```
task_queue/tasks.py  →  process_medical_report(report_id, file_path, report_type)
  ├─ bind=True, max_retries=3  (retries with exponential backoff on failure)
  │
  ├─ _update_report_status(report_id, "preprocessing")
  │    └─ SessionLocal() → report.status = "preprocessing" → db.commit()
  │
  ├─ [USE_S3=true]  download from S3 to /tmp/{filename}
  │    └─ _get_s3() → s3.download_file(bucket, s3_key, local_tmp)
  │         image_path = local_tmp
  │
  ├─ [USE_S3=false]  image_path = file_path  (already local)
  │
  ├─ self.update_state(state="PROGRESS", meta={"step": "calling_ml_service"})
  │
  ├─ requests.post(f"{ML_SERVICE_URL}/analyze",
  │       files={"file": (filename, file_obj)},
  │       data={"report_type": report_type},
  │       timeout=300)
  │    └─ → Hugging Face Space: POST /analyze
  │         (see Section 8 for the full HF Space ML pipeline)
  │         ← returns:
  │              {
  │                "raw_text": "...",
  │                "structured_metrics": { "glucose": { "value": 95, "unit": "mg/dL" }, ... },
  │                "ocr_confidence": 0.87,
  │                "prediction": {
  │                    "risks": { "diabetes": 0.23, "anemia": 0.67 },
  │                    "risk_level": "high",
  │                    "key_factors": [...],
  │                    "recommendations": [...],
  │                    "model_version": "neural-ensemble-blood-v1",
  │                    "raw_xgb_probas": {...},
  │                    "ocr_coverage": { "found": [...], "missing": [...], "coverage_pct": 87.5 }
  │                }
  │              }
  │
  ├─ _save_ocr_results(report_id, raw_text, structured_metrics, ocr_confidence)
  │    └─ SessionLocal()
  │         ├─ report.raw_text = raw_text
  │         ├─ report.extracted_metrics = structured_metrics
  │         ├─ report.ocr_confidence = confidence
  │         ├─ report.status = "ocr_complete"
  │         └─ db.commit()
  │
  ├─ _save_prediction(report_id, prediction)
  │    └─ SessionLocal()
  │         ├─ Task(task_id=f"predict-{report_id}-{uuid}", status="completed",
  │         │        result={ risks, risk_level, key_factors, recommendations,
  │         │                  model_version, raw_xgb_probas, ocr_coverage })
  │         ├─ db.add(task_row)
  │         ├─ report.status = "completed"
  │         ├─ report.processed_at = datetime.utcnow()
  │         └─ db.commit()
  │
  └─ finally block: delete local_tmp, delete S3 object (cleanup)
```

---

## 4. Polling for Results

```
frontend/src/sections/Results.jsx  →  startPolling(reportId)
  ├─ setInterval(3000ms) stored in pollingRef.current
  ├─ max 60 attempts (~3 min timeout)
  │
  └─ each tick:
       frontend/src/lib/api.js  →  apiFetch(`/api/status/${reportId}`)

       backend/app/api/status.py  →  get_report_status(report_id)
         ├─ db.query(Report).filter(id=report_id, user_id=current_user.id)
         ├─ db.query(Task).filter(task_id LIKE "predict-{report_id}-%")
         └─ returns {
                report_id, status, report_type, filename,
                ocr_confidence, extracted_metrics,   ← only if status=="completed"
                created_at, processed_at,
                result: task.result                  ← full prediction JSON
            }

       Results.jsx  →  response handler:
         ├─ setLoadingStep(data.status)  → shows "Preprocessing image…" / "OCR complete…" etc.
         ├─ if status == "completed" && data.result:
         │    └─ stopPolling()
         │       localStorage.setItem('healthinsight_latest_report_id', reportId)
         │       frontend/src/lib/reportUtils.js  →  transformResult(data)
         │         ├─ extracts risks, risk_level, key_factors, recommendations
         │         ├─ riskMetrics = Object.entries(risks).map → { name, value%, status, trend }
         │         └─ biomarkers = top-4 entries from extracted_metrics
         │       setReportData(transformed)  → triggers render
         └─ if status == "failed":
              stopPolling() → setPollError(message)

       Results.jsx  →  useEffect on riskMetrics:
         └─ canvas radar chart redraw
              ├─ Grid circles (5 concentric rings = 20%, 40%, 60%, 80%, 100%)
              ├─ Axis lines + labels (one per disease)
              └─ Data polygon: each axis scaled by risk value (0–100%)
                   filled orange with opacity, dots at each point
```

---

## 5. History Page

```
frontend/src/sections/History.jsx

── On mount ─────────────────────────────────────────────────────────────────
fetchReports()
  └─ frontend/src/lib/api.js  →  apiFetch('/api/reports')

  backend/app/api/reports.py  →  list_reports()
    ├─ db.query(Report).filter(user_id).order_by(created_at.desc())
    ├─ for each report:
    │    └─ db.query(Task).filter(task_id LIKE "predict-{r.id}-%").first()
    └─ returns lightweight list:
         [{ id, filename, report_type, status, risk_level, risks,
            ocr_confidence, created_at, processed_at }]

  History.jsx  →  data.map(transformReport)
    └─ each → { id, displayId, date, time, type, fileName, status, riskLevel, risks,
                keyFindings:[], biomarkers:[], extractedMetrics:null, prediction:null }
    (detail fields are null — loaded lazily on row click)

── On row click ─────────────────────────────────────────────────────────────
handleSelectReport(report)
  └─ if report.extractedMetrics !== null → already loaded, skip fetch

  apiFetch(`/api/reports/${report.id}`)

  backend/app/api/reports.py  →  get_report(report_id)
    ├─ db.query(Report).filter(id, user_id)
    ├─ db.query(Task).filter(task_id LIKE "predict-{report_id}-%")
    └─ returns {
           id, filename, report_type, status, ocr_confidence,
           extracted_metrics,    ← full JSON dict
           created_at, processed_at,
           prediction: task.result   ← full risks/recommendations JSON
       }

  History.jsx
    ├─ getRisksAsBiomarkers(extracted_metrics)  → top-4 biomarkers for display
    ├─ keyFindings = prediction.recommendations.slice(0,3)
    └─ updates reports[] state and selectedReport state

── On new upload ─────────────────────────────────────────────────────────────
window.addEventListener('reportUploaded', () => setTimeout(fetchReports, 2000))
  → refreshes the list 2 seconds after upload (worker hasn't finished yet,
    but the new "uploaded" status row will appear immediately)
```

---

## 6. Report Comparison

```
frontend/src/sections/Compare.jsx
  └─ user selects report1, report2 → POST /api/compare { report1_id, report2_id }
       via frontend/src/lib/api.js  →  apiFetch('/api/compare', { method:'POST', body:JSON })

backend/app/api/compare.py  →  trigger_comparison()
  ├─ validates report1 and report2 both belong to current_user
  ├─ validates r1.report_type == r2.report_type  (must compare same type)
  ├─ validates both reports have status == "completed"
  ├─ comparison_id = str(uuid.uuid4())
  ├─ ReportComparison(id, user_id, report1_id, report2_id, report_type, status="pending")
  │    → db.commit()
  ├─ celery_app.send_task('task_queue.tasks.compare_reports',
  │       args=[comparison_id, report1_id, report2_id])
  │    → pushed to Redis "default" queue
  └─ returns { comparison_id }

task_queue/tasks.py  →  compare_reports(comparison_id, report_1_id, report_2_id)
  ├─ _get_report_data(report_1_id)
  │    └─ SessionLocal()
  │         ├─ db.query(Report)  → structured_metrics, raw_text, report_type
  │         └─ db.query(Task).filter(task_id LIKE "predict-{id}-%")  → prediction_risks
  │         returns { structured_metrics, raw_text, report_type, created_at, prediction_risks }
  │
  ├─ _get_report_data(report_2_id)  (same)
  │
  ├─ services/ml_service.py  →  ReportComparator.compare_medical_reports(report_1, report_2)
  │    ├─ diffs structured_metrics between the two reports
  │    ├─ flags changes > 5% as "significant"
  │    ├─ determines overall_trend: "IMPROVING" / "WORSENING" / "STABLE"
  │    └─ returns comparison dict with { significant_changes, summary, metric_changes }
  │
  └─ _save_comparison(comparison_id, comparison_data)
       └─ SessionLocal()
            ├─ comp.status = "completed"
            ├─ comp.comparison_data = comparison_data
            ├─ comp.significant_changes = comparison_data["significant_changes"]
            ├─ comp.trend_analysis = comparison_data["summary"]["overall_trend"]
            └─ db.commit()

frontend/src/sections/Compare.jsx  polls  GET /api/compare/{comparison_id}
  ├─ backend/app/api/compare.py  →  get_comparison()
  │    └─ returns { status, trend_analysis, comparison_data, significant_changes, ... }
  └─ when status == "completed" → renders side-by-side diff UI
```

---

## 7. PDF Download

```
frontend/src/sections/History.jsx  →  handleDownloadReport(report)
  │
  ├─ apiFetch(`/api/status/${report.id}`)
  │    └─ backend/app/api/status.py  →  get_report_status()
  │         returns full report data including extracted_metrics + prediction result
  │
  ├─ frontend/src/lib/reportUtils.js  →  transformResult(data)
  │    └─ converts raw API response → { riskMetrics, biomarkers, riskLevel,
  │         recommendations, keyFactors, reportType, filename }
  │
  ├─ setPdfReportData(transformed)  →  feeds the hidden <ReportPDFRenderer> component
  │
  ├─ setTimeout(500ms)  — waits for React to re-render with new data
  │
  └─ pdfRendererRef.current.generatePDF()
       └─ frontend/src/components/ReportPDFRenderer.jsx
            ├─ html2canvas  →  captures the rendered report DOM to a canvas
            ├─ jsPDF         →  creates a new PDF document
            ├─ pdf.addImage(canvas, 'PNG', ...)  →  embeds the canvas snapshot
            └─ pdf.save(`${filename}_analysis.pdf`)  →  triggers browser download

Why the hidden component pattern?
  @react-pdf/renderer (used here as jsPDF + html2canvas) requires a real DOM
  subtree to render into. The ReportPDFRenderer is mounted but invisible
  (zero-opacity or off-screen), fed data via props, and triggered imperatively
  via a useImperativeHandle ref exposed as { generatePDF }.
```

---

## 8. ML Inference Deep-Dive (HF Space)

This section describes what happens inside the Hugging Face Space when the Celery worker calls `POST /analyze`.

```
HF Space entrypoint  →  POST /analyze
  receives: file (multipart), report_type (form field)
  │
  ├─ ml_models/paddle_ocr/ocr_runner.py  →  get_ocr_runner()
  │    └─ OCRRunner  (Singleton — loaded once per worker process)
  │         └─ __new__: returns existing instance if already created
  │
  │    OCRRunner.process_report(image_path, report_type)
  │    │
  │    ├─ extract_text(image_path)
  │    │    ├─ preprocess_image(image_path)
  │    │    │    ├─ cv2.cvtColor → grayscale
  │    │    │    ├─ cv2.fastNlMeansDenoising → reduce scan noise
  │    │    │    └─ CLAHE → improve contrast for low-quality scans
  │    │    │         saves preprocessed image to temp file
  │    │    ├─ PaddleOCR.predict(temp_path)
  │    │    │    → returns: [{ rec_texts, rec_scores, rec_polys }]
  │    │    └─ sorts by (y_center, x_center) → reading order
  │    │         returns: [{ text, confidence, bbox }]
  │    │
  │    ├─ extract_tables(image_path)
  │    │    └─ PPStructureV3.predict()  → extracts HTML tables from structured reports
  │    │         returns: [{ html, data, bbox }]
  │    │
  │    ├─ report-type parser  (e.g. _parse_blood_report)
  │    │    ├─ joins all text fragments into one string
  │    │    ├─ applies regex patterns:  "(?:WBC|White Blood Cell)[\s:)]+([0-9.]+)"
  │    │    ├─ extracts { key: { value, unit, source:"text" } }
  │    │    └─ fallback: _extract_from_tables() if regex finds nothing
  │    │
  │    └─ returns {
  │           raw_text,                   ← full concatenated OCR text
  │           structured_metrics,         ← { glucose: { value:95, unit:"mg/dL" }, ... }
  │           tables,                     ← raw table data
  │           average_confidence,         ← mean OCR confidence score
  │           text_items                  ← count of detected text fragments
  │       }
  │
  ├─ ml_models/predict.py  →  RiskPredictor.predict(metrics, report_type)
  │    │
  │    ├─ Step 1: Load disease models
  │    │    └─ ml_models/model_utils.py  →  REPORT_MODEL_MAP[report_type]
  │    │         e.g. blood → [("diabetes","diabetes"), ("anemia","anemia"), ("infection","infection")]
  │    │         for each (label, pkl_name):
  │    │           _load_disease_model(pkl_name)
  │    │             └─ joblib.load(ml_models/xgboost/{pkl_name}.pkl)
  │    │                  cached in _MODEL_CACHE dict
  │    │
  │    ├─ Step 2: Validate OCR coverage + build feature vector
  │    │    └─ ml_models/xgboost/feature_engineering.py
  │    │         │
  │    │         ├─ validate_ocr_metrics(metrics, report_type)
  │    │         │    ├─ FEATURE_MAP[report_type] → expected feature keys
  │    │         │    ├─ checks which keys exist in structured_metrics
  │    │         │    └─ returns (metrics, MetricsCoverage{found, missing, coverage_pct})
  │    │         │
  │    │         └─ build_feature_vector(metrics, report_type)
  │    │              ├─ normalize_units(metrics)
  │    │              │    └─ UNIT_NORMALIZATION → converts mmol/L → mg/dL etc.
  │    │              ├─ for each expected feature:
  │    │              │    ├─ extract value from normalized_metrics
  │    │              │    ├─ fallback to default if missing
  │    │              │    └─ validate_value() → clamp to physiological range
  │    │              └─ returns (feature_vector: List[float], feature_names: List[str])
  │    │                   e.g. ([7.0, 4.9, 14.0, 43.0, 250.0, 95.0, 1.0, 15.0], ["wbc","rbc",...])
  │    │
  │    ├─ Step 3: Run each XGBoost model independently
  │    │    └─ _run_individual_models(loaded_models, X)
  │    │         for each (label, pkl_name, model):
  │    │           _disease_probability(model, X)
  │    │             ├─ model.predict_proba(X)  → [P(class0), P(class1), P(class2), ...]
  │    │             ├─ disease_risk = 1 - P(class0)   ← "any severity" probability
  │    │             └─ severity_class = argmax(all_probas)
  │    │         returns (disease_labels, raw_probas: np.array, severity_classes)
  │    │
  │    ├─ Step 4: Neural ensemble calibration
  │    │    └─ ml_models/predict.py  →  _apply_ensemble(report_type, raw_probas)
  │    │         ├─ ml_models/model_utils.py  →  get_ensemble_path(report_type)
  │    │         │    → "ml_models/xgboost/ensemble_{report_type}.pkl"
  │    │         │
  │    │         └─ ml_models/neural_ensemble.py  →  load_ensemble(report_type, path, n)
  │    │              ├─ _ENSEMBLE_CACHE hit? → return cached NeuralEnsemble
  │    │              ├─ file exists? → NeuralEnsemble.load(path)  →  joblib.load()
  │    │              └─ no file? → NeuralEnsemble(n_diseases)  (identity pass-through)
  │    │
  │    │              NeuralEnsemble.predict(raw_probas)
  │    │                └─ if trained:
  │    │                     _MLP.forward(x)
  │    │                       ├─ h1 = ReLU(x  @ W1 + b1)   (n_diseases → 32)
  │    │                       ├─ h2 = ReLU(h1 @ W2 + b2)   (32 → 16)
  │    │                       └─ out = Sigmoid(h2 @ W3 + b3) (16 → n_diseases)
  │    │                   else: return raw_probas unchanged
  │    │
  │    ├─ Step 5: Build risks dict + risk_level
  │    │    ├─ risks = { label: round(prob, 4) for label, prob in zip(labels, final_probas) }
  │    │    ├─ max_risk = max(risks.values())
  │    │    └─ _score_to_level(max_risk)
  │    │         ├─ ≥ 0.85 → "critical"
  │    │         ├─ ≥ 0.65 → "high"
  │    │         ├─ ≥ 0.40 → "moderate"
  │    │         └─ else   → "low"
  │    │
  │    ├─ Step 6: SHAP explanation on highest-risk model
  │    │    └─ _compute_shap(top_model, X, feature_names, severity_class)
  │    │         ├─ shap.TreeExplainer(model)
  │    │         ├─ shap_values = explainer.shap_values(X)   → list per class
  │    │         ├─ picks the predicted severity class to explain
  │    │         └─ returns { feature_name: shap_value } dict
  │    │
  │    │    _top_factors(shap_values, feature_names, n=5)
  │    │      → top 5 by |shap_value|, each { feature, impact, direction }
  │    │
  │    └─ Step 7: Recommendations
  │         └─ _recommendations(risk_level, risks)
  │              ├─ base recs from risk_level bucket (low/moderate/high/critical)
  │              └─ disease-specific extras (diabetes > 0.6, heart > 0.6, etc.)
  │
  └─ HF Space response:
       {
         "raw_text": "...",
         "structured_metrics": { "glucose": { "value": 95, "unit": "mg/dL" }, ... },
         "ocr_confidence": 0.87,
         "prediction": {
           "risks":           { "diabetes": 0.23, "anemia": 0.67, "infection": 0.12 },
           "risk_level":      "high",
           "key_factors":     [{ "feature": "hemoglobin", "impact": -0.42, "direction": "decreases" }],
           "recommendations": ["Schedule a doctor appointment soon.", ...],
           "model_version":   "neural-ensemble-blood-v1",
           "raw_xgb_probas":  { "diabetes": 0.21, "anemia": 0.70, "infection": 0.11 },
           "ocr_coverage":    { "found": ["wbc","glucose",...], "missing": ["bun"], "coverage_pct": 87.5 }
         }
       }
```

---

## Data Flow Summary (single upload, end-to-end)

```
Browser
  UploadReportModal.jsx
    api.js → POST /api/upload
      upload.py → S3 / disk → Report(status="uploaded") → process_medical_report.delay()
        Redis queue
          tasks.py → process_medical_report()
            S3 download (if prod)
            requests.post(HF_SPACE/analyze)
              ocr_runner.py → PaddleOCR → regex parse → structured_metrics
              predict.py    → feature_engineering.py → XGBoost × N → neural_ensemble.py
                           ← { risks, risk_level, recommendations, key_factors, ... }
            _save_ocr_results()  → reports table (status="ocr_complete")
            _save_prediction()   → tasks table  + reports.status="completed"

Browser (polling every 3s)
  Results.jsx
    api.js → GET /api/status/{id}
      status.py → Report + Task → response
    reportUtils.js → transformResult() → riskMetrics, biomarkers
    canvas radar chart + risk bars rendered
    localStorage.setItem('healthinsight_latest_report_id', id)
```

---

## Key File Reference

| File | Role |
|---|---|
| `frontend/src/lib/api.js` | Central fetch wrapper: auth header, silent 401 refresh |
| `frontend/src/lib/reportUtils.js` | Converts raw API response to display-ready shape |
| `frontend/src/components/UploadReportModal.jsx` | File picker, type selector, POST /api/upload |
| `frontend/src/sections/Results.jsx` | Polls status, renders radar chart + risk dashboard |
| `frontend/src/sections/History.jsx` | Lists reports, lazy-loads detail, PDF download trigger |
| `frontend/src/components/ReportPDFRenderer.jsx` | Hidden DOM element → html2canvas → jsPDF export |
| `backend/app/main.py` | FastAPI app factory, CORS, rate limit, Alembic startup |
| `backend/app/config.py` | Pydantic settings, NEON_DB_URL override |
| `backend/app/database.py` | Sync + async engines, `get_db()` FastAPI dependency |
| `backend/app/models.py` | ORM: Report, Task, ReportComparison, (User in auth/) |
| `backend/app/api/upload.py` | Save file, create Report row, queue Celery task |
| `backend/app/api/status.py` | Polling endpoint: Report + Task → combined status |
| `backend/app/api/reports.py` | List (lightweight) + detail + original file download |
| `backend/app/api/compare.py` | Validate + create ReportComparison + queue compare task |
| `backend/app/auth/router.py` | /auth/register, /auth/login, /auth/refresh |
| `backend/app/auth/security.py` | bcrypt hashing, JWT create (access + refresh) |
| `backend/app/auth/dependencies.py` | `get_current_active_user` FastAPI dependency |
| `task_queue/celery_app.py` | Celery app, Redis SSL detection, worker lifecycle |
| `task_queue/tasks.py` | `process_medical_report`, `compare_reports` Celery tasks |
| `services/ml_service.py` | `ReportComparator` — local metric diff for comparisons |
| `ml_models/paddle_ocr/ocr_runner.py` | PaddleOCR Singleton: preprocess → OCR → regex parse |
| `ml_models/predict.py` | `RiskPredictor` — orchestrates OCR→features→XGBoost→ensemble |
| `ml_models/xgboost/feature_engineering.py` | Unit normalisation, feature vector builder, OCR coverage |
| `ml_models/model_utils.py` | `REPORT_MODEL_MAP`, `RISK_THRESHOLDS`, model path helpers |
| `ml_models/neural_ensemble.py` | Pure-NumPy MLP meta-learner, module-level cache |
