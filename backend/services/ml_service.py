"""Machine learning service helpers."""

# Metrics where a LOWER value is clinically better
_LOWER_IS_BETTER = {
    "glucose", "hba1c", "total_cholesterol", "ldl", "triglycerides",
    "alt", "ast", "bilirubin", "creatinine", "bun", "uric_acid",
    "tsh", "cortisol", "insulin", "ferritin",
}

# Metrics where a HIGHER value is clinically better
_HIGHER_IS_BETTER = {
    "hdl", "egfr", "vitamin_d", "testosterone", "hemoglobin",
    "albumin", "t3", "t4",
}


def _lower_is_better(metric_name: str) -> bool:
    name = metric_name.lower().replace(" ", "_").replace("-", "_")
    if name in _LOWER_IS_BETTER:
        return True
    if name in _HIGHER_IS_BETTER:
        return False
    return False  # default: neutral / higher not explicitly better


class ReportComparator:
    """Compares extracted metrics between two same-type reports."""

    def compare_medical_reports(self, report_1: dict, report_2: dict) -> dict:
        """
        Compare extracted_metrics from two reports.

        Args:
            report_1: dict with keys 'structured_metrics', 'report_type', 'created_at'
            report_2: same structure

        Returns:
            dict with 'metrics', 'significant_changes', 'summary'
        """
        metrics_1 = report_1.get("structured_metrics") or {}
        metrics_2 = report_2.get("structured_metrics") or {}

        shared_keys = set(metrics_1.keys()) & set(metrics_2.keys())

        metric_results = []
        for key in sorted(shared_keys):
            try:
                v1 = float(metrics_1[key])
                v2 = float(metrics_2[key])
            except (TypeError, ValueError):
                continue

            diff = round(v1 - v2, 4)
            pct  = round((diff / v2) * 100, 2) if v2 != 0 else 0.0
            lib  = _lower_is_better(key)
            # improved = moved in the beneficial direction compared to report_2 (baseline)
            improved = (diff < 0) if lib else (diff > 0)

            metric_results.append({
                "name":            key,
                "r1_val":          v1,
                "r2_val":          v2,
                "diff":            diff,
                "percent":         pct,
                "lower_is_better": lib,
                "improved":        improved,
                "is_significant":  abs(pct) > 5,
            })

        improved_count  = sum(1 for m in metric_results if m["improved"])
        worsened_count  = sum(1 for m in metric_results if not m["improved"] and m["is_significant"])
        unchanged_count = len(metric_results) - improved_count - worsened_count

        if improved_count > worsened_count:
            trend = "IMPROVING"
        elif worsened_count > improved_count:
            trend = "WORSENING"
        else:
            trend = "STABLE"

        significant = [m for m in metric_results if m["is_significant"]]

        risks_1 = report_1.get("prediction_risks", {})
        risks_2 = report_2.get("prediction_risks", {})
        shared_diseases = set(risks_1.keys()) & set(risks_2.keys())

        risk_comparison = []
        for disease in sorted(shared_diseases):
            r1 = round(float(risks_1[disease]), 4)
            r2 = round(float(risks_2[disease]), 4)
            diff = round(r1 - r2, 4)
            improved = diff < 0  # lower disease risk is always better
            risk_comparison.append({
                "disease":  disease,
                "r1_risk":  r1,
                "r2_risk":  r2,
                "diff":     diff,
                "improved": improved,
            })

        return {
            "metrics":             metric_results,
            "significant_changes": significant,
            "risk_comparison":     risk_comparison,
            "summary": {
                "overall_trend":  trend,
                "improved_count":  improved_count,
                "worsened_count":  worsened_count,
                "unchanged_count": unchanged_count,
                "total_metrics":   len(metric_results),
            },
        }
