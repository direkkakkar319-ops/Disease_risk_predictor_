import { useEffect, useRef, useState, useCallback } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Info, Loader2, Upload } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { REFERENCE_RANGES, riskToStatus, formatLabel, transformResult } from '@/lib/reportUtils';

// ── Helpers ───────────────────────────────────────────────────────────────

const STEP_LABELS = {
    uploaded: 'Report received',
    preprocessing: 'Preprocessing image…',
    ocr_complete: 'OCR complete — running models…',
    predicting: 'Running disease models…',
    completed: 'Analysis complete',
    failed: 'Analysis failed',
};

// ── Component ─────────────────────────────────────────────────────────────
export function Results() {
    const canvasRef = useRef(null);
    const pollingRef = useRef(null);

    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [pollError, setPollError] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState(null);

    const riskMetrics = reportData?.riskMetrics ?? [];
    const biomarkers = reportData?.biomarkers ?? [];

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
                    localStorage.setItem('healthinsight_latest_report_id', reportId);
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

    // Resume poll if a report is still processing
    useEffect(() => {
        const pending = localStorage.getItem('healthinsight_pending_report_id');
        if (pending) startPolling(parseInt(pending, 10));
    }, [startPolling]);

    // Restore last completed report immediately on mount (no polling needed)
    useEffect(() => {
        const latestId = localStorage.getItem('healthinsight_latest_report_id');
        if (!latestId) return;
        apiFetch(`/api/status/${latestId}`)
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (data?.status === 'completed' && data.result) {
                    const transformed = transformResult(data);
                    if (transformed) setReportData(transformed);
                }
            })
            .catch(() => { });
    }, []); // runs once on mount only

    // ── Canvas radar chart ────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !riskMetrics.length) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resizeCanvas();

        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 40;

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
        ctx.fillStyle = 'rgba(249,115,22,0.2)';
        ctx.fill();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Data points
        riskMetrics.forEach((metric, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const value = metric.value / 100;
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#f97316';
            ctx.fill();
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }, [riskMetrics]);

    // ── Helpers ───────────────────────────────────────────────────────────
    const getStatusColor = (status) => {
        switch (status) {
            case 'low':
            case 'normal': return '#22c55e';
            case 'moderate':
            case 'elevated': return '#f97316';
            case 'high':
            case 'critical': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusBg = (status) => {
        switch (status) {
            case 'low':
            case 'normal': return 'rgba(34,197,94,0.08)';
            case 'moderate':
            case 'elevated': return 'rgba(249,115,22,0.08)';
            case 'high':
            case 'critical': return 'rgba(239,68,68,0.08)';
            default: return 'rgba(107,114,128,0.08)';
        }
    };

    const StatusBadge = ({ status }) => {
        const color = getStatusColor(status);
        const bg = getStatusBg(status);
        return (
            <span
                className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 uppercase tracking-widest border"
                style={{ borderColor: color, color, backgroundColor: bg }}
            >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {status}
            </span>
        );
    };

    const recommendation = reportData?.recommendations?.[0] ?? 'No specific recommendations at this time.';

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <section className="py-16 md:py-24 safe-x md:px-6 lg:px-8" id="results">
            <div className="max-w-6xl mx-auto">

                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
                        <span className="text-xs font-mono text-brutalist-muted text-balance-safe">// SECTION: YOUR_RESULTS</span>
                        <span className="text-xs font-mono text-brutalist-muted">003</span>
                    </div>
                    {reportData && (
                        <span className="text-xs font-mono text-green-500 uppercase text-balance-safe">
                            Live · {reportData.reportType} · {reportData.filename}
                        </span>
                    )}
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    Your Analysis Results
                </h2>
                {reportData && (
                    <p className="text-sm font-mono text-brutalist-muted mb-6 max-w-2xl">
                        Risk analysis for your {reportData.reportType} report. Not a medical diagnosis.
                    </p>
                )}

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

                {/* Empty state — no report uploaded yet */}
                {!loading && !reportData && !pollError && (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-brutalist-fg/40">
                        <div className="w-16 h-16 border border-brutalist-fg/30 flex items-center justify-center mb-6">
                            <Upload className="w-7 h-7 text-brutalist-fg/30" />
                        </div>
                        <p className="font-space font-bold text-lg text-brutalist-fg uppercase mb-2">No analysis yet</p>
                        <p className="font-mono text-xs text-brutalist-muted text-center max-w-xs">
                            Upload a medical report to see your personalised risk analysis here.
                        </p>
                    </div>
                )}

                {/* Risk Level Badge — real data only */}
                {reportData && (
                    <div
                        className="mb-8 flex items-center gap-4 sm:gap-5 px-4 sm:px-5 py-4 border-l-4 border border-brutalist-fg/20"
                        style={{ borderLeftColor: getStatusColor(reportData.riskLevel), backgroundColor: getStatusBg(reportData.riskLevel) }}
                    >
                        <div
                            className="w-10 h-10 flex items-center justify-center border-2 flex-shrink-0"
                            style={{ borderColor: getStatusColor(reportData.riskLevel) }}
                        >
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getStatusColor(reportData.riskLevel), boxShadow: `0 0 8px ${getStatusColor(reportData.riskLevel)}` }}
                            />
                        </div>
                        <div>
                            <span className="text-[10px] font-mono text-brutalist-muted uppercase tracking-widest block mb-0.5">
                                Overall Risk Assessment
                            </span>
                            <span
                                className="font-space text-lg sm:text-xl font-bold uppercase tracking-wide"
                                style={{ color: getStatusColor(reportData.riskLevel) }}
                            >
                                {reportData.riskLevel} Risk
                            </span>
                        </div>
                    </div>
                )}

                {/* Dashboard Grid — only when a report has been analysed */}
                {reportData && <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-brutalist-fg">

                    {/* Risk Overview */}
                    <div className="border-b lg:border-b-0 lg:border-r border-brutalist-fg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Risk Overview</span>
                            <TrendingUp className="w-4 h-4 text-brutalist-muted" />
                        </div>
                        <div className="space-y-3">
                            {riskMetrics.map((metric) => (
                                <div
                                    key={metric.name}
                                    className={`cursor-pointer transition-all p-3 border ${selectedMetric?.name === metric.name
                                            ? 'border-brutalist-accent bg-brutalist-accent/5'
                                            : 'border-brutalist-fg/20 hover:border-brutalist-fg/50'
                                        }`}
                                    onClick={() => setSelectedMetric(metric)}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <span className="text-xs font-mono text-brutalist-fg leading-tight">{metric.name}</span>
                                        <StatusBadge status={metric.status} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-brutalist-fg/10 overflow-hidden relative">
                                            {metric.value > 0 ? (
                                                <div
                                                    className="h-full transition-all duration-700"
                                                    style={{
                                                        width: `${metric.value}%`,
                                                        backgroundColor: getStatusColor(metric.status),
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="absolute left-0 top-0 h-full w-1"
                                                    style={{ backgroundColor: getStatusColor(metric.status), opacity: 0.5 }}
                                                />
                                            )}
                                        </div>
                                        <span
                                            className="text-xs font-mono font-bold w-9 text-right tabular-nums"
                                            style={{ color: getStatusColor(metric.status) }}
                                        >
                                            {metric.value}%
                                        </span>
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
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
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
                        <div className="space-y-3">
                            {biomarkers.map((marker) => (
                                <div
                                    key={marker.name}
                                    className="border border-brutalist-fg/20 p-4"
                                    style={{ borderLeftWidth: '3px', borderLeftColor: getStatusColor(marker.status) }}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-xs font-mono text-brutalist-fg">{marker.name}</span>
                                        <StatusBadge status={marker.status} />
                                    </div>
                                    <div className="flex items-baseline gap-1.5 mt-1">
                                        <span
                                            className="font-space text-2xl font-bold"
                                            style={{ color: getStatusColor(marker.status) }}
                                        >
                                            {marker.value}
                                        </span>
                                        <span className="text-xs font-mono text-brutalist-muted">{marker.unit}</span>
                                    </div>
                                    <div className="mt-1.5 text-[10px] font-mono text-brutalist-muted/60 uppercase tracking-wide">
                                        Ref: {marker.range}
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
                </div>}
            </div>
        </section>
    );
}

export default Results;
