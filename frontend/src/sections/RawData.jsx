import { useEffect, useRef, useState } from 'react';

const terminalLogs = [
    '> Initializing AI pipeline...',
    '> Loading model weights: 2.4GB',
    '> Connecting to data stream...',
    '> Analyzing codebase...',
    '> Running inference: batch_01',
    '> Optimization pass: 1/3',
    '> Optimization pass: 2/3',
    '> Optimization pass: 3/3',
    '> 98% Optimized',
    '> Deploying to edge nodes...',
    '> Status: OPERATIONAL',
    '> Latency: 12ms p99',
    '> Throughput: 14.2k req/s',
];

export function RawData() {
    const [visibleLogs, setVisibleLogs] = useState([]);
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const terminalRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (currentLogIndex < terminalLogs.length) {
                setVisibleLogs((prev) => [...prev, terminalLogs[currentLogIndex]]);
                setCurrentLogIndex((prev) => prev + 1);
                if (terminalRef.current) {
                    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
                }
            } else {
                // Reset after a delay
                setTimeout(() => {
                    setVisibleLogs([]);
                    setCurrentLogIndex(0);
                }, 3000);
            }
        }, 400);

        return () => clearInterval(interval);
    }, [currentLogIndex]);

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8">
            {/* Section Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: RAW_DATA
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            004
                        </span>
                    </div>
                </div>
            </div>

            {/* Terminal & Neural Scan Grid */}
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-brutalist-fg">
                    {/* Terminal */}
                    <div className="border-b lg:border-b-0 lg:border-r border-brutalist-fg">
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-brutalist-fg bg-brutalist-bg">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-brutalist-accent" />
                                <div className="w-3 h-3 border border-brutalist-fg" />
                                <div className="w-3 h-3 border border-brutalist-fg" />
                            </div>
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                terminal.sys
                            </span>
                        </div>

                        {/* Terminal Content */}
                        <div
                            ref={terminalRef}
                            className="h-64 md:h-80 bg-[#1a1a1a] p-4 overflow-y-auto font-mono text-sm"
                        >
                            {visibleLogs.map((log, index) => (
                                <div
                                    key={index}
                                    className="text-brutalist-terminal mb-1 opacity-0 animate-[fadeIn_0.2s_ease forwards]"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    {log}
                                </div>
                            ))}
                            <span className="inline-block w-2 h-4 bg-brutalist-terminal animate-blink mt-1" />
                        </div>
                    </div>

                    {/* Neural Scan */}
                    <div>
                        {/* Neural Scan Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-brutalist-fg bg-brutalist-bg">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                neural_scan.dither
                            </span>
                            <span className="text-xs font-mono text-brutalist-muted">
                                320x240
                            </span>
                        </div>

                        {/* Neural Scan Content */}
                        <div className="h-64 md:h-80 bg-brutalist-bg relative overflow-hidden">
                            {/* Dithered Pattern */}
                            <div className="absolute inset-0 dither-pattern opacity-30" />

                            {/* Scan Lines */}
                            <div className="absolute inset-0">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-full h-px bg-brutalist-fg/10"
                                        style={{ marginTop: `${i * 5}%` }}
                                    />
                                ))}
                            </div>

                            {/* Animated Scan Bar */}
                            <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-brutalist-accent/20 to-transparent animate-scan" />

                            {/* Neural Network Visualization */}
                            <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox="0 0 320 240"
                                preserveAspectRatio="xMidYMid slice"
                            >
                                {/* Nodes */}
                                {Array.from({ length: 15 }).map((_, i) => {
                                    const x = 30 + (i % 5) * 65;
                                    const y = 40 + Math.floor(i / 5) * 80;
                                    return (
                                        <circle
                                            key={`node-${i}`}
                                            cx={x}
                                            cy={y}
                                            r="4"
                                            fill="#1a1a1a"
                                            className="animate-pulse"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                        />
                                    );
                                })}

                                {/* Connections */}
                                {Array.from({ length: 15 }).map((_, i) => {
                                    const x1 = 30 + (i % 5) * 65;
                                    const y1 = 40 + Math.floor(i / 5) * 80;
                                    const connections = [];

                                    for (let j = 0; j < 15; j++) {
                                        if (i !== j && Math.random() > 0.7) {
                                            const x2 = 30 + (j % 5) * 65;
                                            const y2 = 40 + Math.floor(j / 5) * 80;
                                            connections.push(
                                                <line
                                                    key={`conn-${i}-${j}`}
                                                    x1={x1}
                                                    y1={y1}
                                                    x2={x2}
                                                    y2={y2}
                                                    stroke="#1a1a1a"
                                                    strokeWidth="0.5"
                                                    opacity="0.3"
                                                />
                                            );
                                        }
                                    }
                                    return connections;
                                })}
                            </svg>

                            {/* Corner Markers */}
                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brutalist-fg" />
                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brutalist-fg" />
                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brutalist-fg" />
                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brutalist-fg" />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </section>
    );
}

export default RawData;
