import { useState } from 'react';
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    BarChart3,
    Activity
} from 'lucide-react';

const availableReports = [
    { id: 'REP-2026-001', date: '2026-02-23', type: 'Blood Test' },
    { id: 'REP-2026-002', date: '2026-01-15', type: 'Complete Blood Count' },
    { id: 'REP-2025-012', date: '2025-12-20', type: 'Lipid Panel' },
    { id: 'REP-2025-011', date: '2025-11-08', type: 'Thyroid Function' },
    { id: 'REP-2025-010', date: '2025-10-03', type: 'Comprehensive Metabolic' },
    { id: 'REP-2025-009', date: '2025-09-12', type: 'HbA1c Test' },
];

const comparisonData = [
    { name: 'Glucose', unit: 'mg/dL', report1Value: 110, report2Value: 102, referenceRange: '70-100', lowerIsBetter: false },
    { name: 'HbA1c', unit: '%', report1Value: 6.2, report2Value: 5.8, referenceRange: '<5.7', lowerIsBetter: false },
    { name: 'Total Cholesterol', unit: 'mg/dL', report1Value: 195, report2Value: 188, referenceRange: '<200', lowerIsBetter: false },
    { name: 'LDL Cholesterol', unit: 'mg/dL', report1Value: 125, report2Value: 118, referenceRange: '<100', lowerIsBetter: false },
    { name: 'HDL Cholesterol', unit: 'mg/dL', report1Value: 45, report2Value: 48, referenceRange: '>40', lowerIsBetter: true },
    { name: 'Triglycerides', unit: 'mg/dL', report1Value: 125, report2Value: 110, referenceRange: '<150', lowerIsBetter: false },
    { name: 'Blood Pressure (Systolic)', unit: 'mmHg', report1Value: 135, report2Value: 128, referenceRange: '<120', lowerIsBetter: false },
    { name: 'Blood Pressure (Diastolic)', unit: 'mmHg', report1Value: 85, report2Value: 82, referenceRange: '<80', lowerIsBetter: false },
    { name: 'Creatinine', unit: 'mg/dL', report1Value: 1.1, report2Value: 1.0, referenceRange: '0.7-1.3', lowerIsBetter: false },
    { name: 'BUN', unit: 'mg/dL', report1Value: 18, report2Value: 16, referenceRange: '7-20', lowerIsBetter: false },
    { name: 'eGFR', unit: 'mL/min', report1Value: 85, report2Value: 88, referenceRange: '>90', lowerIsBetter: true },
    { name: 'Uric Acid', unit: 'mg/dL', report1Value: 6.5, report2Value: 6.2, referenceRange: '3.5-7.2', lowerIsBetter: false },
];

export function Compare() {
    const [report1, setReport1] = useState('REP-2026-001');
    const [report2, setReport2] = useState('REP-2026-002');
    const [showDropdown1, setShowDropdown1] = useState(false);
    const [showDropdown2, setShowDropdown2] = useState(false);

    const selectedReport1 = availableReports.find(r => r.id === report1);
    const selectedReport2 = availableReports.find(r => r.id === report2);

    const getChange = (val1, val2) => {
        const diff = val1 - val2;
        const percent = ((diff / val2) * 100).toFixed(1);
        return { diff, percent, improved: diff < 0 };
    };

    const getTrendIcon = (improved, lowerIsBetter) => {
        const isGood = improved === lowerIsBetter;
        if (isGood) return <TrendingDown className="w-4 h-4 text-green-500" />;
        return <TrendingUp className="w-4 h-4 text-red-500" />;
    };

    const improvedCount = comparisonData.filter(d => {
        const change = getChange(d.report1Value, d.report2Value);
        return change.improved === d.lowerIsBetter;
    }).length;

    const worsenedCount = comparisonData.length - improvedCount;

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="compare">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: REPORT_COMPARISON
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            008
                        </span>
                    </div>
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    Compare Reports
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-8 max-w-2xl">
                    Select two reports to compare side-by-side. Track changes in your health
                    parameters over time and identify trends.
                </p>

                {/* Report Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Report 1 Selector */}
                    <div className="border border-brutalist-fg p-4">
                        <span className="text-xs font-mono text-brutalist-muted uppercase block mb-2">
                            Report 1 (Recent)
                        </span>
                        <div className="relative">
                            <button
                                className="w-full flex items-center justify-between p-3 border border-brutalist-fg bg-brutalist-bg hover:bg-brutalist-fg/5 transition-colors"
                                onClick={() => setShowDropdown1(!showDropdown1)}
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-brutalist-muted" />
                                    <div className="text-left">
                                        <span className="text-sm font-mono block">{selectedReport1?.type}</span>
                                        <span className="text-xs font-mono text-brutalist-muted">{selectedReport1?.date}</span>
                                    </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown1 ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown1 && (
                                <div className="absolute top-full left-0 right-0 mt-1 border border-brutalist-fg bg-brutalist-bg z-10">
                                    {availableReports.map((report) => (
                                        <button
                                            key={report.id}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-brutalist-fg/5 transition-colors text-left"
                                            onClick={() => {
                                                setReport1(report.id);
                                                setShowDropdown1(false);
                                            }}
                                        >
                                            <span className="text-sm font-mono">{report.type}</span>
                                            <span className="text-xs font-mono text-brutalist-muted ml-auto">{report.date}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Report 2 Selector */}
                    <div className="border border-brutalist-fg p-4">
                        <span className="text-xs font-mono text-brutalist-muted uppercase block mb-2">
                            Report 2 (Previous)
                        </span>
                        <div className="relative">
                            <button
                                className="w-full flex items-center justify-between p-3 border border-brutalist-fg bg-brutalist-bg hover:bg-brutalist-fg/5 transition-colors"
                                onClick={() => setShowDropdown2(!showDropdown2)}
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-brutalist-muted" />
                                    <div className="text-left">
                                        <span className="text-sm font-mono block">{selectedReport2?.type}</span>
                                        <span className="text-xs font-mono text-brutalist-muted">{selectedReport2?.date}</span>
                                    </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown2 ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown2 && (
                                <div className="absolute top-full left-0 right-0 mt-1 border border-brutalist-fg bg-brutalist-bg z-10">
                                    {availableReports.map((report) => (
                                        <button
                                            key={report.id}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-brutalist-fg/5 transition-colors text-left"
                                            onClick={() => {
                                                setReport2(report.id);
                                                setShowDropdown2(false);
                                            }}
                                        >
                                            <span className="text-sm font-mono">{report.type}</span>
                                            <span className="text-xs font-mono text-brutalist-muted ml-auto">{report.date}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comparison Summary */}
                <div className="grid grid-cols-3 gap-0 border border-brutalist-fg mb-8">
                    <div className="p-4 border-r border-brutalist-fg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Improved</span>
                        </div>
                        <span className="font-space text-3xl font-bold text-green-500">{improvedCount}</span>
                    </div>
                    <div className="p-4 border-r border-brutalist-fg">
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
                        <span className="font-space text-3xl font-bold text-brutalist-fg">{comparisonData.length}</span>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="border border-brutalist-fg">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-0 border-b border-brutalist-fg bg-brutalist-bg px-4 py-3">
                        <div className="col-span-3 md:col-span-2">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Biomarker</span>
                        </div>
                        <div className="col-span-3 md:col-span-2 text-center">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">{selectedReport1?.date}</span>
                        </div>
                        <div className="col-span-3 md:col-span-2 text-center">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">{selectedReport2?.date}</span>
                        </div>
                        <div className="col-span-3 md:col-span-2 text-center hidden md:block">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Change</span>
                        </div>
                        <div className="col-span-2 md:col-span-2 text-center hidden md:block">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Trend</span>
                        </div>
                        <div className="col-span-3 md:col-span-2 text-right">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">Reference</span>
                        </div>
                    </div>

                    {/* Table Rows */}
                    {comparisonData.map((item, index) => {
                        const change = getChange(item.report1Value, item.report2Value);
                        const isImproved = change.improved === item.lowerIsBetter;
                        const isSignificant = Math.abs(Number(change.percent)) > 5;

                        return (
                            <div
                                key={item.name}
                                className={`grid grid-cols-12 gap-0 px-4 py-3 items-center ${index < comparisonData.length - 1 ? 'border-b border-brutalist-fg' : ''
                                    } ${isSignificant ? (isImproved ? 'bg-green-500/5' : 'bg-red-500/5') : ''}`}
                            >
                                <div className="col-span-3 md:col-span-2">
                                    <span className="text-sm font-mono">{item.name}</span>
                                    <span className="text-xs font-mono text-brutalist-muted block">{item.unit}</span>
                                </div>
                                <div className="col-span-3 md:col-span-2 text-center">
                                    <span className={`text-sm font-mono font-bold ${isSignificant && !isImproved ? 'text-red-500' : ''}`}>
                                        {item.report1Value}
                                    </span>
                                </div>
                                <div className="col-span-3 md:col-span-2 text-center">
                                    <span className="text-sm font-mono">{item.report2Value}</span>
                                </div>
                                <div className="col-span-2 md:col-span-2 text-center hidden md:block">
                                    <div className={`flex items-center justify-center gap-1 ${isImproved ? 'text-green-500' : 'text-red-500'}`}>
                                        {getTrendIcon(change.improved, item.lowerIsBetter)}
                                        <span className="text-sm font-mono font-bold">
                                            {change.diff > 0 ? '+' : ''}{change.diff}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-mono ${isImproved ? 'text-green-500' : 'text-red-500'}`}>
                                        {change.percent}%
                                    </span>
                                </div>
                                <div className="col-span-2 md:col-span-2 text-center hidden md:block">
                                    <div className="flex items-center justify-center gap-1">
                                        <BarChart3 className="w-3 h-3 text-brutalist-muted" />
                                        <span className={`text-xs font-mono ${isImproved ? 'text-green-500' : isSignificant ? 'text-red-500' : 'text-brutalist-muted'}`}>
                                            {isImproved ? 'Improved' : isSignificant ? 'Worsened' : 'Stable'}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-3 md:col-span-2 text-right">
                                    <span className="text-xs font-mono text-brutalist-muted">{item.referenceRange}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Visual Comparison Bars */}
                <div className="mt-8 border border-brutalist-fg p-6">
                    <h3 className="font-space text-lg font-bold text-brutalist-fg mb-6">
                        Visual Comparison
                    </h3>
                    <div className="space-y-4">
                        {comparisonData.slice(0, 6).map((item) => {
                            const maxVal = Math.max(item.report1Value, item.report2Value) * 1.2;
                            const width1 = (item.report1Value / maxVal) * 100;
                            const width2 = (item.report2Value / maxVal) * 100;
                            const change = getChange(item.report1Value, item.report2Value);
                            const isImproved = change.improved === item.lowerIsBetter;

                            return (
                                <div key={item.name} className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-3 md:col-span-2">
                                        <span className="text-xs font-mono">{item.name}</span>
                                    </div>
                                    <div className="col-span-9 md:col-span-10">
                                        <div className="flex items-center gap-4">
                                            {/* Report 1 Bar */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono text-brutalist-muted w-16">{selectedReport1?.date}</span>
                                                    <div className="flex-1 h-4 bg-brutalist-fg/10 overflow-hidden">
                                                        <div
                                                            className={`h-full ${isImproved ? 'bg-green-500' : 'bg-orange-500'}`}
                                                            style={{ width: `${width1}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono w-12 text-right">{item.report1Value}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* Report 2 Bar */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-brutalist-muted w-16">{selectedReport2?.date}</span>
                                                    <div className="flex-1 h-4 bg-brutalist-fg/10 overflow-hidden">
                                                        <div
                                                            className="h-full bg-brutalist-fg/40"
                                                            style={{ width: `${width2}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono w-12 text-right">{item.report2Value}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-brutalist-muted">
                            Comparing {selectedReport1?.id} vs {selectedReport2?.id}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 border border-brutalist-fg text-sm font-mono hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors">
                            Export Comparison
                        </button>
                        <button className="px-4 py-2 bg-brutalist-accent text-white text-sm font-mono hover:bg-brutalist-accent/80 transition-colors">
                            Share with Doctor
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Compare;
