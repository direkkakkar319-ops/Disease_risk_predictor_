# Ml Models

This module contains all machine learning and OCR-related components used in the **Disease Risk Predictor** system.

It handles:
- Medical report OCR (text + tables)
- Structured data extraction (blood, lipid, etc.)
- Feature engineering
- Disease risk prediction using XGBoost

## PaddleOCR model
This module implements a complete OCR pipeline using **PaddleOCR + PP-StructureV3** for extracting and parsing medical reports.

### `ml_models/paddle_ocr/ocr_runner.py`
- def __new__(cls):
Creates a single shared instance of `OCRRunner`.
Ensures heavy OCR models are initialized only once.

- def __init__(self):    
Initializes:
    - PaddleOCR engine
    - Table extraction engine
    - Configuration:
        - GPU (`PADDLE_USE_GPU`)
        - language (`PADDLE_OCR_LANG`)
 
- def preprocess_image(self, image_path: str) -> np.ndarray
Improves OCR accuracy using:
    - Grayscale conversion
    - Noise reduction
    - Contrast enhancment (CLACHE)

- def extract_text(self, image_path: str, preprocess: bool = True) -> List[Dict]:
Extracts text from images:
    - Runs OCR engine
    - Returns structured results
        {
            "text":"Glucose 95",
            "confidence":0.97
            "bbox":[[x1,y1],[x2,y2],...]
        }

- def extract_tables(self, image_path: str) -> List[Dict]:
Extracts Tables from the reports:
    - Detects table regions
    - Returns:
        - HTML table
        - Structured row data
        - Bounding boxes

- def process_report(self, image_path: str, report_type: str) -> Dict[str, Any]
Main processing pipline:
Steps:
    - Extract text
    - Extract tables
    - Parse structured medical data

Support report type:
    - blood
    - lipid
    - general

Output:
    {
    "raw_text": "...",
    "structured_metrics": {...},
    "tables": [...],
    "average_confidence": 0.95,
    "text_items": 120
    }

- def _parse_blood_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str,Any]:
Extracts:
    - WBC, RBC
    - Hemoglobin, Hematocrit
    - Platelets
    - Glucose, Creatinine, BUN

- def _parse_lipid_profile(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str,Any]:
Extracts:
    - Total Cholesterol
    - HDL, LDL
    - Triglycerides
    - VLDL

- def _parse_general(self, text_data: List[Dict]) -> Dict[str, Any]:
Fallback parser:
    - Returns all extracted lines
    - Provides simple stats

- def _extract_from_tables(self, tables: List[Dict]) -> Dict[str, Any]:    

- def _infer_unit(self, metric_name: str) -> str:    
Extracts values from tables:
    - Converts rows → key-value pairs
    - Parses numeric values
    - Includes units

- def _get_center(self, bbox: List[List[float]]) -> tuple:
Computes center point of bounding box.
Used for sorting OCR results.

- def get_ocr_runner() -> OCRRunner
Returns global OCRRunner instance (singleton).
Used across backend and Celery workers.


## XGBoost model

### `ml_models/xgboost/feature_engineering.py`
Handles:
    - Data cleaning
    - Feature extraction
    - Feature transformation

### `ml_models/xgboost/model.pkl`


## `ml_models/models_utils.py`


## `ml_models/predict.py`