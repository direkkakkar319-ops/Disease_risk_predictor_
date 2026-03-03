import { useEffect, useState } from 'react';

const stats = [
    { label: 'MODELS_DEPLOYED', value: '147' },
    { label: 'EDGE_REGIONS', value: '50+' },
    { label: 'INFERENCE_CALLS', value: '12.8B' },
    { label: 'AVG_LATENCY', value: '4.2ms' },
];

export function About() {
    const [uptime, setUptime] = useState({ days: 366, hours: 9, minutes: 40, seconds: 15 });

    useEffect(() => {
        const interval = setInterval(() => {
            setUptime((prev) => {
                let { days, hours, minutes, seconds } = prev;
                seconds++;
                if (seconds >= 60) {
                    seconds = 0;
                    minutes++;
                }
                if (minutes >= 60) {
                    minutes = 0;
                    hours++;
                }
                if (hours >= 24) {
                    hours = 0;
                    days++;
                }
                return { days, hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="company">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: ABOUT_SYS.INT
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            005
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left Column - Visual */}
                    <div>
                        {/* Render Label */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                RENDER: isometric_infrastructure.obj
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 animate-pulse" />
                                <span className="text-xs font-mono text-brutalist-muted uppercase">
                                    LIVE
                                </span>
                            </div>
                        </div>

                        {/* Isometric Visualization */}
                        <div className="border border-brutalist-fg bg-brutalist-bg relative overflow-hidden">
                            {/* Camera Info */}
                            <div className="absolute top-4 left-4 z-10">
                                <span className="text-xs font-mono text-brutalist-muted">
                                    CAM: -45deg / ISO
                                </span>
                            </div>
                            <div className="absolute top-4 right-4 z-10">
                                <span className="text-xs font-mono text-brutalist-muted">
                                    RES: 2048x2048
                                </span>
                            </div>

                            {/* Isometric Grid */}
                            <div className="h-64 md:h-80 relative">
                                <svg
                                    className="absolute inset-0 w-full h-full"
                                    viewBox="0 0 400 300"
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    {/* Grid Lines */}
                                    <defs>
                                        <pattern
                                            id="grid"
                                            width="40"
                                            height="40"
                                            patternUnits="userSpaceOnUse"
                                        >
                                            <path
                                                d="M 40 0 L 0 0 0 40"
                                                fill="none"
                                                stroke="#1a1a1a"
                                                strokeWidth="0.5"
                                                opacity="0.3"
                                            />
                                        </pattern>
                                    </defs>
                                    <rect width="400" height="300" fill="url(#grid)" />

                                    {/* Isometric Cubes */}
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const row = Math.floor(i / 4);
                                        const col = i % 4;
                                        const x = 80 + col * 60 + row * 30;
                                        const y = 100 + row * 35 - col * 15;
                                        const height = 20 + Math.random() * 40;

                                        return (
                                            <g key={i}>
                                                {/* Cube Top */}
                                                <polygon
                                                    points={`${x},${y} ${x + 30},${y - 15} ${x + 60},${y} ${x + 30},${y + 15}`}
                                                    fill="#f0f0e8"
                                                    stroke="#1a1a1a"
                                                    strokeWidth="1"
                                                    className="animate-pulse"
                                                    style={{ animationDelay: `${i * 0.1}s` }}
                                                />
                                                {/* Cube Front */}
                                                <polygon
                                                    points={`${x},${y} ${x + 30},${y + 15} ${x + 30},${y + 15 + height} ${x},${y + height}`}
                                                    fill="#e0e0d8"
                                                    stroke="#1a1a1a"
                                                    strokeWidth="1"
                                                />
                                                {/* Cube Side */}
                                                <polygon
                                                    points={`${x + 60},${y} ${x + 30},${y + 15} ${x + 30},${y + 15 + height} ${x + 60},${y + height}`}
                                                    fill="#d0d0c8"
                                                    stroke="#1a1a1a"
                                                    strokeWidth="1"
                                                />
                                            </g>
                                        );
                                    })}

                                    {/* Connection Lines */}
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <line
                                            key={`conn-${i}`}
                                            x1={100 + Math.random() * 200}
                                            y1={80 + Math.random() * 100}
                                            x2={100 + Math.random() * 200}
                                            y2={80 + Math.random() * 100}
                                            stroke="#f97316"
                                            strokeWidth="1"
                                            opacity="0.5"
                                            className="animate-pulse"
                                            style={{ animationDelay: `${i * 0.2}s` }}
                                        />
                                    ))}
                                </svg>

                                {/* Corner Markers */}
                                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brutalist-fg" />
                                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brutalist-fg" />
                                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brutalist-fg" />
                                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brutalist-fg" />
                            </div>

                            {/* Manifest Label */}
                            <div className="px-4 py-2 border-t border-brutalist-fg">
                                <span className="text-xs font-mono text-brutalist-muted">
                                    MANIFEST.md v3.1.0
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Content */}
                    <div className="flex flex-col justify-between">
                        <div>
                            <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-6 leading-tight">
                                Infrastructure built for
                                <br />
                                <span className="text-brutalist-accent">raw intelligence</span>
                            </h2>

                            <p className="text-sm font-mono text-brutalist-muted leading-relaxed mb-6">
                                We engineer the substrate layer that sits between your models and
                                your users. No abstractions. No magic. Just deterministic routing,
                                sub-5ms inference, and transparent operational control across every
                                edge node in the network.
                            </p>

                            <p className="text-sm font-mono text-brutalist-muted leading-relaxed">
                                Founded by systems engineers who spent a decade building distributed
                                compute at hyperscale. We believe AI infrastructure should be
                                inspectable, auditable, and brutally fast.
                            </p>
                        </div>

                        {/* Uptime Counter */}
                        <div className="mt-8 pt-6 border-t border-brutalist-fg">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs font-mono text-brutalist-muted uppercase">
                                    Uptime:
                                </span>
                                <span className="text-sm font-mono text-brutalist-fg">
                                    {uptime.days}d {uptime.hours.toString().padStart(2, '0')}h{' '}
                                    {uptime.minutes.toString().padStart(2, '0')}m{' '}
                                    {uptime.seconds.toString().padStart(2, '0')}s
                                </span>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {stats.map((stat) => (
                                    <div key={stat.label}>
                                        <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                                            {stat.label}
                                        </span>
                                        <span className="font-space text-xl font-bold text-brutalist-fg">
                                            {stat.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default About;
