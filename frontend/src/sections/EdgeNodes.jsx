import { useEffect, useState } from 'react';

const edgeNodes = [
    { region: 'US-EAST-1', status: 'ONLINE', latency: '3.8ms' },
    { region: 'EU-WEST-2', status: 'ONLINE', latency: '4.1ms' },
    { region: 'AP-SOUTH-1', status: 'ONLINE', latency: '4.6ms' },
    { region: 'US-WEST-2', status: 'ONLINE', latency: '4.2ms' },
];

export function EdgeNodes() {
    const [tick, setTick] = useState(0);
    const [throughput, setThroughput] = useState(87);

    useEffect(() => {
        const interval = setInterval(() => {
            setTick((prev) => (prev + 1) % 10000);
            setThroughput((prev) => {
                const change = (Math.random() - 0.5) * 2;
                return Math.max(80, Math.min(95, prev + change));
            });
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <span className="text-xs font-mono text-brutalist-muted uppercase">
                        edge_nodes.status
                    </span>
                    <span className="text-xs font-mono text-brutalist-muted">
                        TICK:{tick.toString().padStart(4, '0')}
                    </span>
                </div>

                {/* Status Table */}
                <div className="border border-brutalist-fg">
                    {/* Table Header */}
                    <div className="grid grid-cols-3 gap-0 border-b border-brutalist-fg bg-brutalist-bg">
                        <div className="px-4 py-3 border-r border-brutalist-fg">
                            <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider">
                                Region
                            </span>
                        </div>
                        <div className="px-4 py-3 border-r border-brutalist-fg">
                            <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider">
                                Status
                            </span>
                        </div>
                        <div className="px-4 py-3">
                            <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider">
                                Latency
                            </span>
                        </div>
                    </div>

                    {/* Table Rows */}
                    {edgeNodes.map((node, index) => (
                        <div
                            key={node.region}
                            className={`grid grid-cols-3 gap-0 ${index < edgeNodes.length - 1 ? 'border-b border-brutalist-fg' : ''
                                }`}
                        >
                            <div className="px-4 py-4 border-r border-brutalist-fg">
                                <span className="text-sm font-mono text-brutalist-fg">
                                    {node.region}
                                </span>
                            </div>
                            <div className="px-4 py-4 border-r border-brutalist-fg flex items-center gap-2">
                                <span
                                    className={`w-2 h-2 rounded-full ${node.status === 'ONLINE'
                                            ? 'bg-green-500 animate-pulse'
                                            : node.status === 'DEGRADED'
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                        }`}
                                />
                                <span className="text-sm font-mono text-brutalist-fg">
                                    {node.status}
                                </span>
                            </div>
                            <div className="px-4 py-4">
                                <span className="text-sm font-mono text-brutalist-fg">
                                    {node.latency}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Global Throughput */}
                <div className="mt-8 flex items-center justify-between">
                    <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider">
                        Global Throughput
                    </span>
                    <div className="flex items-center gap-4">
                        <div className="w-48 h-2 bg-brutalist-bg border border-brutalist-fg overflow-hidden">
                            <div
                                className="h-full bg-brutalist-fg transition-all duration-300"
                                style={{ width: `${throughput}%` }}
                            />
                        </div>
                        <span className="text-sm font-mono text-brutalist-fg w-12 text-right">
                            {throughput.toFixed(0)}%
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EdgeNodes;
