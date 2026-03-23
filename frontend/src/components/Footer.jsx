import { Activity } from 'lucide-react';

const footerLinks = [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'HIPAA', href: '#' },
    { label: 'Contact', href: '#' },
];

const resourceLinks = [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Support', href: '#' },
];

export function Footer() {
    return (
        <footer className="py-12 md:py-16 px-4 md:px-6 lg:px-8 border-t border-brutalist-fg">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {/* Logo & Description */}
                    <div>
                        <a href="#" className="flex items-center gap-2 group mb-4">
                            <Activity className="w-5 h-5 text-brutalist-fg" />
                            <span className="font-space font-bold text-sm tracking-wider text-brutalist-fg">
                                MEDSCAN.AI
                            </span>
                        </a>
                        <p className="text-sm font-mono text-brutalist-muted leading-relaxed mb-4">
                            AI-powered health report analysis. Predict disease risks,
                            visualize biomarkers, and take control of your health.
                        </p>
                        <span className="text-xs font-mono text-brutalist-muted">
                            HIPAA Compliant • SOC 2 Certified
                        </span>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider block mb-4">
                            Legal
                        </span>
                        <ul className="space-y-2">
                            {footerLinks.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="text-sm font-mono text-brutalist-fg hover:text-brutalist-accent transition-colors"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resource Links */}
                    <div>
                        <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider block mb-4">
                            Resources
                        </span>
                        <ul className="space-y-2">
                            {resourceLinks.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="text-sm font-mono text-brutalist-fg hover:text-brutalist-accent transition-colors"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-brutalist-fg flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-xs font-mono text-brutalist-muted">
                        (C) 2026 MEDSCAN.AI. All rights reserved.
                    </span>
                    <div className="flex items-center gap-6">
                        <span className="text-xs font-mono text-brutalist-muted">
                            Made with care for your health
                        </span>
                    </div>
                </div>

                {/* Medical Disclaimer */}
                <div className="mt-8 p-4 border border-brutalist-fg/30 bg-brutalist-fg/5">
                    <span className="text-xs font-mono text-brutalist-muted leading-relaxed block">
                        <strong>Medical Disclaimer:</strong> MEDSCAN.AI provides risk assessments based on
                        pattern analysis and is not a substitute for professional medical advice,
                        diagnosis, or treatment. Always seek the advice of your physician or other
                        qualified health provider with any questions you may have regarding a medical condition.
                    </span>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
