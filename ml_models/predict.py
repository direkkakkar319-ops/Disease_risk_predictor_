"""
Standard Library Imports
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

"""
Third party imports
"""
import joblib
import numpy as np

"""
Internal Project imports
"""
from ml_models.model_utils import (
    REPORT_MODEL_MAP,
    RISK_THRESHOLDS,
    get_disease_model_path,
    get_ensemble_path,
)
from ml_models.neural_ensemble import load_ensemble
from ml_models.xgboost.feature_engineering import build_feature_vector, validate_ocr_metrics

"""
Logger Set-up
"""
logger = logging.getLogger(__name__)

"""
Individual disease model cache
Keys: pkl_filename (e.g. "diabetes", "heart")
"""
_MODEL_CACHE: Dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def _load_disease_model(pkl_name: str) -> Any:
    """
    Loads and caches a single disease XGBoost model by its pkl filename.
    """
    if pkl_name in _MODEL_CACHE:
        return _MODEL_CACHE[pkl_name]

    path = get_disease_model_path(pkl_name)
    model = joblib.load(path)
    _MODEL_CACHE[pkl_name] = model
    logger.info(f"Loaded disease model '{pkl_name}' from {path}")
    return model


def _load_all_models(report_type: str) -> List[Tuple[str, str, Any]]:
    """
    Loads every disease model for the given report type.

    Returns
    -------
    List of (disease_label, pkl_name, model) tuples,
    in the order defined by REPORT_MODEL_MAP.
    """
    entries = REPORT_MODEL_MAP.get(report_type, [])
    if not entries:
        raise ValueError(f"Unknown report type: '{report_type}'")

    loaded = []
    for disease_label, pkl_name in entries:
        try:
            model = _load_disease_model(pkl_name)
            loaded.append((disease_label, pkl_name, model))
        except FileNotFoundError as exc:
            logger.error(exc)
            # Insert None placeholder so indices stay aligned
            loaded.append((disease_label, pkl_name, None))

    return loaded


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def _run_individual_models(
    loaded_models: List[Tuple[str, str, Any]],
    X: np.ndarray,
) -> Tuple[List[str], np.ndarray]:
    """
    Runs every individual disease model on the feature vector X.

    Returns
    -------
    disease_labels : list of str
    raw_probas     : 1-D numpy array, positive-class probability per disease
    """
    disease_labels: List[str] = []
    raw_probas: List[float] = []

    for disease_label, pkl_name, model in loaded_models:
        disease_labels.append(disease_label)

        if model is None:
            # Model file missing — default to 0.0
            raw_probas.append(0.0)
            continue

        try:
            if hasattr(model, "predict_proba"):
                proba = float(model.predict_proba(X)[0][1])  # positive class
            else:
                proba = float(model.predict(X)[0])
        except Exception as exc:
            logger.warning(f"Inference failed for '{pkl_name}': {exc}")
            proba = 0.0

        raw_probas.append(proba)
        logger.debug(f"  {disease_label}: raw_proba={proba:.4f}")

    return disease_labels, np.array(raw_probas, dtype=np.float32)


def _apply_ensemble(
    report_type: str,
    raw_probas: np.ndarray,
) -> np.ndarray:
    """
    Passes raw XGBoost probabilities through the neural network ensemble
    meta-learner for the given report type.

    If no trained weights exist the ensemble is a transparent pass-through
    (returns raw_probas unchanged).
    """
    ensemble_path = get_ensemble_path(report_type)
    n_diseases = len(raw_probas)
    ensemble = load_ensemble(report_type, ensemble_path, n_diseases)
    return ensemble.predict(raw_probas)


# ---------------------------------------------------------------------------
# SHAP & recommendations
# ---------------------------------------------------------------------------

def _compute_shap(
    model: Any,
    X: np.ndarray,
    feature_names: List[str],
) -> Optional[Dict]:
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        sv = explainer.shap_values(X)
        values = sv[0] if isinstance(sv, list) else sv[0]
        return {name: round(float(v), 6) for name, v in zip(feature_names, values)}
    except Exception as exc:
        logger.debug(f"SHAP skipped: {exc}")
        return None


def _top_factors(
    shap_values: Optional[Dict],
    feature_names: List[str],
    n: int = 5,
) -> List[Dict]:
    if not shap_values:
        return []
    top = sorted(shap_values.items(), key=lambda kv: abs(kv[1]), reverse=True)[:n]
    return [
        {
            "feature":   k,
            "impact":    v,
            "direction": "increases" if v > 0 else "decreases",
        }
        for k, v in top
    ]


def _score_to_level(score: float) -> str:
    if score >= RISK_THRESHOLDS["critical"]:  return "critical"
    if score >= RISK_THRESHOLDS["high"]:      return "high"
    if score >= RISK_THRESHOLDS["moderate"]:  return "moderate"
    return "low"


def _recommendations(risk_level: str, risks: Dict[str, float]) -> List[str]:
    base = {
        "low":      ["Maintain current lifestyle. Annual check-up recommended."],
        "moderate": [
            "Consult your doctor within 3 months.",
            "Consider dietary adjustments.",
            "Increase physical activity.",
        ],
        "high": [
            "Schedule a doctor appointment soon.",
            "Review medication and diet with your physician.",
            "Monitor key metrics more frequently.",
        ],
        "critical": [
            "Seek immediate medical attention.",
            "Do not delay consulting a healthcare professional.",
        ],
        "unknown": ["Please consult a healthcare professional for interpretation."],
    }

    recs = list(base.get(risk_level, base["unknown"]))

    if risks.get("heart_disease", 0) > 0.6:
        recs.append("High cardiovascular risk — lipid management advised.")
    if risks.get("diabetes", 0) > 0.6:
        recs.append("Elevated diabetes risk — fasting glucose test recommended.")
    if risks.get("renal_failure", 0) > 0.6:
        recs.append("Elevated renal risk — nephrology consultation advised.")
    if risks.get("hepatitis", 0) > 0.6:
        recs.append("Hepatitis marker elevated — further liver panel recommended.")
    if risks.get("thyroid_disorder", 0) > 0.6:
        recs.append("Thyroid irregularity detected — endocrinology referral advised.")

    return recs


# ---------------------------------------------------------------------------
# Main prediction class
# ---------------------------------------------------------------------------

class RiskPredictor:
    """
    High-level wrapper for disease risk prediction.

    For each report type the predictor:
      1. Loads every individual disease model (e.g. diabetes.pkl, anemia.pkl,
         infection.pkl for a blood report).
      2. Builds a shared feature vector from the extracted lab metrics.
      3. Runs each XGBoost binary classifier independently.
      4. Passes all raw probabilities through the Neural Network ensemble
         meta-learner (ensemble_{report_type}.pkl) for calibration.
      5. Computes SHAP explanations from the highest-risk disease model.
      6. Returns aggregated risks, risk_level, key_factors, recommendations.
    """

    def __init__(self):
        pass  # models are cached globally

    def predict(
        self,
        metrics: Dict[str, Any],
        report_type: str = "blood",
    ) -> Dict[str, Any]:

        # ── 1. Load all disease models for this report type ──────────────
        try:
            loaded_models = _load_all_models(report_type)
        except ValueError as exc:
            logger.error(exc)
            return self._fallback_response()

        # ── 2. Validate OCR metrics coverage, then build feature vector ──
        metrics, coverage = validate_ocr_metrics(metrics, report_type)
        feature_vector, feature_names = build_feature_vector(metrics, report_type)
        X = np.array(feature_vector, dtype=np.float32).reshape(1, -1)

        # ── 3. Run each individual disease model ─────────────────────────
        disease_labels, raw_probas = _run_individual_models(loaded_models, X)

        logger.info(
            f"[{report_type}] Individual XGBoost probas: "
            + ", ".join(
                f"{lbl}={p:.4f}" for lbl, p in zip(disease_labels, raw_probas)
            )
        )

        # ── 4. Neural network ensemble: calibrate / combine ───────────────
        final_probas = _apply_ensemble(report_type, raw_probas)

        logger.info(
            f"[{report_type}] Ensemble calibrated probas: "
            + ", ".join(
                f"{lbl}={p:.4f}" for lbl, p in zip(disease_labels, final_probas)
            )
        )

        # ── 5. Build output risks dict ────────────────────────────────────
        risks: Dict[str, float] = {
            label: round(float(p), 4)
            for label, p in zip(disease_labels, final_probas)
        }

        max_risk = max(risks.values()) if risks else 0.0
        risk_level = _score_to_level(max_risk)

        # ── 6. SHAP on the highest-risk disease model ─────────────────────
        shap_values: Optional[Dict] = None
        if risks:
            top_disease = max(risks, key=risks.get)
            top_idx = disease_labels.index(top_disease)
            _, _, top_model = loaded_models[top_idx]
            if top_model is not None:
                shap_values = _compute_shap(top_model, X, feature_names)

        key_factors = _top_factors(shap_values, feature_names)

        return {
            "risks":           risks,
            "risk_level":      risk_level,
            "key_factors":     key_factors,
            "recommendations": _recommendations(risk_level, risks),
            "shap_values":     shap_values,
            "model_version":   f"neural-ensemble-{report_type}-v1",
            # OCR quality metadata
            "ocr_coverage":    coverage,
            # Raw pre-ensemble scores exposed for debugging / training
            "raw_xgb_probas":  {
                label: round(float(p), 4)
                for label, p in zip(disease_labels, raw_probas)
            },
        }

    @staticmethod
    def _fallback_response() -> Dict[str, Any]:
        return {
            "risks":           {},
            "risk_level":      "unknown",
            "key_factors":     [],
            "recommendations": [
                "Model not available. Please consult a healthcare professional."
            ],
            "shap_values":     None,
            "model_version":   "none",
            "raw_xgb_probas":  {},
        }
