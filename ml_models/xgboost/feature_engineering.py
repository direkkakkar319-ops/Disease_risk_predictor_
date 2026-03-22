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
