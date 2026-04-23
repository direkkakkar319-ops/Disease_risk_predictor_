# MEDSCAN.AI

An end-to-end AI pipeline that accepts medical report images (JPG/PNG/PDF), extracts lab values using PaddleOCR, predicts disease risk with XGBoost + a neural ensemble, and stores results in PostgreSQL. The frontend is a single-page React app.

> **Disclaimer:** This system is for educational and informational purposes only. It must not be used for medical diagnosis.

---

## Live Services

| Service | Platform | URL |
|---|---|---|
| Frontend | Render | https://medscan-ai-s7t1.onrender.com |
| Backend API + Celery worker | Render | https://medscan-api-x9ne.onrender.com |
| ML Service (OCR + XGBoost) | Hugging Face Space | https://direkkakkar-medscan-ai-ml-models.hf.space |
| Database | Neon PostgreSQL | Project: `disease_risk_predictor` (eu-west-2) |
| Redis | Upstash | Mumbai (ap-south-1) |
| File Storage | Supabase S3 | Bucket: `medscan-uploads` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, shadcn/ui (Radix UI), Lucide icons |
| Backend API | FastAPI, SQLAlchemy, Alembic, psycopg2, slowapi |
| Task Queue | Celery 5, Redis |
| ML / OCR | PaddleOCR 3, XGBoost 2, pure-NumPy neural ensemble |
| Auth | JWT (python-jose, HS256), bcrypt (passlib) |
| Storage | Supabase S3 (prod) / local disk (dev) |
| Database | PostgreSQL (Neon in prod, Docker in dev) |
| PDF Export | jsPDF + html2canvas (frontend) |
| CI/CD | GitHub Actions |

---

## How It Works

```
User uploads image
       │
       ▼
POST /api/upload  (FastAPI)
  ├─ saves file → Supabase S3 (prod) or /app/data/raw_uploads (dev)
  ├─ creates Report row  status="uploaded"
  └─ queues Celery task  process_medical_report(report_id, file_path, report_type)
                                    │
                                    ▼
                        Celery worker (background)
                          ├─ downloads file from S3
                          ├─ POSTs to HF Space  POST /analyze
                          │      ├─ PaddleOCR extracts raw text + structured metrics
                          │      ├─ XGBoost models predict per-disease risk (0–1)
                          │      └─ Neural ensemble refines predictions
                          ├─ saves OCR results → reports table
                          └─ saves prediction   → tasks table  status="completed"
                                    │
                                    ▼
               Frontend polls  GET /api/status/{report_id}  every 3 s
               until status === "completed" → renders risk dashboard
```

---

## Report Types and Diseases Predicted

| Report Type | Diseases Predicted |
|---|---|
| `blood` | Diabetes, Anemia, Infection |
| `lipid` | Heart Disease, Stroke |
| `vitamin_d` | Vitamin D Deficiency |
| `hormone` | Testosterone Imbalance, Thyroid Disorder, Hormonal Imbalance |
| `liver` | Liver Disease, Fatty Liver, Hepatitis |
| `kidney` | Kidney Disease, Renal Failure |

Risk level thresholds (applied to each disease's 0–1 probability):

| Label | Threshold |
|---|---|
| Critical | ≥ 0.85 |
| High | ≥ 0.65 |
| Moderate | ≥ 0.40 |
| Low | < 0.40 |

---

## Running Locally (Docker Compose)

Docker Compose is the only supported way to run the full stack locally.

```bash
# First run — downloads PaddleOCR models (~5 min)
docker-compose up --build

# Subsequent runs
docker-compose up

# Stop
docker-compose down

# Tail worker logs
docker-compose logs -f worker
```

Services exposed locally:

| URL | Service |
|---|---|
| http://localhost:8000 | FastAPI backend (auto-reloads) |
| http://localhost:5173 | Frontend dev server (run separately — see below) |
| http://localhost:5555 | Flower (Celery task monitor) |
| http://localhost:6379 | Redis |
| http://localhost:5432 | PostgreSQL (`disease_predictor` / `postgres` / `password`) |

> `ML_SERVICE_URL` must be set even locally — the worker calls the Hugging Face Space for OCR and prediction.

---

## Frontend Development

```bash
cd frontend
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build
npm run lint      # ESLint
```

The frontend is a single-page app with no React Router. Sections are full-height scroll blocks. Cross-section communication (upload → results → history) uses a custom DOM event: `window.dispatchEvent(new CustomEvent('reportUploaded', ...))`.

---

## Backend Development (outside Docker)

Requires Redis and PostgreSQL to be running (use Docker for those).

```bash
# In WSL — use the existing Windows-created venv:
source venv/Scripts/activate

# Run FastAPI (from repo root)
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run Celery worker (from repo root)
celery -A task_queue.celery_app worker --loglevel=info --pool=solo -Q default
```

---

## Database Migrations

Alembic migrations run automatically on FastAPI startup. To manage manually:

```bash
# From backend/ directory
alembic upgrade head
alembic revision --autogenerate -m "description"
alembic downgrade -1
```

Migration files: `backend/alembic/versions/`

---

## Environment Variables

Copy `.env` and fill in values:

| Variable | Purpose |
|---|---|
| `NEON_DB_URL` | Sync PostgreSQL URL (psycopg2) — overrides `DATABASE_URL` |
| `NEON_ASYNC_DB_URL` | Async PostgreSQL URL (asyncpg) — overrides `ASYNC_DATABASE_URL` |
| `REDIS_URL` | Redis connection URL |
| `CELERY_BROKER_URL` | Celery broker (same as `REDIS_URL`) |
| `CELERY_RESULT_BACKEND` | Celery result store (same as `REDIS_URL`) |
| `ML_SERVICE_URL` | HF Space base URL (`https://direkkakkar-medscan-ai-ml-models.hf.space`) |
| `USE_S3` | `true` in production (Supabase S3); `false` for local disk |
| `S3_ENDPOINT_URL` | Supabase storage endpoint |
| `S3_ACCESS_KEY` | Supabase S3 access key |
| `S3_SECRET_KEY` | Supabase S3 secret key |
| `S3_BUCKET_NAME` | `medscan-uploads` |
| `S3_REGION` | `ap-south-1` |
| `SECRET_KEY` | JWT signing secret (256-bit hex) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
| `PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK` | `True` (production) |

---

## Project Structure

```
├── frontend/               React + Vite SPA
│   └── src/
│       ├── sections/       Page sections (Hero, Results, History, Compare, …)
│       ├── components/     Shared components (Navbar, AuthModal, UploadReportModal, ReportPDFRenderer)
│       └── lib/            api.js (auth fetch wrapper), reportUtils.js (data transforms)
│
├── backend/                FastAPI application
│   └── app/
│       ├── api/            Route handlers: upload.py, reports.py, compare.py, status.py
│       ├── auth/           JWT auth: router.py, security.py, models.py, schemas.py
│       ├── models.py       SQLAlchemy ORM (Report, Task, ReportComparison)
│       ├── database.py     Sync + async engines, get_db() dependency
│       ├── config.py       Pydantic settings (reads NEON_DB_URL etc.)
│       └── main.py         App factory, CORS, rate limiting, Alembic startup hook
│
├── task_queue/             Celery configuration and background tasks
│   ├── celery_app.py       Celery app setup, Redis SSL detection, worker lifecycle hooks
│   └── tasks.py            process_medical_report, compare_reports tasks
│
├── ml_models/              ML inference layer (runs on Hugging Face Space)
│   ├── predict.py          RiskPredictor — XGBoost + neural ensemble inference
│   ├── neural_ensemble.py  Pure-NumPy MLP meta-learner
│   ├── model_utils.py      REPORT_MODEL_MAP, RISK_THRESHOLDS, model path helpers
│   ├── paddle_ocr/         PaddleOCR wrapper
│   └── xgboost/            16 trained .pkl model files + feature engineering
│
├── services/
│   └── ml_service.py       ReportComparator — local metric diff for compare feature
│
├── backend/alembic/        Database migration files
├── docker-compose.yml      Full local stack (API + worker + Redis + PostgreSQL + Flower)
├── Dockerfile              Frontend build (node:20-alpine, served by Vite)
└── backend/Dockerfile      Backend build (python:3.10-slim, started via start.sh)
```

---

## API Endpoints

All `/api/*` endpoints require `Authorization: Bearer <access_token>`.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check |
| POST | `/auth/register` | Create user account (rate-limited: 3/min) |
| POST | `/auth/login` | Get access + refresh tokens (rate-limited: 5/min) |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/upload` | Upload files, queue OCR+ML tasks |
| GET | `/api/reports` | List current user's reports (newest first) |
| GET | `/api/reports/{id}` | Full report detail: OCR metrics + prediction |
| GET | `/api/reports/{id}/download` | Download original uploaded file |
| GET | `/api/status/{task_id}` | Poll Celery task status |
| POST | `/api/compare` | Trigger comparison between two same-type reports |
| GET | `/api/compare` | List user's past comparisons |
| GET | `/api/compare/{id}` | Poll comparison status and result |

---

## Authentication

JWT-based with two token types:

- **Access token** — short-lived (30 min), sent in `Authorization: Bearer` header on every request
- **Refresh token** — long-lived (7 days), used only to silently obtain a new access token on 401

The frontend (`api.js`) automatically retries any 401 response with a token refresh before giving up. Both tokens are stored in `localStorage`.

---

## DB Schema

Three main tables (see `backend/app/models.py`):

- **`reports`** — uploaded file metadata + OCR results (`raw_text`, `extracted_metrics` JSON, `ocr_confidence`). Status lifecycle: `uploaded → preprocessing → ocr_complete → completed / failed`
- **`tasks`** — ML prediction output. `task_id` format: `predict-{report_id}-{uuid}`. `result` JSON contains `risks`, `risk_level`, `key_factors`, `recommendations`, `raw_xgb_probas`, `ocr_coverage`
- **`report_comparisons`** — comparison results: `significant_changes` JSON, `trend_analysis` string (`IMPROVING / WORSENING / STABLE`)
- **`users`** — auth (`backend/app/auth/models.py`)

---

## CI/CD Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `backend-lint.yml` | PR touching `backend/**` | `ruff check backend/` |
| `frontend-build.yml` | PR touching `frontend/**` | `npm ci` + lint + build |
| `security-audit.yml` | Weekly Sunday 9am UTC + manual | `pip-audit` + `npm audit` |
| `labeler.yml` | PR opened | Auto-labels PRs by changed paths |
| `manual-checks.yml` | Manual trigger | Ad-hoc checks |

---

## Key Design Decisions

**HF Space for ML inference** — PaddleOCR + XGBoost exceed Render's free 512MB RAM. The HF Space (free CPU tier, 16GB RAM) handles all OCR and prediction. The worker POSTs to `ML_SERVICE_URL/analyze` and gets both OCR and prediction in a single response.

**Single Render container** — `backend/start.sh` runs the Celery worker and uvicorn in the same process to avoid the $7/month Background Worker cost. `--pool=solo` avoids forking overhead on 512MB RAM.

**Sync DB in Celery** — asyncpg requires an active asyncio event loop, which Celery workers don't have. All worker DB calls use `SessionLocal` (psycopg2 sync) to avoid event-loop conflicts.

**Loose report↔task coupling** — no SQLAlchemy FK between `reports` and `tasks`. The link is the `task_id` naming convention (`predict-{report_id}-{uuid}`), keeping Celery task bookkeeping simple.

**S3 toggle** — `USE_S3=false` for local dev (files on shared Docker volume), `USE_S3=true` for production (Supabase S3 with Signature V4).

---

## Contributors

- Direk Kakkar
- Tannaya Supriya
