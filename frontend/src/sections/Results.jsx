import { useEffect, useRef, useState, useCallback } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

// ── Demo / fallback data (shown when no real report is loaded) ────────────
const DEMO_RISK_METRICS = [
    { name: 'Cardiovascular', value: 23, status: 'low',      trend: 'stable' },
    { name: 'Diabetes Type 2', value: 67, status: 'moderate', trend: 'up'     },
    { name: 'Hypertension',    value: 45, status: 'moderate', trend: 'down'   },
    { name: 'Liver Function',  value: 12, status: 'low',      trend: 'stable' },
    { name: 'Kidney Health',   value: 89, status: 'high',     trend: 'up'     },
];

const DEMO_BIOMARKERS = [
    { name: 'Glucose',        value: 110,       unit: 'mg/dL', range: '70-100',  status: 'elevated' },
    { name: 'Cholesterol',    value: 195,       unit: 'mg/dL', range: '<200',    status: 'normal'   },
    { name: 'HbA1c',          value: 6.2,       unit: '%',     range: '<5.7',    status: 'elevated' },
    { name: 'Blood Pressure', value: '135/85',  unit: 'mmHg',  range: '<120/80', status: 'elevated' },
];

// ── Reference ranges for common biomarkers ────────────────────────────────
const REFERENCE_RANGES = {
    glucose:          '70-100 mg/dL',
    hemoglobin:       '12-17 g/dL',
    hematocrit:       '36-52 %',
    wbc:              '4.5-11 ×10³/µL',
    rbc:              '4.2-5.9 ×10⁶/µL',
    platelets:        '150-400 ×10³/µL',
    creatinine:       '0.6-1.2 mg/dL',
    bun:              '7-20 mg/dL',
    total_cholesterol:'<200 mg/dL',
    hdl:              '>40 mg/dL',
    ldl:              '<100 mg/dL',
    triglycerides:    '<150 mg/dL',
    vldl:             '<30 mg/dL',
    alt:              '7-56 U/L',
    ast:              '10-40 U/L',
    alp:              '44-147 U/L',
    bilirubin_total:  '0.2-1.2 mg/dL',
    albumin:          '3.5-5.0 g/dL',
    vitamin_d:        '20-50 ng/mL',
    tsh:              '0.4-4.0 mIU/L',
    testosterone:     '300-1000 ng/dL',
    egfr:             '>60 mL/min/1.73m²',
};

// ── Helpers ───────────────────────────────────────────────────────────────
function riskToStatus(value) {
    if (value >= 0.85) return 'critical';
    if (value >= 0.65) return 'high';
    if (value >= 0.40) return 'moderate';
    return 'low';
}

function formatLabel(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function transformResult(statusData) {
    const { result, report_type, filename, extracted_metrics } = statusData;
    if (!result) return null;

    const { risks = {}, risk_level, key_factors = [], recommendations = [] } = result;

    const riskMetrics = Object.entries(risks).map(([name, value]) => ({
        name:   formatLabel(name),
        value:  Math.round(value * 100),
        status: riskToStatus(value),
        trend:  'stable',
    }));

    // Build biomarkers from extracted_metrics
    const biomarkers = Object.entries(extracted_metrics || {})
        .slice(0, 4)
        .map(([key, entry]) => {
            const value = typeof entry === 'object' ? entry?.value : entry;
            const unit  = typeof entry === 'object' ? (entry?.unit ?? '') : '';
            return {
                name:   formatLabel(key),
                value:  value ?? '—',
                unit,
                range:  REFERENCE_RANGES[key] ?? 'N/A',
                status: 'normal',
            };
        });

    return { riskMetrics, biomarkers, riskLevel: risk_level, recommendations, keyFactors: key_factors, reportType: report_type, filename };
}

const STEP_LABELS = {
    uploaded:       'Report received',
    preprocessing:  'Preprocessing image…',
    ocr_complete:   'OCR complete — running models…',
    predicting:     'Running disease models…',
    completed:      'Analysis complete',
    failed:         'Analysis failed',
};

// ── Component ─────────────────────────────────────────────────────────────
export function Results() {
    const canvasRef = useRef(null);
    const pollingRef = useRef(null);

    const [reportData,   setReportData]   = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [loadingStep,  setLoadingStep]  = useState('');
    const [pollError,    setPollError]    = useState(null);
    const [selectedMetric, setSelectedMetric] = useState(null);

    const riskMetrics = reportData ? reportData.riskMetrics : DEMO_RISK_METRICS;
    const biomarkers  = reportData ? reportData.biomarkers  : DEMO_BIOMARKERS;

    // Keep selectedMetric in sync when data changes
    useEffect(() => {
        setSelectedMetric(riskMetrics[0] ?? null);
    }, [riskMetrics]);

    // ── Polling ───────────────────────────────────────────────────────────
    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback((reportId) => {
        stopPolling();
        setLoading(true);
        setPollError(null);
        setLoadingStep('uploaded');

        let attempts = 0;
        pollingRef.current = setInterval(async () => {
            attempts++;
            if (attempts > 60) {
                stopPolling();
                setLoading(false);
                localStorage.removeItem('healthinsight_pending_report_id');
                setPollError('Analysis timed out. Please try uploading again.');
                return;
            }

            try {
                const res = await apiFetch(`/api/status/${reportId}`);
                // 401 after refresh attempt = user logged out
                if (res.status === 401) { stopPolling(); setLoading(false); return; }
                if (!res.ok) return;
                const data = await res.json();

                setLoadingStep(data.status);

                if (data.status === 'completed' && data.result) {
                    stopPolling();
                    localStorage.removeItem('healthinsight_pending_report_id');
                    const transformed = transformResult(data);
                    if (transformed) setReportData(transformed);
                    setLoading(false);
                } else if (data.status === 'failed') {
                    stopPolling();
                    setLoading(false);
                    localStorage.removeItem('healthinsight_pending_report_id');
                    setPollError('Report analysis failed. Please check the image quality and try again.');
                }
            } catch {
                // keep polling
            }
        }, 3000);
    }, [stopPolling]);

    // Listen for upload events from UploadReportModal
    useEffect(() => {
        const handler = (e) => {
            const id = e.detail?.reportIds?.[0];
            if (id) startPolling(id);
        };
        window.addEventListener('reportUploaded', handler);
        return () => {
            window.removeEventListener('reportUploaded', handler);
            stopPolling();
        };
    }, [startPolling, stopPolling]);

    // Resume poll after page refresh
    useEffect(() => {
        const pending = localStorage.getItem('healthinsight_pending_report_id');
        if (pending) startPolling(parseInt(pending, 10));
    }, [startPolling]);

    // ── Canvas radar chart ────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !riskMetrics.length) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width  = rect.width  * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resizeCanvas();

        const width   = canvas.width  / window.devicePixelRatio;
        const height  = canvas.height / window.devicePixelRatio;
        const centerX = width  / 2;
        const centerY = height / 2;
        const radius  = Math.min(width, height) / 2 - 40;

        ctx.clearRect(0, 0, width, height);

        // Grid circles
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
            ctx.strokeStyle = i === 5 ? '#1a1a1a' : '#d4d4c8';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Axes + labels
        const angleStep = (Math.PI * 2) / riskMetrics.length;
        riskMetrics.forEach((metric, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#d4d4c8';
            ctx.lineWidth = 1;
            ctx.stroke();

            const labelX = centerX + Math.cos(angle) * (radius + 25);
            const labelY = centerY + Math.sin(angle) * (radius + 25);
            ctx.fillStyle = '#1a1a1a';
            ctx.font = '10px "IBM Plex Mono"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(metric.name, labelX, labelY);
        });

        // Data polygon
        ctx.beginPath();
        riskMetrics.forEach((metric, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const value = metric.value / 100;
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle   = 'rgba(249,115,22,0.2)';
        ctx.fill();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Data points
        riskMetrics.forEach((metric, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const value = metric.value / 100;
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle   = '#f97316';
            ctx.fill();
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth   = 2;
            ctx.stroke();
        });
    }, [riskMetrics]);

    // ── Helpers ───────────────────────────────────────────────────────────
    const getStatusColor = (status) => {
        switch (status) {
            case 'low':
            case 'normal':    return '#22c55e';
            case 'moderate':
            case 'elevated':  return '#f97316';
            case 'high':
            case 'critical':  return '#ef4444';
            default:          return '#1a1a1a';
        }
    };

    const recommendation = reportData
        ? (reportData.recommendations?.[0] ?? 'No specific recommendations at this time.')
        : 'Based on your HbA1c levels, consider consulting an endocrinologist for diabetes screening.';

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="results">
            <div className="max-w-6xl mx-auto">

                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
                            {reportData ? '// SECTION: YOUR_RESULTS' : '// SECTION: SAMPLE_RESULTS'}
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">003</span>
                    </div>
                    {reportData && (
                        <span className="text-xs font-mono text-green-500 uppercase">
                            Live · {reportData.reportType} · {reportData.filename}
                        </span>
                    )}
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    {reportData ? 'Your Analysis Results' : 'Sample Analysis Results'}
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-6 max-w-2xl">
                    {reportData
                        ? `Risk analysis for your ${reportData.reportType} report. Not a medical diagnosis.`
                        : 'View a preview of what your health analysis dashboard looks like.'}
                </p>

                {/* Processing Banner */}
                {loading && (
                    <div className="mb-8 p-4 border border-brutalist-accent bg-brutalist-accent/5 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-brutalist-accent animate-spin flex-shrink-0" />
                        <div>
                            <span className="text-xs font-mono text-brutalist-accent uppercase font-bold block">
                                Analysing your report…
                            </span>
                            <span className="text-xs font-mono text-brutalist-muted">
                                {STEP_LABELS[loadingStep] ?? loadingStep}
                            </span>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {pollError && (
                    <div className="mb-8 p-4 border border-red-500 bg-red-500/5 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-xs font-mono text-red-500">{pollError}</span>
                    </div>
                )}

                {/* Risk Level Badge — real data only */}
                {reportData && (
                    <div className="mb-8 inline-flex items-center gap-3 px-4 py-2 border border-brutalist-fg">
                        <span className="text-xs font-mono text-brutalist-muted uppercase">Overall Risk</span>
                        <span
                            className="text-sm font-mono font-bold px-3 py-1 uppercase"
                            style={{
                                backgroundColor: getStatusColor(reportData.riskLevel),
                                color: 'white',
                            }}
                        >
                            {reportData.riskLevel}
                        </span>
                    </div>
                )}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-brutalist-fg">

                    {/* Risk Overview */}
                    <div className="border-b lg:border-b-0 lg:border-r border-brutalist-fg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Risk Overview</span>
                            <TrendingUp className="w-4 h-4 text-brutalist-muted" />
                        </div>
                        <div className="space-y-4">
                            {riskMetrics.map((metric) => (
                                <div
                                    key={metric.name}
                                    className={`cursor-pointer transition-all p-3 border ${
                                        selectedMetric?.name === metric.name
                                            ? 'border-brutalist-accent bg-brutalist-accent/5'
                                            : 'border-brutalist-fg/20 hover:border-brutalist-fg'
                                    }`}
                                    onClick={() => setSelectedMetric(metric)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-mono">{metric.name}</span>
                                        <span
                                            className="text-xs font-mono px-2 py-0.5"
                                            style={{ backgroundColor: getStatusColor(metric.status), color: 'white' }}
                                        >
                                            {metric.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-brutalist-fg/10 overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500"
                                                style={{
                                                    width: `${metric.value}%`,
                                                    backgroundColor: getStatusColor(metric.status),
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-mono w-10 text-right">{metric.value}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="border-b lg:border-b-0 lg:border-r border-brutalist-fg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Risk Radar</span>
                            <Info className="w-4 h-4 text-brutalist-muted" />
                        </div>
                        <div className="aspect-square">
                            <canvas ref={canvasRef} className="w-full h-full" />
                        </div>
                        <div className="mt-4 pt-4 border-t border-brutalist-fg/20">
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-green-500" />
                                    <span>Low Risk</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-orange-500" />
                                    <span>Moderate</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-red-500" />
                                    <span>High Risk</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Biomarkers + Recommendations */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Key Biomarkers</span>
                            <CheckCircle className="w-4 h-4 text-brutalist-muted" />
                        </div>
                        <div className="space-y-4">
                            {biomarkers.map((marker) => (
                                <div key={marker.name} className="border border-brutalist-fg/20 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-mono">{marker.name}</span>
                                        <span
                                            className="text-xs font-mono px-2 py-0.5"
                                            style={{ backgroundColor: getStatusColor(marker.status), color: 'white' }}
                                        >
                                            {marker.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-space text-2xl font-bold text-brutalist-fg">
                                            {marker.value}
                                        </span>
                                        <span className="text-xs font-mono text-brutalist-muted">{marker.unit}</span>
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-brutalist-muted">
                                        Reference: {marker.range}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Key Factors — real data only */}
                        {reportData?.keyFactors?.length > 0 && (
                            <div className="mt-4 p-4 border border-brutalist-fg/20">
                                <span className="text-xs font-mono text-brutalist-muted uppercase block mb-2">
                                    Key Factors
                                </span>
                                {reportData.keyFactors.slice(0, 3).map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs font-mono mt-1">
                                        <span
                                            className="w-2 h-2 flex-shrink-0"
                                            style={{ backgroundColor: f.direction === 'increases' ? '#ef4444' : '#22c55e' }}
                                        />
                                        {f.feature} {f.direction} risk
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recommendation */}
                        <div className="mt-6 p-4 border border-brutalist-accent bg-brutalist-accent/5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-brutalist-accent flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-sm font-mono font-bold block mb-1">Recommendation</span>
                                    <span className="text-xs font-mono text-brutalist-muted">{recommendation}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Results;
