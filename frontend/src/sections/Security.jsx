import { Shield, Lock, Eye, Trash2 } from 'lucide-react';

const securityFeatures = [
    {
        icon: <Lock className="w-5 h-5" />,
        title: 'End-to-End Encryption',
        description:
            'All health data is encrypted with AES-256 both in transit and at rest. Your reports are never stored in plain text.',
    },
    {
        icon: <Eye className="w-5 h-5" />,
        title: 'Zero-Knowledge Processing',
        description:
            'Our AI analyzes your data without human intervention. No healthcare worker sees your raw reports.',
    },
    {
        icon: <Trash2 className="w-5 h-5" />,
        title: 'Auto-Delete Option',
        description:
            'Choose to automatically delete your reports after analysis. No data retention unless you opt in.',
    },
    {
        icon: <Shield className="w-5 h-5" />,
        title: 'Anonymous Analysis',
        description:
            'Reports are processed with anonymized identifiers. Your identity is never linked to analysis data.',
    },
];

export function Security() {
    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="security">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
                            // SECTION: SECURITY_PROTOCOLS
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            006
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column */}
                    <div>
                        <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                            Your Health Data
                            <br />
                            <span className="text-brutalist-accent">Is Protected</span>
                        </h2>
                        <p className="text-sm font-mono text-brutalist-muted mb-8 leading-relaxed">
                            We understand the sensitivity of your health information. That is why
                            we have built enterprise-grade security into every layer of our
                            platform. Your data is encrypted, anonymized, and never shared.
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="text-center p-4 border border-brutalist-fg">
                                <span className="font-space text-2xl font-bold text-brutalist-fg block">
                                    256-bit
                                </span>
                                <span className="text-xs font-mono text-brutalist-muted uppercase">
                                    Encryption
                                </span>
                            </div>
                            <div className="text-center p-4 border border-brutalist-fg">
                                <span className="font-space text-2xl font-bold text-brutalist-fg block">
                                    0
                                </span>
                                <span className="text-xs font-mono text-brutalist-muted uppercase">
                                    Data Breaches
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Security Features */}
                    <div className="space-y-4">
                        {securityFeatures.map((feature) => (
                            <div
                                key={feature.title}
                                className="border border-brutalist-fg p-4 hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 border border-current flex items-center justify-center flex-shrink-0 group-hover:bg-brutalist-accent group-hover:border-brutalist-accent">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-space font-bold text-lg mb-1">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm font-mono opacity-70 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Security;
