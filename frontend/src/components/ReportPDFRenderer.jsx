import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// We define getStatusColor locally just in case it's not exported from reportUtils
const localGetStatusColor = (status) => {
    switch (status) {
        case 'low':
        case 'normal': return '#22c55e';
        case 'moderate':
        case 'elevated': return '#f97316';
        case 'high':
        case 'critical': return '#ef4444';
        default: return '#1a1a1a';
    }
};

export const ReportPDFRenderer = forwardRef(({ reportData }, ref) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);

    const riskMetrics = reportData?.riskMetrics ?? [];
    const biomarkers = reportData?.biomarkers ?? [];
    const recommendation = reportData?.recommendations?.[0] ?? 'No specific recommendations at this time.';

    useImperativeHandle(ref, () => ({
        generatePDF: async () => {
            if (!containerRef.current) return;
            
            // Wait a small amount of time to ensure chart is drawn and fonts are loaded
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                const element = containerRef.current;
                const canvas = await html2canvas(element, {
                    scale: 2, // Higher resolution
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                
                // Calculate dimensions for A4 PDF
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(reportData?.filename ? `report-${reportData.filename}.pdf` : `report-analysis.pdf`);
                return true;
            } catch (error) {
                console.error("Error generating PDF:", error);
                throw error;
            }
        }
    }));

    // Radar chart drawing logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !riskMetrics.length) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            // Fallback for hidden elements having 0 width
            const width = rect.width || 300; 
            const height = rect.height || 300;
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
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
            ctx.font = '10px "IBM Plex Mono", monospace';
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

    if (!reportData) return null;

    return (
        <div 
            style={{ 
                position: 'fixed', 
                top: '-9999px', 
                left: '-9999px', 
                width: '1000px', // Fixed width ensures consistent PDF generation layout
                background: '#ffffff',
                zIndex: -9999,
                color: '#1a1a1a', // brutalist-fg
            }}
        >
            <div ref={containerRef} className="p-8 bg-[#e8e8e3] font-sans">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-[#666666]">// SECTION: YOUR_RESULTS</span>
                    </div>
                    <span className="text-xs font-mono text-green-600 uppercase">
                        Analyzed · {reportData.reportType} · {reportData.filename}
                    </span>
                </div>

                <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Your Analysis Results
                </h2>
                <p className="text-sm font-mono text-[#666666] mb-6 max-w-2xl">
                    Risk analysis for your {reportData.reportType} report. Not a medical diagnosis.
                </p>

                {/* Risk Level Badge */}
                <div className="mb-8 inline-flex items-center gap-3 px-4 py-2 border border-[#1a1a1a]">
                    <span className="text-xs font-mono text-[#666666] uppercase">Overall Risk</span>
                    <span 
                        className="text-sm font-mono font-bold px-3 py-1 uppercase"
                        style={{ 
                            backgroundColor: localGetStatusColor(reportData.riskLevel),
                            color: 'white',
                        }}
                    >
                        {reportData.riskLevel}
                    </span>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-3 gap-0 border border-[#1a1a1a] bg-[#e8e8e3]">
                    
                    {/* Risk Overview */}
                    <div className="border-r border-[#1a1a1a] p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-[#666666] uppercase">Risk Overview</span>
                            <TrendingUp className="w-4 h-4 text-[#666666]" />
                        </div>
                        <div className="space-y-4">
                            {riskMetrics.map((metric) => (
                                <div key={metric.name} className="p-3 border border-[#1a1a1a]/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-mono">{metric.name}</span>
                                        <span 
                                            className="text-xs font-mono px-2 py-0.5"
                                            style={{ backgroundColor: localGetStatusColor(metric.status), color: 'white' }}
                                        >
                                            {metric.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-[#1a1a1a]/10 overflow-hidden">
                                            <div 
                                                className="h-full"
                                                style={{ 
                                                    width: `${metric.value}%`,
                                                    backgroundColor: localGetStatusColor(metric.status),
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
                    <div className="border-r border-[#1a1a1a] p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-[#666666] uppercase">Risk Radar</span>
                            <Info className="w-4 h-4 text-[#666666]" />
                        </div>
                        <div className="aspect-square" style={{ minHeight: '250px' }}>
                            <canvas ref={canvasRef} className="w-full h-full block" />
                        </div>
                    </div>

                    {/* Biomarkers + Recommendations */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-[#666666] uppercase">Key Biomarkers</span>
                            <CheckCircle className="w-4 h-4 text-[#666666]" />
                        </div>
                        <div className="space-y-4">
                            {biomarkers.map((marker) => (
                                <div key={marker.name} className="border border-[#1a1a1a]/20 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-mono">{marker.name}</span>
                                        <span 
                                            className="text-xs font-mono px-2 py-0.5"
                                            style={{ backgroundColor: localGetStatusColor(marker.status), color: 'white' }}
                                        >
                                            {marker.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                            {marker.value}
                                        </span>
                                        <span className="text-xs font-mono text-[#666666]">{marker.unit}</span>
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-[#666666]">
                                        Reference: {marker.range}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {reportData?.keyFactors?.length > 0 && (
                            <div className="mt-4 p-4 border border-[#1a1a1a]/20">
                                <span className="text-xs font-mono text-[#666666] uppercase block mb-2">
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

                        <div className="mt-6 p-4 border border-[#f43f5e] bg-[#f43f5e]/5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-[#f43f5e] flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-sm font-mono font-bold block mb-1">Recommendation</span>
                                    <span className="text-xs font-mono text-[#666666]">{recommendation}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

ReportPDFRenderer.displayName = 'ReportPDFRenderer';
