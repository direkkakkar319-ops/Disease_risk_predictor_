import { Shield, Lock, Eye, Server, FileCheck, Trash2 } from 'lucide-react';

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
        icon: <Server className="w-5 h-5" />,
        title: 'HIPAA Compliant',
        description:
            'Fully compliant with HIPAA regulations. Regular third-party audits ensure data protection standards.',
    },
    {
        icon: <FileCheck className="w-5 h-5" />,
        title: ' SOC 2 Certified',
        description:
            'Our infrastructure meets SOC 2 Type II standards for security, availability, and confidentiality.',
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

const certifications = [
    'HIPAA',
    'SOC 2',
    'GDPR',
    'ISO 27001',
    'HITECH',
    'FDA',
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
                            004
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

                        {/* Certifications */}
                        <div className="border border-brutalist-fg p-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase block mb-4">
                                Certifications & Compliance
                            </span>
                            <div className="grid grid-cols-3 gap-3">
                                {certifications.map((cert) => (
                                    <div
                                        key={cert}
                                        className="border border-brutalist-fg px-3 py-2 text-center"
                                    >
                                        <span className="text-xs font-mono font-bold">{cert}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mt-6">
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
                            <div className="text-center p-4 border border-brutalist-fg">
                                <span className="font-space text-2xl font-bold text-brutalist-fg block">
                                    99.9%
                                </span>
                                <span className="text-xs font-mono text-brutalist-muted uppercase">
                                    Uptime SLA
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

                {/* Trust Banner */}
                <div className="mt-12 p-6 border border-brutalist-fg bg-brutalist-fg text-brutalist-bg">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Shield className="w-8 h-8 text-brutalist-accent" />
                            <div>
                                <span className="font-space font-bold text-lg block">
                                    Trusted by Healthcare Providers
                                </span>
                                <span className="text-sm font-mono opacity-70">
                                    500+ hospitals and clinics use MEDSCAN.AI for patient screening
                                </span>
                            </div>
                        </div>
                        <button className="px-6 py-3 bg-brutalist-bg text-brutalist-fg text-sm font-mono uppercase tracking-wider hover:bg-brutalist-accent hover:text-white transition-colors">
                            View Security Whitepaper
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Security;
