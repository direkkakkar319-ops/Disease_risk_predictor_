import os
from pathlib import Path
from typing import Dict, List, Tuple

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
_XGBOOST_DIR = _BASE_DIR / "xgboost"
ALLOWED_REPORT_TYPE = {"blood", "lipid", "vitamin_d", "hormone", "kidney", "liver"}

"""
Maps each report type to its individual disease models.
Each entry is (disease_label, pkl_filename_without_extension).
Order determines the position in the ensemble input vector.
"""
REPORT_MODEL_MAP: Dict[str, List[Tuple[str, str]]] = {
    "blood":     [
        ("diabetes",   "diabetes"),
        ("anemia",     "anemia"),
        ("infection",  "infection"),
    ],
    "lipid":     [
        ("heart_disease", "heart"),
        ("stroke",        "stroke"),
    ],
    "vitamin_d": [
        ("vitamin_d_deficiency", "vitamin_d"),
    ],
    "hormone":   [
        ("testosterone_imbalance", "testosterone"),
        ("thyroid_disorder",       "thyroid"),
        ("hormonal_imbalance",     "hormone"),
    ],
    "liver":     [
        ("liver_disease", "liver"),
        ("fatty_liver",   "fatty_liver"),
        ("hepatitis",     "hepatitis"),
    ],
    "kidney":    [
        ("kidney_disease", "kidney"),
        ("renal_failure",  "renal"),
    ],
}


def get_disease_model_path(pkl_name: str) -> str:
    """
    Returns the absolute path to an individual disease .pkl file.
    E.g. pkl_name='diabetes' → ml_models/xgboost/diabetes.pkl
    """
    path = _XGBOOST_DIR / f"{pkl_name}.pkl"
    if not path.exists():
        raise FileNotFoundError(
            f"Disease model not found: {path}\n"
            "Train the model or verify the filename."
        )
    return str(path)


def get_ensemble_path(report_type: str) -> str:
    """
    Returns the path where the neural ensemble weights for a report type
    are stored (ml_models/xgboost/ensemble_{report_type}.pkl).
    The file may not exist yet — callers should check before loading.
    """
    return str(_XGBOOST_DIR / f"ensemble_{report_type}.pkl")


def get_model_path(report_type: str) -> str:
    """
    Legacy helper — kept for backwards compatibility.
    Returns path to the old combined model_{report_type}.pkl if it exists.
    """
    if report_type not in ALLOWED_REPORT_TYPE:
        raise ValueError(f"Invalid report type: {report_type}")

    env_path = os.getenv("XGBOOST_MODEL_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    typed = _XGBOOST_DIR / f"model_{report_type}.pkl"
    if typed.exists():
        return str(typed)

    fallback = _XGBOOST_DIR / "model.pkl"
    if not fallback.exists():
        raise FileNotFoundError("No model file found for the given report-type")
    return str(fallback)
