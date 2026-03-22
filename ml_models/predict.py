"""
Standard Library Imports
"""
import os
import logging
from typing import Any, Dict, List, Optional

"""
Third party  imports
"""
import joblib
import numpy as np

"""
Internal Project imports
"""
import ml_models.model_utils import get_model_path, RISK_THRESHOLDS
import ml_models.xgboost.feature_engineering import build_feature_vector

"""
Logger Set-up
"""
logger = logging.getLogger(__name__)

"""
Model cache
Important for Optimization
"""
_MODEL_CACHE:Dict[str, Any]={}

def _load_model(report_type:str):
    """
    Loads model and cache data for give report type
    """
    if report_type in _MODEL_CACHE:
        return _MODEL_CACHE[report_type]
    
    model_path = get_model_path(report_type)

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found {model_path}\n"
            "Train the model"
        )
    
    model = joblib.load(model_path)

    _MODEL_CACHE[report_type] = model

    logger.info(f"Loaded XGBoost model for '{report_type}' from {model_path}")

    return model