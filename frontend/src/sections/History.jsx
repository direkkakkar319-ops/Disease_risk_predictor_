import { useState } from 'react';
import {
    FileText,
    Calendar,
    Clock,
    ChevronRight,
    Download,
    Trash2,
    Eye,
    Search,
    Filter,
    TrendingUp,
    TrendingDown,
    Minus
} from 'lucide-react';

const sampleReports = [
    {
        id: 'REP-2026-001',
        date: '2026-02-23',
        time: '14:32',
        type: 'Blood Test',
        fileName: 'blood_work_feb_2026.pdf',
        status: 'completed',
        riskLevel: 'moderate',
        keyFindings: ['Elevated glucose', 'High cholesterol', 'Normal liver function'],
        biomarkers: [
            { name: 'Glucose', value: '110 mg/dL', trend: 'up' },
            { name: 'Cholesterol', value: '195 mg/dL', trend: 'stable' },
            { name: 'HbA1c', value: '6.2%', trend: 'up' },
        ],
    },
    {
        id: 'REP-2026-002',
        date: '2026-01-15',
        time: '09:15',
        type: 'Complete Blood Count',
        fileName: 'cbc_january_2026.pdf',
        status: 'completed',
        riskLevel: 'low',
        keyFindings: ['All parameters normal', 'Healthy immune markers'],
        biomarkers: [
            { name: 'WBC', value: '7.2 K/uL', trend: 'stable' },
            { name: 'RBC', value: '4.8 M/uL', trend: 'stable' },
            { name: 'Hemoglobin', value: '14.2 g/dL', trend: 'stable' },
        ],
    },
    {
        id: 'REP-2025-012',
        date: '2025-12-20',
        time: '16:45',
        type: 'Lipid Panel',
        fileName: 'lipid_panel_dec_2025.pdf',
        status: 'completed',
        riskLevel: 'high',
        keyFindings: ['High LDL cholesterol', 'Low HDL', 'Triglycerides elevated'],
        biomarkers: [
            { name: 'LDL', value: '160 mg/dL', trend: 'up' },
            { name: 'HDL', value: '35 mg/dL', trend: 'down' },
            { name: 'Triglycerides', value: '180 mg/dL', trend: 'up' },
        ],
    },
    {
        id: 'REP-2025-011',
        date: '2025-11-08',
        time: '11:20',
        type: 'Thyroid Function',
        fileName: 'thyroid_nov_2025.pdf',
        status: 'completed',
        riskLevel: 'low',
        keyFindings: ['TSH within normal range', 'T3/T4 balanced'],
        biomarkers: [
            { name: 'TSH', value: '2.5 mIU/L', trend: 'stable' },
            { name: 'T3', value: '120 ng/dL', trend: 'stable' },
            { name: 'T4', value: '8.5 ug/dL', trend: 'stable' },
        ],
    },
    {
        id: 'REP-2025-010',
        date: '2025-10-03',
        time: '13:50',
        type: 'Comprehensive Metabolic',
        fileName: 'cmp_oct_2025.pdf',
        status: 'completed',
        riskLevel: 'moderate',
        keyFindings: ['Slightly elevated creatinine', 'Normal electrolytes'],
        biomarkers: [
            { name: 'Creatinine', value: '1.3 mg/dL', trend: 'up' },
            { name: 'BUN', value: '18 mg/dL', trend: 'stable' },
            { name: 'Sodium', value: '140 mEq/L', trend: 'stable' },
        ],
    },
    {
        id: 'REP-2025-009',
        date: '2025-09-12',
        time: '10:05',
        type: 'HbA1c Test',
        fileName: 'hba1c_sept_2025.pdf',
        status: 'completed',
        riskLevel: 'moderate',
        keyFindings: ['Prediabetic range', 'Monitor glucose levels'],
        biomarkers: [
            { name: 'HbA1c', value: '6.1%', trend: 'up' },
            { name: 'Glucose', value: '108 mg/dL', trend: 'up' },
        ],
    },
];

export function History() {
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    const filteredReports = sampleReports.filter((report) => {
        const matchesSearch =
            report.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || report.type === filterType;
        return matchesSearch && matchesFilter;
    });

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'low': return 'bg-green-500';
            case 'moderate': return 'bg-orange-500';
            case 'high': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
            case 'down': return <TrendingDown className="w-3 h-3 text-green-500" />;
            default: return <Minus className="w-3 h-3 text-gray-500" />;
        }
    };

    const reportTypes = ['all', ...Array.from(new Set(sampleReports.map(r => r.type)))];

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="history">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: REPORT_HISTORY
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            007
                        </span>
                    </div>
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    Your Report History
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-8 max-w-2xl">
                    View all your previously analyzed health reports. Extracted data is securely
                    stored for easy access and comparison.
                </p>

                {/* Search and Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutalist-muted" />
                        <input
                            type="text"
                            placeholder="Search reports..."
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

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-brutalist-fg mb-8">
                    <div className="p-4 border-r border-brutalist-fg">
                        <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                            Total Reports
                        </span>
                        <span className="font-space text-2xl font-bold text-brutalist-fg">
                            {sampleReports.length}
                        </span>
                    </div>
                    <div className="p-4 border-r border-brutalist-fg">
                        <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                            This Month
                        </span>
                        <span className="font-space text-2xl font-bold text-brutalist-fg">
                            2
                        </span>
                    </div>
                    <div className="p-4 border-r border-brutalist-fg">
                        <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                            High Risk
                        </span>
                        <span className="font-space text-2xl font-bold text-red-500">
                            {sampleReports.filter(r => r.riskLevel === 'high').length}
                        </span>
                    </div>
                    <div className="p-4">
                        <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                            Storage Used
                        </span>
                        <span className="font-space text-2xl font-bold text-brutalist-fg">
                            24.6 MB
                        </span>
                    </div>
                </div>

                {/* Reports List */}
                <div className="border border-brutalist-fg">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-0 border-b border-brutalist-fg bg-brutalist-bg px-4 py-3">
                        <div className="col-span-4 md:col-span-3">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Report</span>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Date</span>
                        </div>
                        <div className="col-span-2 hidden md:block">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Key Biomarkers</span>
                        </div>
                        <div className="col-span-2 hidden md:block">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Risk Level</span>
                        </div>
                        <div className="col-span-3 md:col-span-2 text-right">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Actions</span>
                        </div>
                    </div>

                    {/* Table Rows */}
                    {filteredReports.map((report, index) => (
                        <div
                            key={report.id}
                            className={`grid grid-cols-12 gap-0 px-4 py-4 items-center hover:bg-brutalist-fg/5 transition-colors cursor-pointer ${index < filteredReports.length - 1 ? 'border-b border-brutalist-fg' : ''
                                } ${selectedReport?.id === report.id ? 'bg-brutalist-fg/10' : ''}`}
                            onClick={() => setSelectedReport(report)}
                        >
                            <div className="col-span-4 md:col-span-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 border border-brutalist-fg flex items-center justify-center">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-mono block">{report.type}</span>
                                        <span className="text-xs font-mono text-brutalist-muted">{report.id}</span>
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
                                    {report.biomarkers.slice(0, 2).map((bio, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            {getTrendIcon(bio.trend)}
                                            <span className="text-xs font-mono">{bio.name}: {bio.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-2 hidden md:block">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${getRiskColor(report.riskLevel)}`} />
                                    <span className="text-sm font-mono uppercase">{report.riskLevel}</span>
                                </div>
                            </div>
                            <div className="col-span-5 md:col-span-3 flex items-center justify-end gap-2">
                                <button className="p-2 border border-brutalist-fg hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors" title="View">
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-2 border border-brutalist-fg hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors" title="Download">
                                    <Download className="w-4 h-4" />
                                </button>
                                <button className="p-2 border border-brutalist-fg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <ChevronRight className="w-4 h-4 text-brutalist-muted ml-2" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Selected Report Details */}
                {selectedReport && (
                    <div className="mt-8 border border-brutalist-fg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                                    Selected Report
                                </span>
                                <h3 className="font-space text-xl font-bold text-brutalist-fg">
                                    {selectedReport.type} - {selectedReport.id}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${getRiskColor(selectedReport.riskLevel)}`} />
                                <span className="text-sm font-mono uppercase">{selectedReport.riskLevel} RISK</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Key Findings */}
                            <div>
                                <span className="text-xs font-mono text-brutalist-muted uppercase block mb-3">
                                    Key Findings
                                </span>
                                <ul className="space-y-2">
                                    {selectedReport.keyFindings.map((finding, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-brutalist-accent mt-2" />
                                            <span className="text-sm font-mono">{finding}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* All Biomarkers */}
                            <div>
                                <span className="text-xs font-mono text-brutalist-muted uppercase block mb-3">
                                    All Biomarkers
                                </span>
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
            </div>
        </section>
    );
}

export default History;
