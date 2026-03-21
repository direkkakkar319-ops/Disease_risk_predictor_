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