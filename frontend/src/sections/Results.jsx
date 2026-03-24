import { useEffect, useRef, useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const riskMetrics = [
    { name: 'Cardiovascular', value: 23, status: 'low', trend: 'stable' },
    { name: 'Diabetes Type 2', value: 67, status: 'moderate', trend: 'up' },
    { name: 'Hypertension', value: 45, status: 'moderate', trend: 'down' },
    { name: 'Liver Function', value: 12, status: 'low', trend: 'stable' },
    { name: 'Kidney Health', value: 89, status: 'high', trend: 'up' },
];

const biomarkers = [
    { name: 'Glucose', value: 110, unit: 'mg/dL', range: '70-100', status: 'elevated' },
    { name: 'Cholesterol', value: 195, unit: 'mg/dL', range: '<200', status: 'normal' },
    { name: 'HbA1c', value: 6.2, unit: '%', range: '<5.7', status: 'elevated' },
    { name: 'Blood Pressure', value: '135/85', unit: 'mmHg', range: '<120/80', status: 'elevated' },
];

export function Results() {
    const canvasRef = useRef(null);
    const [selectedMetric, setSelectedMetric] = useState(riskMetrics[1]);

    // Draw radar chart
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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

        // Draw grid circles
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
            ctx.strokeStyle = i === 5 ? '#1a1a1a' : '#d4d4c8';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw axes
        const angleStep = (Math.PI * 2) / riskMetrics.length;
        riskMetrics.forEach((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#d4d4c8';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Labels
            const labelX = centerX + Math.cos(angle) * (radius + 25);
            const labelY = centerY + Math.sin(angle) * (radius + 25);
            ctx.fillStyle = '#1a1a1a';
            ctx.font = '10px "IBM Plex Mono"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(riskMetrics[i].name, labelX, labelY);
        });

        // Draw data polygon
        ctx.beginPath();
        riskMetrics.forEach((metric, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const value = metric.value / 100;
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw data points
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
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'low':
            case 'normal':
                return '#22c55e';
            case 'moderate':
            case 'elevated':
                return '#f97316';
            case 'high':
            case 'critical':
                return '#ef4444';
            default:
                return '#1a1a1a';
        }
    };

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="results">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: SAMPLE_RESULTS
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            003
                        </span>
                    </div>
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    Sample Analysis Results
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-12 max-w-2xl">
                    View a preview of what your health analysis dashboard looks like.
                    Interactive charts, risk scores, and personalized recommendations.
                </p>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-brutalist-fg">
                    {/* Risk Overview */}
                    <div className="border-b lg:border-b-0 lg:border-r border-brutalist-fg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                Risk Overview
                            </span>
                            <TrendingUp className="w-4 h-4 text-brutalist-muted" />
                        </div>

                        <div className="space-y-4">
                            {riskMetrics.map((metric) => (
                                <div
                                    key={metric.name}
                                    className={`cursor-pointer transition-all p-3 border ${selectedMetric.name === metric.name
                                            ? 'border-brutalist-accent bg-brutalist-accent/5'
                                            : 'border-brutalist-fg/20 hover:border-brutalist-fg'
                                        }`}
                                    onClick={() => setSelectedMetric(metric)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-mono">{metric.name}</span>
                                        <span
                                            className="text-xs font-mono px-2 py-0.5"
                                            style={{
                                                backgroundColor: getStatusColor(metric.status),
                                                color: 'white',
                                            }}
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
                                        <span className="text-sm font-mono w-10 text-right">
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
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                Risk Radar
                            </span>
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

                    {/* Biomarkers */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                Key Biomarkers
                            </span>
                            <CheckCircle className="w-4 h-4 text-brutalist-muted" />
                        </div>

                        <div className="space-y-4">
                            {biomarkers.map((marker) => (
                                <div key={marker.name} className="border border-brutalist-fg/20 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-mono">{marker.name}</span>
                                        <span
                                            className="text-xs font-mono px-2 py-0.5"
                                            style={{
                                                backgroundColor: getStatusColor(marker.status),
                                                color: 'white',
                                            }}
                                        >
                                            {marker.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-space text-2xl font-bold text-brutalist-fg">
                                            {marker.value}
                                        </span>
                                        <span className="text-xs font-mono text-brutalist-muted">
                                            {marker.unit}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-brutalist-muted">
                                        Reference: {marker.range} {marker.unit}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Alert Box */}
                        <div className="mt-6 p-4 border border-brutalist-accent bg-brutalist-accent/5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-brutalist-accent flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-sm font-mono font-bold block mb-1">
                                        Recommendation
                                    </span>
                                    <span className="text-xs font-mono text-brutalist-muted">
                                        Based on your HbA1c levels, consider consulting an endocrinologist
                                        for diabetes screening.
                                    </span>
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
