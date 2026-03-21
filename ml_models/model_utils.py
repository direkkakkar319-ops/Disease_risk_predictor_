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
