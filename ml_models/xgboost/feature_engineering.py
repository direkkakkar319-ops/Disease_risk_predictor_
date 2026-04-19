import logging
from typing import Any, Dict, List, Tuple, TypedDict

"""
Logger Set-up
"""
logger = logging.getLogger(__name__)


class MetricsCoverage(TypedDict):
    """Returned by validate_ocr_metrics — describes extraction quality."""
    found: List[str]       # keys successfully extracted from OCR
    missing: List[str]     # keys not found → will use default values
    coverage_pct: float    # percentage of expected features that were found

"""
Unit Normalization Data
"""
UNIT_NORMALIZATION = {
    "glucose": ("mg/dL", {"mmol/L": 18.0182}),
    "bun": ("mg/dL", {"mmol/L": 2.8}),
    "creatinine": ("mg/dL", {"µmol/L": 0.0113}),

    "vitamin_d": ("ng/mL", {"nmol/L": 2.496}),
    "testosterone": ("ng/dL", {"nmol/L": 28.8}),

    "total_cholesterol": ("mg/dL", {"mmol/L": 38.67}),
    "ldl": ("mg/dL", {"mmol/L": 38.67}),
    "hdl": ("mg/dL", {"mmol/L": 38.67}),
    "triglycerides": ("mg/dL", {"mmol/L": 88.57}),
}

"""
Feature definitions per report
"""

BLOOD_FEATURES: List[Tuple[str, str, float]] = [
    ("wbc",        "wbc",        7.0),
    ("rbc",        "rbc",        4.9),
    ("hemoglobin", "hemoglobin", 14.0),
    ("hematocrit", "hematocrit", 43.0),
    ("platelets",  "platelets",  250.0),
    ("glucose",    "glucose",    90.0),
    ("creatinine", "creatinine", 1.0),
    ("bun",        "bun",        15.0)
]

LIPID_FEATURES: List[Tuple[str, str, float]] = [
    ("total_cholesterol", "total_cholesterol", 180.0),
    ("hdl",               "hdl",               55.0),
    ("ldl",               "ldl",               100.0),
    ("triglycerides",     "triglycerides",     130.0),
    ("vldl",              "vldl",               26.0)
]

VITAMIND_FEATURES: List[Tuple[str, str, float]] = [
    ("vitamin_d", "vitamin_d", 30.0)    
]

HORMONE_FEATURES: List[Tuple[str, str, float]] = [
    ("tsh", "tsh", 2.5),
    ("t3", "t3", 1.2),
    ("t4", "t4", 8.0),

    ("testosterone", "testosterone", 500.0),
    ("estradiol", "estradiol", 25.0),
    ("progesterone", "progesterone", 1.0),

    ("prolactin", "prolactin", 10.0),
    ("lh", "lh", 5.0),
    ("fsh", "fsh", 5.0),
    ("cortisol", "cortisol", 10.0)
]

KIDNEY_FEATURES: List[Tuple[str, str, float]] = [
    ("creatinine", "creatinine", 1.0),
    ("bun", "bun", 15.0),
    ("urea", "urea", 25.0),
    ("uric_acid", "uric_acid", 5.0),
    ("egfr", "egfr", 90.0)  
]

LIVER_FEATURES: List[Tuple[str, str, float]] = [
    ("alt", "alt", 25.0),
    ("ast", "ast", 25.0),
    ("alp", "alp", 100.0),
    ("bilirubin_total", "bilirubin_total", 1.0),
    ("bilirubin_direct", "bilirubin_direct", 0.3),
    ("albumin", "albumin", 4.5),
    ("total_protein", "total_protein", 7.0)   
]

GENERAL_FEATURES: List[Tuple[str, str, float]] = []

FEATURE_MAP: Dict[str, List[Tuple[str, str, float]]] = {
    "blood": BLOOD_FEATURES,
    "lipid": LIPID_FEATURES,
    "vitamin_d": VITAMIND_FEATURES,
    "hormone": HORMONE_FEATURES,
    "kidney": KIDNEY_FEATURES,
    "liver": LIVER_FEATURES,
    "general": GENERAL_FEATURES
}

"""
Helper Functions
"""

def infer_unit(key: str, value: float) -> str:
    """
    Automatically detects unit when missing based on value ranges.
    """
    if key == "glucose":
        return "mmol/L" if value < 20 else "mg/dL"

    if key == "vitamin_d":
        return "nmol/L" if value > 200 else "ng/mL"
    
    return "unknown"

def validate_value(key: str, value: float) -> float:

    if key == "glucose" and not (20 <= value <= 600):
        return 90.0

    if key == "hemoglobin" and not (3 <= value <= 25):
        return 14.0

    if key == "creatinine" and not (0.1 <= value <= 15):
        return 1.0

    return value

"""
Public Functions
"""

def normalize_units(metrics: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {}

    for key, entry in metrics.items():

        if isinstance(entry, dict):
            value = entry.get("value")
            unit = entry.get("unit")

            if value is None:
                continue

            if key in UNIT_NORMALIZATION:
                std_unit, conversions = UNIT_NORMALIZATION[key]

                # infer unit if missing
                if unit is None:
                    unit = infer_unit(key, float(value))

                if unit == std_unit:
                    normalized[key] = {"value": float(value), "unit": std_unit}

                elif unit in conversions:
                    normalized[key] = {
                        "value": float(value) * conversions[unit],
                        "unit": std_unit
                    }

                else:
                    # fallback (important)
                    normalized[key] = {
                        "value": float(value),
                        "unit": std_unit
                    }

            else:
                normalized[key] = {"value": float(value), "unit": unit}

        else:
            normalized[key] = {"value": float(entry), "unit": "unknown"}

    return normalized

def validate_ocr_metrics(
    metrics: Dict[str, Any],
    report_type: str,
) -> Tuple[Dict[str, Any], MetricsCoverage]:
    """
    Validates OCR-extracted metrics against the expected features for the
    given report type.

    Purpose
    -------
    After PaddleOCR runs, not every metric may have been found (low image
    quality, unusual formatting, missing fields).  This function:
      - Identifies which expected features were actually extracted.
      - Identifies which will fall back to their default values.
      - Logs a summary so prediction quality is transparent.
      - Returns the original metrics unchanged (no mutation) alongside
        a coverage report.

    Parameters
    ----------
    metrics     : The `structured_metrics` dict returned by OCRRunner,
                  format: {key: {"value": float, "unit": str, "source": str}}
    report_type : One of blood / lipid / vitamin_d / hormone / kidney / liver

    Returns
    -------
    (metrics, coverage)
      metrics   — original dict, passed through unchanged
      coverage  — MetricsCoverage with found/missing/coverage_pct
    """
    feature_defs = FEATURE_MAP.get(report_type, GENERAL_FEATURES)
    expected_keys = [feat_name for feat_name, _, _ in feature_defs]

    found: List[str] = []
    missing: List[str] = []

    for key in expected_keys:
        entry = metrics.get(key)
        if entry is not None:
            # Accept both dict-style {"value": ...} and raw float
            if isinstance(entry, dict):
                val = entry.get("value")
                if val is not None:
                    found.append(key)
                    continue
            else:
                try:
                    float(entry)
                    found.append(key)
                    continue
                except (TypeError, ValueError):
                    pass
        missing.append(key)

    total = len(expected_keys)
    coverage_pct = round((len(found) / total * 100) if total > 0 else 0.0, 1)

    coverage: MetricsCoverage = {
        "found":        found,
        "missing":      missing,
        "coverage_pct": coverage_pct,
    }

    # Always log — gives visibility into OCR quality per prediction
    logger.info(
        f"[{report_type}] OCR metric coverage: {len(found)}/{total} "
        f"({coverage_pct}%)  |  "
        f"found={found}  |  "
        f"missing (will use defaults)={missing}"
    )

    if coverage_pct < 50.0:
        logger.warning(
            f"[{report_type}] Low OCR coverage ({coverage_pct}%). "
            "Prediction reliability may be reduced. "
            "Check image quality or report format."
        )

    return metrics, coverage


def build_feature_vector(
    metrics: Dict[str, Any],
    report_type: str
    ) -> Tuple[List[float], List[str]]:

    feature_defs = FEATURE_MAP.get(report_type, GENERAL_FEATURES)

    normalized_metrics = normalize_units(metrics)

    feature_vector = []
    feature_names = []

    for feat_name, metrics_key, default in feature_defs:

        entry = normalized_metrics.get(metrics_key)

        if isinstance(entry, dict):
            value = float(entry.get("value", default))
        elif entry is not None:
            value = float(entry)
        else:
            value = default

        value = validate_value(metrics_key, value)

        feature_vector.append(value)
        feature_names.append(feat_name)

    return feature_vector, feature_names