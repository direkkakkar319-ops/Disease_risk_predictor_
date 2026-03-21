# Ml Models


## PaddleOCR model

### `ml_models/paddle_ocr/ocr_runner.py`
- def __new__(cls)

- def __init__(self):    

- def preprocess_image(self, image_path: str) -> np.ndarray

- def extract_text(self, image_path: str, preprocess: bool = True) -> List[Dict]:

- def extract_tables(self, image_path: str) -> List[Dict]:

- def process_report(self, image_path: str, report_type: str) -> Dict[str, Any]

- def _parse_blood_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str,Any]:

- def _parse_lipid_profile(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str,Any]:

- def _parse_general(self, text_data: List[Dict]) -> Dict[str, Any]:

- def _extract_from_tables(self, tables: List[Dict]) -> Dict[str, Any]:    

- def _infer_unit(self, metric_name: str) -> str:    

- def _get_center(self, bbox: List[List[float]]) -> tuple:

- def get_ocr_runner() -> OCRRunner


## XGBoost model

### `ml_models/xgboost/feature_engineering.py`

### `ml_models/xgboost/model.pkl`


## `ml_models/models_utils.py`


## `ml_models/predict.py`