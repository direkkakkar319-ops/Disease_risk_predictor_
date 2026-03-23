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

"""
Main Prediction Class
"""
class RiskPredictor:
    """
    High-level wrapper for diesase risk prediction
    """     
    def predict(
        self,
        metrics:Dict[str, Any],
        report_type:str="blood")->Dict[str, Any]:
        """
        Parameters:
            1. metrics:dict --> from OCRRunner.process_report()
            2. report_type:str --> "blood"|"lipid"|"general"....\
        
        Steps:-
            1. Loads the data set
            2. Converts input to feature vector
            3. Runs model prediction
            4. Maps outputs to diseases
            5. Determines overall risks level
            6. Explanability(SHAP)
        """

        try:
            model = _load_model(report_type)
        except FileNotFoundError as exc:
            logger.error(exc)
            return self._fallback_responses()
        
        feature_vector, feature_names = build_feature_vector(metrics, report_type)

        X = np.array(feature_vector).reshape(1, -1)

        try:
            proba = model.prediction_proba(X)[0]
        except AttributeError:
            proba = [float(model.predict(X)[0])]
        
        disease_lables = _get_disease_lables(report_type)
        risks:Dict[str, float]={
            label: round(float(p), 4)
            for label, p in zip(disease_lables, proba)
        }

        max_risk = max(risks.values()) if risks else 0.0
        risk_level = _score_to_level(max_risk)

        shap_values = _compute_shape(model, X, feature_names)
        key_factors = _top_factors(shap_values, feature_names)

        return {
            "risks": risks,
            "risk_level": risk_level,
            "key_factors": key_factors,
            "recommendations": _recommendations(risk_level, risks),
            "shap_values": shap_values,
            "model_version": "xgboost-v1",
        }
        
        @staticmethod
        def _fallback_response() -> Dict[str, Any]:
            """
            Used when model is unavailable.
            Prevents system crash and gives safe output.
            """
            return {
                "risks": {},
                "risk_level": "unknown",
                "key_factors": [],
                "recommendations": [
                    "Model not available. Please consult a healthcare professional."
                ],
                "shap_values": None,
                "model_version": "none",
        }

"""
Internal Helper Functions
"""
def _get_disease_lables(report_type:str)->List[str]:
    """
    Maps report type
    """
    return {
        "blood":   [
            "diabetes",
            "anemia",
            "infection"
        ],
        "lipid":   [
            "heart_disease", 
            "stroke"
        ],
        "vitamin_d": ["vitamin_d_deficiency"],
        "hormone": [
            "thyroid_disorder",
            "testosterone_imbalance",
            "hormonal_imbalance"
        ],
        "renal_failure"
        "kidney": [
            "kidney_disease",
            "renal_failure"
        ],
        "liver": [
            "liver_disease",
            "fatty_liver",
            "hepatitis"
        ],
        "general": ["general_risk"]  
    }.get(report_type, ["general_risk"])

def _score_to_level(score:float)->str:
    """
    It converts the model’s numeric risk score into a human-readable risk 
    category like "low", "moderate", "high", or "critical" based on predefined 
    thresholds in `RISK_THRESHOLDS`
    """
    if score >= RISK_THRESHOLDS["critical"]:  return "critical"
    if score >= RISK_THRESHOLDS["high"]:      return "high"
    if score >= RISK_THRESHOLDS["moderate"]:  return "moderate"
    return "low"

def _compute_shap(model, X:np.ndarray, feature_names:List[str]) -> Optional[Dict]:
    """
    It computes feature-wise contribution values(SHAP) to
    explain how each input feature influenced the model 
    prediction
    """
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        sv = explainer.shap_values(X)
        return {name: round(float(v), 6) for name, v in zip(feature_names, values)}
    except Exception as exc:
        logger.debug(f"SHAP skipped: {exc}")
        return None

def _top_factors(
    shap_values:Optional[Dict],
    feature_names:List[str],
    n:int=5
    ) -> List[Dict]:
    """
    It selects top N most impactful features from SHAP values
    and shows how each one influences the prediction
    Stored in `key_factors`
    """
    if not shap_values:
        return []
    
    top = sorted(shap_values.items(), key=lambda ky: abs(kv[1]), reverse=True)[:n]

    return [
        {
            "feature":   k,
            "impact":    v,
            "direction": "increases" if v > 0 else "decreases"        
        }
    ]

def _recommendations(
    risk_level:str,
    risks:Dict[str, float]
    ):
    """
    It generates health recommendations based on overall
    risk level and adds specific advice if certain disease
    riks are high
    Returned in `predict()` like `recommendations:_recommendations(.....)`
    """
    base={
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
        
        "unknown": ["Please consult a healthcare professional for interpretation."]        
    }

    recs = list(base.get(risk_level, base["unknown"]))

    if risks.get("heart_disease", 0)>0.6:
        recs.append("High cardiovascular risk - lipid managenent adviced")
    if risks.get("diabities", 0)>0.6:
        recs.append("Elevated diabetes risk - fasting glucose test recommended.")       
    
    return recs