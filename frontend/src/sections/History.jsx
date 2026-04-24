// ─── History.jsx — Past reports browser ───────────────────────────────────────
//
// Fetches the current user's full report list from GET /api/reports.
// The list endpoint returns lightweight summary data (no OCR text, no full predictions).
// Full detail (extracted_metrics, prediction) is loaded lazily only when the user
// clicks a row (handleSelectReport → GET /api/reports/{id}).
//
// PDF download flow:
//   1. User clicks Download → handleDownloadReport()
//   2. Fetches full report data from /api/status/{id} (same endpoint as Results polling)
//   3. Transforms the data with transformResult() (same util as Results.jsx)
//   4. Sets pdfReportData state, which feeds a hidden <ReportPDFRenderer> component
//      mounted at the bottom of this section
//   5. After 500ms (render settle time), calls pdfRendererRef.current.generatePDF()
//      which uses @react-pdf/renderer to build and download the PDF
//
// The hidden offscreen ReportPDFRenderer pattern is used because @react-pdf/renderer
// needs to be in the React tree to generate PDFs — it can't run imperatively outside.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText, Calendar, Clock, ChevronRight,
    Download, Eye, Search, Filter,
    TrendingUp, TrendingDown, Minus, Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ReportPDFRenderer } from '@/components/ReportPDFRenderer';
import { transformResult } from '@/lib/reportUtils';

// ── Helpers ───────────────────────────────────────────────────────────────
const REPORT_TYPE_LABELS = {
    blood: 'Blood Test',
    lipid: 'Lipid Panel',
    vitamin_d: 'Vitamin D',
    hormone: 'Hormone Panel',
    kidney: 'Kidney Function',
    liver: 'Liver Function',
};

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
}

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toTimeString().slice(0, 5);
}

function transformReport(r) {
    return {
        id: r.id,
        displayId: `REP-${r.id}`,
        date: formatDate(r.created_at),
        time: formatTime(r.created_at),
        type: REPORT_TYPE_LABELS[r.report_type] ?? r.report_type,
        fileName: r.filename,
        status: r.status,
        riskLevel: r.risk_level ?? 'pending',
        risks: r.risks ?? {},
        // Detail fields — populated on demand via GET /api/reports/{id}
        keyFindings: [],
        biomarkers: [],
        extractedMetrics: null,
        prediction: null,
    };
}

function getRisksAsBiomarkers(extractedMetrics) {
    if (!extractedMetrics) return [];
    return Object.entries(extractedMetrics).slice(0, 4).map(([key, entry]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: typeof entry === 'object' ? `${entry.value} ${entry.unit ?? ''}`.trim() : String(entry),
        trend: 'stable',
    }));
}

// ── Component ─────────────────────────────────────────────────────────────
export function History() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [pdfReportData, setPdfReportData] = useState(null);
    const [pdfGeneratingId, setPdfGeneratingId] = useState(null);
    const pdfRendererRef = useRef(null);

    // ── Fetch report list ─────────────────────────────────────────────────
    const fetchReports = useCallback(async () => {
        if (!localStorage.getItem('access_token')) return;

        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch('/api/reports');
            if (res.status === 401) { setLoading(false); return; } // not logged in
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setReports(data.map(transformReport));
        } catch (e) {
            setError('Could not load reports. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    // Refresh list when a new report is uploaded
    useEffect(() => {
        const handler = () => setTimeout(fetchReports, 2000);
        window.addEventListener('reportUploaded', handler);
        return () => window.removeEventListener('reportUploaded', handler);
    }, [fetchReports]);

    // ── Fetch full detail when a row is selected ──────────────────────────
    const handleSelectReport = useCallback(async (report) => {
        setSelectedReport(report);

        if (report.extractedMetrics !== null) return; // already loaded

        setDetailLoading(true);
        try {
            const res = await apiFetch(`/api/reports/${report.id}`);
            if (!res.ok) return;
            const data = await res.json();

            const biomarkers = getRisksAsBiomarkers(data.extracted_metrics);
            const keyFindings = data.prediction
                ? (data.prediction.recommendations ?? []).slice(0, 3)
                : [];

            setReports(prev =>
                prev.map(r =>
                    r.id === report.id
                        ? { ...r, biomarkers, keyFindings, extractedMetrics: data.extracted_metrics, prediction: data.prediction }
                        : r
                )
            );
            setSelectedReport(prev => ({
                ...prev, biomarkers, keyFindings, extractedMetrics: data.extracted_metrics, prediction: data.prediction,
            }));
        } catch {
            // non-critical, silently fail
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const handleDownloadReport = useCallback(async (report) => {
        try {
            setPdfGeneratingId(report.id);
            const res = await apiFetch(`/api/status/${report.id}`);
            if (!res.ok) throw new Error('Failed to fetch full report details');
            const data = await res.json();
            
            if (data?.status === 'completed' && data.result) {
                const transformed = transformResult(data);
                if (transformed) {
                    setPdfReportData(transformed);
                    // Wait for React to mount/update the offscreen renderer with new data
                    setTimeout(async () => {
                        try {
                            if (pdfRendererRef.current) {
                                await pdfRendererRef.current.generatePDF();
                            }
                        } catch (err) {
                            console.error("PDF generation error:", err);
                            alert('Failed to generate PDF.');
                        } finally {
                            setPdfGeneratingId(null);
                        }
                    }, 500); // Give it a moment to render the canvas completely
                    return;
                }
            }
            throw new Error('Report is not fully processed yet or data is missing.');
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to generate the report PDF.');
            setPdfGeneratingId(null);
        }
    }, []);

const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
        r.fileName.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.displayId.toLowerCase().includes(q);
    const matchesFilter = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesFilter;
});

const reportTypes = ['all', ...Array.from(new Set(reports.map(r => r.type)))];

// ── Stat counters ─────────────────────────────────────────────────────
const thisMonth = reports.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}).length;

const highRiskCount = reports.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length;

// ── Sub-helpers ───────────────────────────────────────────────────────
const getRiskColor = (risk) => {
    switch (risk) {
        case 'low': return 'bg-green-500';
        case 'moderate': return 'bg-orange-500';
        case 'high': return 'bg-red-500';
        case 'critical': return 'bg-red-700';
        default: return 'bg-gray-400';
    }
};

const getTrendIcon = (trend) => {
    switch (trend) {
        case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
        case 'down': return <TrendingDown className="w-3 h-3 text-green-500" />;
        default: return <Minus className="w-3 h-3 text-gray-500" />;
    }
};

// ── Render ────────────────────────────────────────────────────────────
return (
    <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="history">
        <div className="max-w-6xl mx-auto">

            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-brutalist-muted">// SECTION: REPORT_HISTORY</span>
                    <span className="text-xs font-mono text-brutalist-muted">007</span>
                </div>
                <button
                    onClick={fetchReports}
                    className="text-xs font-mono text-brutalist-muted hover:text-brutalist-fg transition-colors uppercase"
                >
                    ↺ Refresh
                </button>
            </div>

            <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                Your Report History
            </h2>
            <p className="text-sm font-mono text-brutalist-muted mb-8 max-w-2xl">
                View all your previously analysed health reports.
            </p>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutalist-muted" />
                    <input
                        type="text"
                        placeholder="Search reports…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-brutalist-fg bg-brutalist-bg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brutalist-accent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-brutalist-muted" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-3 border border-brutalist-fg bg-brutalist-bg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brutalist-accent"
                    >
                        {reportTypes.map((type) => (
                            <option key={type} value={type}>
                                {type === 'all' ? 'All Types' : type}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-brutalist-fg mb-8">
                <div className="p-4 border-r border-brutalist-fg">
                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">Total Reports</span>
                    <span className="font-space text-2xl font-bold text-brutalist-fg">
                        {loading ? '—' : reports.length}
                    </span>
                </div>
                <div className="p-4 border-r border-brutalist-fg">
                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">This Month</span>
                    <span className="font-space text-2xl font-bold text-brutalist-fg">
                        {loading ? '—' : thisMonth}
                    </span>
                </div>
                <div className="p-4 border-r border-brutalist-fg">
                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">High Risk</span>
                    <span className="font-space text-2xl font-bold text-red-500">
                        {loading ? '—' : highRiskCount}
                    </span>
                </div>
                <div className="p-4">
                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">Status</span>
                    <span className="font-space text-sm font-bold text-brutalist-fg">
                        {loading ? 'Loading…' : error ? 'Error' : 'Live'}
                    </span>
                </div>
            </div>

            {/* Loading / Error / Empty states */}
            {loading && (
                <div className="border border-brutalist-fg p-12 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-brutalist-muted" />
                    <span className="text-sm font-mono text-brutalist-muted">Loading reports…</span>
                </div>
            )}

            {!loading && error && (
                <div className="border border-red-500 p-6 text-center">
                    <span className="text-sm font-mono text-red-500">{error}</span>
                </div>
            )}

            {!loading && !error && reports.length === 0 && (
                <div className="border border-brutalist-fg p-12 text-center">
                    <FileText className="w-8 h-8 text-brutalist-muted mx-auto mb-4" />
                    <span className="text-sm font-mono text-brutalist-muted block">
                        No reports yet. Upload your first medical report to get started.
                    </span>
                </div>
            )}

            {/* Reports Table */}
            {!loading && filteredReports.length > 0 && (
                <div className="border border-brutalist-fg">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-0 border-b border-brutalist-fg bg-brutalist-bg px-4 py-3">
                        <div className="col-span-4 md:col-span-3">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Report</span>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Date</span>
                        </div>
                        <div className="col-span-2 hidden md:block">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Diseases</span>
                        </div>
                        <div className="col-span-2 hidden md:block">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Risk Level</span>
                        </div>
                        <div className="col-span-5 md:col-span-3 text-right">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Actions</span>
                        </div>
                    </div>

                    {/* Rows */}
                    {filteredReports.map((report, index) => (
                        <div
                            key={report.id}
                            className={`grid grid-cols-12 gap-0 px-4 py-4 items-center hover:bg-brutalist-fg/5 transition-colors cursor-pointer ${index < filteredReports.length - 1 ? 'border-b border-brutalist-fg' : ''
                                } ${selectedReport?.id === report.id ? 'bg-brutalist-fg/10' : ''}`}
                            onClick={() => handleSelectReport(report)}
                        >
                            <div className="col-span-4 md:col-span-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 border border-brutalist-fg flex items-center justify-center">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-mono block">{report.type}</span>
                                        <span className="text-xs font-mono text-brutalist-muted">{report.displayId}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-3 md:col-span-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-brutalist-muted" />
                                    <span className="text-sm font-mono">{report.date}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3 text-brutalist-muted" />
                                    <span className="text-xs font-mono text-brutalist-muted">{report.time}</span>
                                </div>
                            </div>

                            <div className="col-span-2 hidden md:block">
                                <div className="space-y-1">
                                    {Object.entries(report.risks).slice(0, 2).map(([disease, val]) => (
                                        <div key={disease} className="flex items-center gap-2">
                                            {getTrendIcon(val > 0.5 ? 'up' : 'stable')}
                                            <span className="text-xs font-mono">
                                                {disease.replace(/_/g, ' ')}: {Math.round(val * 100)}%
                                            </span>
                                        </div>
                                    ))}
                                    {Object.keys(report.risks).length === 0 && (
                                        <span className="text-xs font-mono text-brutalist-muted">
                                            {report.status === 'completed' ? '—' : report.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-2 hidden md:block">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${getRiskColor(report.riskLevel)}`} />
                                    <span className="text-sm font-mono uppercase">{report.riskLevel}</span>
                                </div>
                            </div>

                            <div className="col-span-5 md:col-span-3 flex items-center justify-end gap-2">
                                <button
                                    className="p-2 border border-brutalist-fg hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors"
                                    title="View"
                                    onClick={(e) => { e.stopPropagation(); handleSelectReport(report); }}
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-2 border border-brutalist-fg hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors disabled:opacity-50"
                                    title="Download"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadReport(report); }}
                                    disabled={pdfGeneratingId === report.id}
                                >
                                    {pdfGeneratingId === report.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                </button>
                                <ChevronRight className="w-4 h-4 text-brutalist-muted ml-2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Report Detail */}
            {selectedReport && (
                <div className="mt-8 border border-brutalist-fg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                                Selected Report
                            </span>
                            <h3 className="font-space text-xl font-bold text-brutalist-fg">
                                {selectedReport.type} — {selectedReport.displayId}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {detailLoading
                                ? <Loader2 className="w-4 h-4 animate-spin text-brutalist-muted" />
                                : <>
                                    <span className={`w-3 h-3 rounded-full ${getRiskColor(selectedReport.riskLevel)}`} />
                                    <span className="text-sm font-mono uppercase">{selectedReport.riskLevel} RISK</span>
                                </>
                            }
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Key Findings / Recommendations */}
                        <div>
                            <span className="text-xs font-mono text-brutalist-muted uppercase block mb-3">
                                {selectedReport.prediction ? 'Recommendations' : 'Status'}
                            </span>
                            {selectedReport.keyFindings.length > 0 ? (
                                <ul className="space-y-2">
                                    {selectedReport.keyFindings.map((finding, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-brutalist-accent mt-2 flex-shrink-0" />
                                            <span className="text-sm font-mono">{finding}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="text-sm font-mono text-brutalist-muted">
                                    {selectedReport.status === 'completed'
                                        ? 'No recommendations available.'
                                        : `Status: ${selectedReport.status}`}
                                </span>
                            )}

                            {/* Disease risk scores */}
                            {selectedReport.prediction?.risks && (
                                <div className="mt-4">
                                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-2">
                                        Disease Risks
                                    </span>
                                    {Object.entries(selectedReport.prediction.risks).map(([d, v]) => (
                                        <div key={d} className="flex items-center justify-between py-1 border-b border-brutalist-fg/10">
                                            <span className="text-xs font-mono">{d.replace(/_/g, ' ')}</span>
                                            <span className="text-xs font-mono font-bold">{Math.round(v * 100)}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Extracted Biomarkers */}
                        <div>
                            <span className="text-xs font-mono text-brutalist-muted uppercase block mb-3">
                                Extracted Biomarkers
                            </span>
                            {selectedReport.biomarkers.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedReport.biomarkers.map((bio, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 border border-brutalist-fg/30">
                                            <div className="flex items-center gap-2">
                                                {getTrendIcon(bio.trend)}
                                                <span className="text-sm font-mono">{bio.name}</span>
                                            </div>
                                            <span className="text-sm font-mono font-bold">{bio.value}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm font-mono text-brutalist-muted">
                                    {detailLoading ? 'Loading…' : 'No biomarker data available.'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-brutalist-fg flex items-center justify-between">
                        <span className="text-xs font-mono text-brutalist-muted">
                            File: {selectedReport.fileName}
                        </span>
                        <div className="flex items-center gap-3">
                            <button className="px-4 py-2 border border-brutalist-fg text-sm font-mono hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors">
                                View Full Analysis
                            </button>
                            <button className="px-4 py-2 bg-brutalist-accent text-white text-sm font-mono hover:bg-brutalist-accent/80 transition-colors">
                                Compare Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <ReportPDFRenderer ref={pdfRendererRef} reportData={pdfReportData} />
        </div>
    </section>
);
}

export default History;
