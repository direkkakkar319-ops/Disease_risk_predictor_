from typing import Any, Dict, List, Tuple

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

HORMONE_FEATURES: List[Tuple[str, str, float]]=[
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

LIVER_FEATURES: List[Tuple[str, str, float]]=[
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
    "blood":BLOOD_FEATURES,
    "lipid":LIPID_FEATURES,
    "vitamin_d":VITAMIND_FEATURES,
    "hormone":HORMONE_FEATURES,
    "kidney":KIDNEY_FEATURES,
    "liver":LIVER_FEATURES,
    "general":GENERAL_FEATURES
}

"""
Public Function
"""
def build_feature_vector(
    metrics:Dict[str, Any],
    report_type:str,
    ) -> Tuple[List[float], List[str]]:
    """
    Convert parsed medical report metrics into a flat numeric feature vector.

    This function:
        1. Selects the correct features for the given report type
        2. Extracts values from parsed metrics
        3. Fills missing values with defaults
        4. Returns a clean vector ready for model prediction
    
    Returns:
        feature_vector: list[float]
        feature_names: list[str]
    """

    """Step-1 Get feature definitions for this report type"""
    feature_defs = FEATURE_MAP.get(report_type, GENERAL_FEATURES)

    feature_vector:List[float]=[]
    feature_names:List[str]=[]

    """Step-2 Iterate over all expected features"""
    for feat_name, metrics_key, default in feature_defs:

        entry = metrics.get(metrics_key)

        """Step-3 Extract vlaue safely"""
        if entry is isinstance(entry, dict):
            value=float(entry.get("value", default))
        else:
            value=default  

        """Step-4 Append to feature vector"""
        feature_vector.append(value)

        feature_names.append(feat_name)

    """Step-5 Return final ML-ready data"""
    return feature_vector, feature_names