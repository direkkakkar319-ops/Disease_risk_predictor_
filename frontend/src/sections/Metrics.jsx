import { useEffect, useState } from 'react';

const metrics = [
    { label: 'Avg Latency', value: '4.2', unit: 'ms' },
    { label: 'Requests / sec', value: '12.8', unit: 'K' },
    { label: 'Uptime', value: '99.97', unit: '%' },
    { label: 'Models Deployed', value: '147', unit: '' },
];

export function Metrics() {
    const [animatedValues, setAnimatedValues] = useState(
        metrics.map(() => '0')
    );

    useEffect(() => {
        const duration = 2000;
        const steps = 60;
        const interval = duration / steps;

        metrics.forEach((metric, index) => {
            const targetValue = parseFloat(metric.value);
            const isDecimal = metric.value.includes('.');
            let currentStep = 0;

            const timer = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = targetValue * eased;

                setAnimatedValues((prev) => {
                    const newValues = [...prev];
                    newValues[index] = isDecimal
                        ? current.toFixed(1)
                        : Math.floor(current).toString();
                    return newValues;
                });

                if (currentStep >= steps) {
                    clearInterval(timer);
                    setAnimatedValues((prev) => {
                        const newValues = [...prev];
                        newValues[index] = metric.value;
                        return newValues;
                    });
                }
            }, interval);
        });
    }, []);

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <span className="text-xs font-mono text-brutalist-muted uppercase">
                        inference.metrics
                    </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-brutalist-fg">
                    {metrics.map((metric, index) => (
                        <div
                            key={metric.label}
                            className={`p-6 md:p-8 ${index < metrics.length - 1
                                    ? 'border-r-0 md:border-r border-b md:border-b-0 border-brutalist-fg'
                                    : ''
                                } ${index < 2 ? 'border-b md:border-b-0 border-brutalist-fg' : ''}`}
                        >
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="font-space text-3xl md:text-4xl lg:text-5xl font-bold text-brutalist-fg">
                                    {animatedValues[index]}
                                </span>
                                {metric.unit && (
                                    <span className="text-sm font-mono text-brutalist-muted">
                                        {metric.unit}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider">
                                {metric.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Metrics;
