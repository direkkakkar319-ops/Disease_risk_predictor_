import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    BarChart3,
    Activity,
    Loader2,
    ArrowRight,
    Minus,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // 2 min timeout

export function Compare() {
    const [reports, setReports]           = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [report1Id, setReport1Id]       = useState(null);
    const [report2Id, setReport2Id]       = useState(null);
    const [showDropdown1, setShowDropdown1] = useState(false);
    const [showDropdown2, setShowDropdown2] = useState(false);
    const [comparing, setComparing]       = useState(false);
    const [comparisonResult, setComparisonResult] = useState(null);
    const [error, setError]               = useState(null);
    const [history, setHistory]           = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const pollRef    = useRef(null);
    const pollCount  = useRef(0);

    // ── Load completed reports on mount ───────────────────────────────────
    useEffect(() => {
        apiFetch('/api/reports')
            .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
            .then(data => {
                const done = data.filter(r => r.status === 'completed');
                setReports(done);
            })
            .catch(() => setError('Failed to load reports'))
            .finally(() => setLoadingReports(false));
    }, []);

    // ── Load comparison history on mount ─────────────────────────────────
    useEffect(() => {
        apiFetch('/api/compare')
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(data => setHistory(data))
            .catch(() => {})
            .finally(() => setLoadingHistory(false));
    }, []);

    // ── Refresh reports when a new upload completes ────────────────────────
    useEffect(() => {
        const handler = () => {
            apiFetch('/api/reports')
                .then(res => (res.ok ? res.json() : null))
                .then(data => {
                    if (data) setReports(data.filter(r => r.status === 'completed'));
                })
                .catch(() => {});
        };
        window.addEventListener('reportUploaded', handler);
        return () => window.removeEventListener('reportUploaded', handler);
    }, []);

    // ── Poll comparison status ─────────────────────────────────────────────
    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback((comparisonId) => {
        pollCount.current = 0;
        stopPolling();

        pollRef.current = setInterval(async () => {
            pollCount.current += 1;
            if (pollCount.current > MAX_POLL_ATTEMPTS) {
                stopPolling();
                setComparing(false);
                setError('Comparison timed out. Please try again.');
                return;
            }

            try {
                const res = await apiFetch(`/api/compare/${comparisonId}`);
                if (!res.ok) {
                    stopPolling();
                    setComparing(false);
                    setError('Failed to fetch comparison result.');
                    return;
                }
                const data = await res.json();
                if (data.status === 'completed') {
                    stopPolling();
                    setComparing(false);
                    setComparisonResult(data);
                    setHistory(prev => [
                        {
                            comparison_id:  data.comparison_id,
                            report1_id:     data.report1_id,
                            report2_id:     data.report2_id,
                            report_type:    data.report_type,
                            status:         data.status,
                            trend_analysis: data.trend_analysis,
                            created_at:     data.created_at,
                        },
                        ...prev.filter(h => h.comparison_id !== data.comparison_id),
                    ]);
                } else if (data.status === 'failed') {
                    stopPolling();
                    setComparing(false);
                    setError('Comparison failed. Please try again.');
                }
            } catch {
                // network hiccup — keep polling
            }
        }, POLL_INTERVAL_MS);
    }, [stopPolling]);

    useEffect(() => () => stopPolling(), [stopPolling]);

    // ── Trigger comparison ─────────────────────────────────────────────────
    const handleCompare = async () => {
        if (!report1Id || !report2Id) return;
        setError(null);
        setComparisonResult(null);
        setComparing(true);

        try {
            const res = await apiFetch('/api/compare', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ report1_id: report1Id, report2_id: report2Id }),
            });

            if (!res.ok) {
                let detail = `Server error ${res.status}`;
                try {
                    const errData = await res.json();
                    detail = errData.detail || detail;
                } catch {}
                setComparing(false);
                setError(detail);
                return;
            }

            const data = await res.json();
            startPolling(data.comparison_id);
        } catch (err) {
            console.error('[Compare] fetch error:', err);
            setComparing(false);
            setError(`Connection error: ${err.message}`);
        }
    };

    // ── Load a history item ───────────────────────────────────────────────
    const loadHistoryItem = async (item) => {
        const res = await apiFetch(`/api/compare/${item.comparison_id}`);
        if (!res.ok) return;
        const data = await res.json();
        setReport1Id(item.report1_id);
        setReport2Id(item.report2_id);
        setComparisonResult(data);
        setError(null);
    };

    // ── Derived values ─────────────────────────────────────────────────────
    const selected1 = reports.find(r => r.id === report1Id);
    const selected2 = reports.find(r => r.id === report2Id);

    // Dropdown 2 only shows same report_type as report 1
    const reportsForDropdown2 = report1Id
        ? reports.filter(r => r.report_type === selected1?.report_type && r.id !== report1Id)
        : reports;

    const canCompare =
        report1Id &&
        report2Id &&
        report1Id !== report2Id &&
        selected1?.report_type === selected2?.report_type &&
        !comparing;

    const metrics         = comparisonResult?.comparison_data?.metrics ?? [];
    const summary         = comparisonResult?.comparison_data?.summary ?? null;
    const riskComparison  = comparisonResult?.comparison_data?.risk_comparison ?? [];
    const improvedCount   = summary?.improved_count  ?? 0;
    const worsenedCount   = summary?.worsened_count  ?? 0;
    const totalMetrics    = summary?.total_metrics   ?? 0;

    // ── Helpers ────────────────────────────────────────────────────────────
    const formatDate = (iso) =>
        iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    const formatType = (t) =>
        t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';

    const TrendIcon = ({ improved, isSignificant }) => {
        if (!isSignificant) return <Minus className="w-4 h-4 text-brutalist-muted" />;
        return improved
            ? <TrendingDown className="w-4 h-4 text-green-500" />
            : <TrendingUp   className="w-4 h-4 text-red-500" />;
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <section className="py-16 md:py-24 safe-x md:px-6 lg:px-8" id="compare">
            <div className="max-w-6xl mx-auto">

                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
                        <span className="text-xs font-mono text-brutalist-muted text-balance-safe">// SECTION: REPORT_COMPARISON</span>
                        <span className="text-xs font-mono text-brutalist-muted">008</span>
                    </div>
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    Compare Reports
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-8 max-w-2xl">
                    Select two completed reports of the same type to compare side-by-side.
                    Track changes in your health parameters over time.
                </p>

                {/* Loading reports state */}
                {loadingReports && (
                    <div className="flex items-center gap-3 font-mono text-sm text-brutalist-muted py-8">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading your reports…
                    </div>
                )}

                {/* No completed reports */}
                {!loadingReports && reports.length === 0 && (
                    <div className="border border-brutalist-fg p-8 text-center">
                        <Activity className="w-8 h-8 text-brutalist-muted mx-auto mb-3" />
                        <p className="font-mono text-sm text-brutalist-muted">
                            No completed reports yet. Upload and analyse at least two reports to compare them.
                        </p>
                    </div>
                )}

                {/* Report Selectors */}
                {!loadingReports && reports.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Report 1 */}
                        <div className="border border-brutalist-fg p-4">
                            <span className="text-xs font-mono text-brutalist-muted uppercase block mb-2">
                                Report 1 (Recent)
                            </span>
                            <div className="relative">
                                <button
                                    className="w-full flex items-center justify-between p-3 border border-brutalist-fg bg-brutalist-bg hover:bg-brutalist-fg/5 transition-colors"
                                    onClick={() => { setShowDropdown1(v => !v); setShowDropdown2(false); }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-brutalist-muted" />
                                        <div className="text-left">
                                            <span className="text-sm font-mono block">
                                                {selected1 ? formatType(selected1.report_type) : 'Select a report'}
                                            </span>
                                            {selected1 && (
                                                <span className="text-xs font-mono text-brutalist-muted">
                                                    {formatDate(selected1.created_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown1 ? 'rotate-180' : ''}`} />
                                </button>
                                {showDropdown1 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 border border-brutalist-fg bg-brutalist-bg z-10 max-h-48 overflow-y-auto">
                                        {reports.map(r => (
                                            <button
                                                key={r.id}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-brutalist-fg/5 transition-colors text-left"
                                                onClick={() => {
                                                    setReport1Id(r.id);
                                                    // reset report2 if it's no longer same type
                                                    if (report2Id) {
                                                        const r2 = reports.find(x => x.id === report2Id);
                                                        if (r2 && r2.report_type !== r.report_type) setReport2Id(null);
                                                    }
                                                    setShowDropdown1(false);
                                                    setComparisonResult(null);
                                                    setError(null);
                                                }}
                                            >
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-mono truncate">{r.filename}</span>
                                                    <span className="text-xs font-mono text-brutalist-muted">{formatType(r.report_type)}</span>
                                                </div>
                                                <span className="text-xs font-mono text-brutalist-muted ml-auto shrink-0">{formatDate(r.created_at)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Report 2 */}
                        <div className="border border-brutalist-fg p-4">
                            <span className="text-xs font-mono text-brutalist-muted uppercase block mb-2">
                                Report 2 (Previous)
                            </span>
                            <div className="relative">
                                <button
                                    className="w-full flex items-center justify-between p-3 border border-brutalist-fg bg-brutalist-bg hover:bg-brutalist-fg/5 transition-colors"
                                    onClick={() => { setShowDropdown2(v => !v); setShowDropdown1(false); }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-brutalist-muted" />
                                        <div className="text-left">
                                            <span className="text-sm font-mono block">
                                                {selected2 ? formatType(selected2.report_type) : 'Select a report'}
                                            </span>
                                            {selected2 && (
                                                <span className="text-xs font-mono text-brutalist-muted">
                                                    {formatDate(selected2.created_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown2 ? 'rotate-180' : ''}`} />
                                </button>
                                {showDropdown2 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 border border-brutalist-fg bg-brutalist-bg z-10 max-h-48 overflow-y-auto">
                                        {reportsForDropdown2.length === 0 ? (
                                            <div className="p-3 text-xs font-mono text-brutalist-muted">
                                                No other {selected1 ? formatType(selected1.report_type) : ''} reports available
                                            </div>
                                        ) : (
                                            reportsForDropdown2.map(r => (
                                                <button
                                                    key={r.id}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-brutalist-fg/5 transition-colors text-left"
                                                    onClick={() => {
                                                        setReport2Id(r.id);
                                                        setShowDropdown2(false);
                                                        setComparisonResult(null);
                                                        setError(null);
                                                    }}
                                                >
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-mono truncate">{r.filename}</span>
                                                        <span className="text-xs font-mono text-brutalist-muted">{formatType(r.report_type)}</span>
                                                    </div>
                                                    <span className="text-xs font-mono text-brutalist-muted ml-auto shrink-0">{formatDate(r.created_at)}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Compare button */}
                {!loadingReports && reports.length > 0 && (
                    <div className="mb-8">
                        <button
                            disabled={!canCompare}
                            onClick={handleCompare}
                            className="flex w-full sm:w-auto items-center justify-center gap-3 px-8 py-3 bg-brutalist-fg text-brutalist-bg font-mono font-bold text-xs uppercase tracking-widest hover:bg-brutalist-accent hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {comparing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    COMPARING…
                                </>
                            ) : (
                                <>
                                    COMPARE REPORTS
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                        {report1Id && report2Id && selected1?.report_type !== selected2?.report_type && (
                            <p className="mt-2 text-xs font-mono text-red-500">
                                Both reports must be the same type to compare.
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 p-3 border border-red-500 bg-red-500/10 text-red-500 font-mono text-xs uppercase tracking-wider">
                        {error}
                    </div>
                )}

                {/* Comparison results */}
                {comparisonResult && summary && (
                    <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-1 min-[380px]:grid-cols-3 gap-0 border border-brutalist-fg mb-8">
                            <div className="p-4 border-b min-[380px]:border-b-0 min-[380px]:border-r border-brutalist-fg">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-xs font-mono text-brutalist-muted uppercase">Improved</span>
                                </div>
                                <span className="font-space text-3xl font-bold text-green-500">{improvedCount}</span>
                            </div>
                            <div className="p-4 border-b min-[380px]:border-b-0 min-[380px]:border-r border-brutalist-fg">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-xs font-mono text-brutalist-muted uppercase">Needs Attention</span>
                                </div>
                                <span className="font-space text-3xl font-bold text-red-500">{worsenedCount}</span>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="w-4 h-4 text-brutalist-accent" />
                                    <span className="text-xs font-mono text-brutalist-muted uppercase">Parameters</span>
                                </div>
                                <span className="font-space text-3xl font-bold text-brutalist-fg">{totalMetrics}</span>
                            </div>
                        </div>

                        {/* Overall trend badge */}
                        <div className="mb-6 flex flex-wrap items-center gap-3">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Overall Trend:</span>
                            <span className={`text-sm font-mono font-bold px-3 py-1 border ${
                                summary.overall_trend === 'IMPROVING'
                                    ? 'border-green-500 text-green-500 bg-green-500/10'
                                    : summary.overall_trend === 'WORSENING'
                                    ? 'border-red-500 text-red-500 bg-red-500/10'
                                    : 'border-brutalist-muted text-brutalist-muted bg-brutalist-muted/10'
                            }`}>
                                {summary.overall_trend}
                            </span>
                        </div>

                        {/* Risk Score Changes */}
                        {riskComparison.length > 0 && (
                            <div className="border border-brutalist-fg mb-8 overflow-x-auto">
                                <div className="border-b border-brutalist-fg px-4 py-3">
                                    <h3 className="font-space text-lg font-bold text-brutalist-fg">
                                        Risk Score Changes
                                    </h3>
                                </div>
                                {riskComparison.map((item, index) => {
                                    const isUnchanged = item.diff === 0;
                                    return (
                                        <div
                                            key={item.disease}
                                            className={`flex min-w-[34rem] items-center justify-between px-4 py-3 ${index < riskComparison.length - 1 ? 'border-b border-brutalist-fg' : ''}`}
                                        >
                                            <span className="font-mono text-sm text-brutalist-fg capitalize">
                                                {item.disease.replace(/_/g, ' ')}
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 font-mono text-sm">
                                                    <span className="text-brutalist-muted">
                                                        {(item.r2_risk * 100).toFixed(1)}%
                                                    </span>
                                                    <ArrowRight className="w-3 h-3 text-brutalist-muted" />
                                                    <span className={isUnchanged ? 'text-brutalist-muted' : item.improved ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                                                        {(item.r1_risk * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                {isUnchanged ? (
                                                    <span className="text-xs font-mono text-brutalist-muted px-2 py-0.5 border border-brutalist-muted">
                                                        Unchanged
                                                    </span>
                                                ) : item.improved ? (
                                                    <span className="text-xs font-mono px-2 py-0.5 border border-green-500 text-green-500 bg-green-500/10">
                                                        Improved
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-mono px-2 py-0.5 border border-red-500 text-red-500 bg-red-500/10">
                                                        Worsened
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Comparison table */}
                        {metrics.length > 0 ? (
                            <div className="border border-brutalist-fg mb-8 overflow-x-auto">
                                {/* Header */}
                                <div className="grid min-w-[42rem] grid-cols-12 gap-0 border-b border-brutalist-fg bg-brutalist-bg px-4 py-3">
                                    <div className="col-span-3 md:col-span-2">
                                        <span className="text-xs font-mono text-brutalist-muted uppercase">Biomarker</span>
                                    </div>
                                    <div className="col-span-3 md:col-span-2 text-center">
                                        <span className="text-xs font-mono text-brutalist-muted uppercase">{formatDate(selected1?.created_at)}</span>
                                    </div>
                                    <div className="col-span-3 md:col-span-2 text-center">
                                        <span className="text-xs font-mono text-brutalist-muted uppercase">{formatDate(selected2?.created_at)}</span>
                                    </div>
                                    <div className="col-span-2 md:col-span-2 text-center hidden md:block">
                                        <span className="text-xs font-mono text-brutalist-muted uppercase">Change</span>
                                    </div>
                                    <div className="col-span-2 md:col-span-2 text-center hidden md:block">
                                        <span className="text-xs font-mono text-brutalist-muted uppercase">Trend</span>
                                    </div>
                                    <div className="col-span-3 md:col-span-2 text-right">
                                        <span className="text-xs font-mono text-brutalist-muted uppercase">Status</span>
                                    </div>
                                </div>

                                {/* Rows */}
                                {metrics.map((item, index) => {
                                    const isSignificant = item.is_significant;
                                    const improved      = item.improved;

                                    return (
                                        <div
                                            key={item.name}
                                            className={`grid min-w-[42rem] grid-cols-12 gap-0 px-4 py-3 items-center ${
                                                index < metrics.length - 1 ? 'border-b border-brutalist-fg' : ''
                                            } ${isSignificant ? (improved ? 'bg-green-500/5' : 'bg-red-500/5') : ''}`}
                                        >
                                            <div className="col-span-3 md:col-span-2">
                                                <span className="text-sm font-mono capitalize">{item.name.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div className="col-span-3 md:col-span-2 text-center">
                                                <span className={`text-sm font-mono font-bold ${isSignificant && !improved ? 'text-red-500' : ''}`}>
                                                    {item.r1_val}
                                                </span>
                                            </div>
                                            <div className="col-span-3 md:col-span-2 text-center">
                                                <span className="text-sm font-mono">{item.r2_val}</span>
                                            </div>
                                            <div className="col-span-2 md:col-span-2 text-center hidden md:block">
                                                <div className={`flex items-center justify-center gap-1 ${improved ? 'text-green-500' : isSignificant ? 'text-red-500' : 'text-brutalist-muted'}`}>
                                                    <TrendIcon improved={improved} isSignificant={isSignificant} />
                                                    <span className="text-sm font-mono font-bold">
                                                        {item.diff > 0 ? '+' : ''}{item.diff}
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-mono ${improved ? 'text-green-500' : isSignificant ? 'text-red-500' : 'text-brutalist-muted'}`}>
                                                    {item.percent > 0 ? '+' : ''}{item.percent}%
                                                </span>
                                            </div>
                                            <div className="col-span-2 md:col-span-2 text-center hidden md:block">
                                                <div className="flex items-center justify-center gap-1">
                                                    <BarChart3 className="w-3 h-3 text-brutalist-muted" />
                                                    <span className={`text-xs font-mono ${improved ? 'text-green-500' : isSignificant ? 'text-red-500' : 'text-brutalist-muted'}`}>
                                                        {improved ? 'Improved' : isSignificant ? 'Worsened' : 'Stable'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-span-3 md:col-span-2 text-right">
                                                {isSignificant ? (
                                                    <span className={`text-xs font-mono px-2 py-0.5 border ${improved ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                                                        {improved ? 'Better' : 'Worse'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-mono text-brutalist-muted">Stable</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="border border-brutalist-fg p-6 text-center mb-8">
                                <p className="font-mono text-sm text-brutalist-muted">
                                    No shared metrics found between these two reports.
                                    Make sure both reports have extracted lab values.
                                </p>
                            </div>
                        )}

                        {/* Visual bars for top 6 metrics */}
                        {metrics.length > 0 && (
                            <div className="border border-brutalist-fg p-4 sm:p-6">
                                <h3 className="font-space text-lg font-bold text-brutalist-fg mb-6">
                                    Visual Comparison
                                </h3>
                                <div className="space-y-4">
                                    {metrics.slice(0, 6).map(item => {
                                        const maxVal = Math.max(item.r1_val, item.r2_val) * 1.2 || 1;
                                        const w1 = (item.r1_val / maxVal) * 100;
                                        const w2 = (item.r2_val / maxVal) * 100;

                                        return (
                                            <div key={item.name} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center">
                                                <div className="md:col-span-2">
                                                    <span className="text-xs font-mono capitalize">{item.name.replace(/_/g, ' ')}</span>
                                                </div>
                                                <div className="md:col-span-10">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-mono text-brutalist-muted w-20 shrink-0">{formatDate(selected1?.created_at)}</span>
                                                        <div className="flex-1 h-4 bg-brutalist-fg/10 overflow-hidden">
                                                            <div
                                                                className={`h-full ${item.improved ? 'bg-green-500' : 'bg-orange-500'}`}
                                                                style={{ width: `${w1}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-mono w-12 text-right shrink-0">{item.r1_val}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono text-brutalist-muted w-20 shrink-0">{formatDate(selected2?.created_at)}</span>
                                                        <div className="flex-1 h-4 bg-brutalist-fg/10 overflow-hidden">
                                                            <div
                                                                className="h-full bg-brutalist-fg/40"
                                                                style={{ width: `${w2}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-mono w-12 text-right shrink-0">{item.r2_val}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
                {/* Past Comparisons */}
                {!loadingHistory && (
                    <div className="mt-12">
                        <div className="flex flex-wrap items-center gap-4 border-b border-brutalist-fg pb-4 mb-0">
                            <h3 className="font-space text-xl font-bold text-brutalist-fg">Past Comparisons</h3>
                            {history.length > 0 && (
                                <span className="text-xs font-mono text-brutalist-muted">{history.length} total</span>
                            )}
                        </div>

                        {history.length === 0 ? (
                            <div className="border border-brutalist-fg p-6 text-center">
                                <p className="font-mono text-sm text-brutalist-muted">
                                    No past comparisons yet. Run your first comparison above.
                                </p>
                            </div>
                        ) : (
                            <div className="border border-brutalist-fg border-t-0">
                                {history.map((item, index) => (
                                    <div
                                        key={item.comparison_id}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-brutalist-fg/5 transition-colors ${index < history.length - 1 ? 'border-b border-brutalist-fg' : ''}`}
                                    >
                                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                            <span className="font-mono text-sm text-brutalist-fg">
                                                {formatType(item.report_type)}
                                            </span>
                                            <span className="text-xs font-mono text-brutalist-muted">
                                                {formatDate(item.created_at)}
                                            </span>
                                            {item.trend_analysis && (
                                                <span className={`text-xs font-mono px-2 py-0.5 border ${
                                                    item.trend_analysis === 'IMPROVING'
                                                        ? 'border-green-500 text-green-500 bg-green-500/10'
                                                        : item.trend_analysis === 'WORSENING'
                                                        ? 'border-red-500 text-red-500 bg-red-500/10'
                                                        : 'border-brutalist-muted text-brutalist-muted bg-brutalist-muted/10'
                                                }`}>
                                                    {item.trend_analysis}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => loadHistoryItem(item)}
                                            className="font-mono text-xs border border-brutalist-fg px-3 py-1 hover:bg-brutalist-fg/5 transition-colors"
                                        >
                                            Load
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export default Compare;
