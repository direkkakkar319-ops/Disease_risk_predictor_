import os
import pathlib import Path

"""
Risk-level thresholds
Probability scores from `predict_proba`
"""
RISK_THRESHOLDS = {
    "critical": 0.85,
    "high":     0.65,
    "moderate": 0.40
}

"""
Model file resolution
"""
_BASE_DIR = Path(__file__).parent
_XGBOOST_DIR = _BASE_DIR/"xgboost"
ALLOWED_REPORT_TYPE = {"blood", "lipid", "vitaminD", "hormone", "kidney", "liver"}

def get_model_path(report_type:str) -> str:
    """
    Returns the absolute path to the XGBoost model file(`ml_models/xgboost/model.pkl`)
    
    Priority
    --------
    1. Environment variable  XGBOOST_MODEL_PATH
    2. Type specific file    ml_models/xgboost/model_{report_type}.pkl
    3. Generic fallback      ml_models/xgboost/model.pkl
    """
    if report_type not  in ALLOWED_REPORT_TYPE:
        raise ValueError(f"Invalid report type :{report_type}")
    
    env_path = os.getenv("XGBOOST_MODEL_PATH")
    if env_path and os.path.exists(env_path):
        return env_path
    
    typed = _XGBOOST_DIR/f"model_{report_type}.pkl"
    if typed.exixts():
        return str(typed)
    
    fallback = _XGBOOST_DIR/"model.pkl"
    if not fallback.exists():
        raise FileNotFoundError("No model file found for the given report-type")
    return str(fallback)
