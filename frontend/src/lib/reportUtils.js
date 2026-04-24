// ─── reportUtils.js — Shared data-shaping helpers ────────────────────────────
//
// The backend returns raw ML output (float 0-1 risk scores, arbitrary metric
// keys like "glucose", "wbc"). These helpers convert that into display-ready
// objects used by both Results.jsx and History.jsx.
//
// Key concepts:
//  • REFERENCE_RANGES  — hard-coded clinical normal ranges shown next to each biomarker
//  • riskToStatus()    — maps a 0-1 float to a human label (low/moderate/high/critical)
//                        Thresholds mirror the backend: critical≥0.85, high≥0.65, moderate≥0.40
//  • transformResult() — the main adapter: converts a raw /api/status response into
//                        { riskMetrics, biomarkers, riskLevel, recommendations, keyFactors }
//                        This shape is consumed by Results.jsx for the live dashboard.

export const REFERENCE_RANGES = {
    glucose: '70-100 mg/dL',
    hemoglobin: '12-17 g/dL',
    hematocrit: '36-52 %',
    wbc: '4.5-11 ×10³/µL',
    rbc: '4.2-5.9 ×10⁶/µL',
    platelets: '150-400 ×10³/µL',
    creatinine: '0.6-1.2 mg/dL',
    bun: '7-20 mg/dL',
    total_cholesterol: '<200 mg/dL',
    hdl: '>40 mg/dL',
    ldl: '<100 mg/dL',
    triglycerides: '<150 mg/dL',
    vldl: '<30 mg/dL',
    alt: '7-56 U/L',
    ast: '10-40 U/L',
    alp: '44-147 U/L',
    bilirubin_total: '0.2-1.2 mg/dL',
    albumin: '3.5-5.0 g/dL',
    vitamin_d: '20-50 ng/mL',
    tsh: '0.4-4.0 mIU/L',
    testosterone: '300-1000 ng/dL',
    egfr: '>60 mL/min/1.73m²',
};

// Maps a 0-1 float risk score to a display label.
// These thresholds are intentionally mirrored in ml_models/model_utils.py RISK_THRESHOLDS.
export function riskToStatus(value) {
    if (value >= 0.85) return 'critical';
    if (value >= 0.65) return 'high';
    if (value >= 0.40) return 'moderate';
    return 'low';
}

// Converts snake_case metric keys (e.g. "heart_disease") to "Heart Disease".
export function formatLabel(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Transforms the raw /api/status/{id} response into a display-ready object.
//
// Input shape (statusData):
//   { result: { risks, risk_level, key_factors, recommendations, ... },
//     report_type, filename, extracted_metrics }
//
// Output shape:
//   { riskMetrics: [{ name, value(%), status, trend }],
//     biomarkers:  [{ name, value, unit, range, status }],
//     riskLevel, recommendations, keyFactors, reportType, filename }
//
// riskMetrics drives the radar chart in Results.jsx (each axis = one disease).
// biomarkers shows the top-4 raw lab values extracted by OCR.
export function transformResult(statusData) {
    const { result, report_type, filename, extracted_metrics } = statusData;
    if (!result) return null;

    const { risks = {}, risk_level, key_factors = [], recommendations = [] } = result;

    // risks is a dict like { diabetes: 0.23, anemia: 0.67 }
    // Convert to percentage integers for the progress bars and radar chart.
    const riskMetrics = Object.entries(risks).map(([name, value]) => ({
        name: formatLabel(name),
        value: Math.round(value * 100),
        status: riskToStatus(value),
        trend: 'stable',
    }));

    // extracted_metrics comes from PaddleOCR: { glucose: { value: 95, unit: "mg/dL" }, ... }
    // We only show the first 4 to keep the UI compact.
    const biomarkers = Object.entries(extracted_metrics || {})
        .slice(0, 4)
        .map(([key, entry]) => {
            const value = typeof entry === 'object' ? entry?.value : entry;
            const unit = typeof entry === 'object' ? (entry?.unit ?? '') : '';
            return {
                name: formatLabel(key),
                value: value ?? '—',
                unit,
                range: REFERENCE_RANGES[key] ?? 'N/A',
                status: 'normal',
            };
        });

    return { riskMetrics, biomarkers, riskLevel: risk_level, recommendations, keyFactors: key_factors, reportType: report_type, filename };
}
