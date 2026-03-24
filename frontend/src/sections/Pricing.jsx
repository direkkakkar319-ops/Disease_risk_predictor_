import { useEffect, useState } from 'react';
import { Check, X, ArrowRight, Stethoscope, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pricingTiers = [
    {
        id: 'basic',
        name: 'BASIC',
        number: '01',
        price: '$0',
        unit: '/ month',
        description: 'Perfect for occasional health checkups. Limited reports per month.',
        icon: <Stethoscope className="w-5 h-5" />,
        features: [
            { text: '3 reports / month', included: true },
            { text: 'Basic disease detection (20+)', included: true },
            { text: 'PDF summary download', included: true },
            { text: '7-day data retention', included: true },
            { text: 'Advanced visualizations', included: false },
            { text: 'Historical tracking', included: false },
            { text: 'Family sharing', included: false },
            { text: 'API access', included: false },
        ],
        cta: 'START FREE',
    },
    {
        id: 'premium',
        name: 'PREMIUM',
        number: '02',
        price: '$19',
        unit: '/ month',
        description: 'Unlimited reports with full disease detection and advanced analytics.',
        icon: <Users className="w-5 h-5" />,
        features: [
            { text: 'Unlimited reports', included: true },
            { text: 'Full disease detection (50+)', included: true },
            { text: 'PDF & Excel downloads', included: true },
            { text: 'Unlimited data retention', included: true },
            { text: 'Advanced visualizations', included: true },
            { text: 'Historical tracking', included: true },
            { text: 'Family sharing (up to 4)', included: true },
            { text: 'API access', included: false },
        ],
        cta: 'GET PREMIUM',
        recommended: true,
    },
    {
        id: 'enterprise',
        name: 'ENTERPRISE',
        number: '03',
        price: 'CUSTOM',
        unit: '',
        description: 'For hospitals, clinics, and healthcare providers. Full integration.',
        icon: <Building2 className="w-5 h-5" />,
        features: [
            { text: 'Unlimited everything', included: true },
            { text: 'All 50+ diseases', included: true },
            { text: 'White-label reports', included: true },
            { text: 'Unlimited retention', included: true },
            { text: 'Custom dashboards', included: true },
            { text: 'Patient management', included: true },
            { text: 'Unlimited staff accounts', included: true },
            { text: 'Full API access', included: true },
        ],
        cta: 'CONTACT SALES',
    },
];

export function Pricing() {
    const [reportsAnalyzed, setReportsAnalyzed] = useState(2847);

    useEffect(() => {
        const interval = setInterval(() => {
            setReportsAnalyzed((prev) => prev + Math.floor(Math.random() * 3));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="pricing">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: PRICING_TIERS
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            005
                        </span>
                    </div>
                </div>

                {/* Live Counter */}
                <div className="flex items-center justify-end gap-4 mb-8">
                    <span className="text-xs font-mono text-brutalist-muted uppercase">
                        reports analyzed today:
                    </span>
                    <span className="font-space text-lg font-bold text-brutalist-fg">
                        {reportsAnalyzed.toLocaleString()}
                    </span>
                </div>

                {/* Title */}
                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    Choose Your Plan
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-12 max-w-2xl">
                    Start free and upgrade when you need more. All plans include our core
                    AI disease detection technology with bank-grade security.
                </p>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-brutalist-fg">
                    {pricingTiers.map((tier, index) => (
                        <div
                            key={tier.id}
                            className={`relative ${index < pricingTiers.length - 1
                                    ? 'border-b md:border-b-0 md:border-r border-brutalist-fg'
                                    : ''
                                } ${tier.recommended ? 'bg-brutalist-fg text-brutalist-bg' : 'bg-brutalist-bg'}`}
                        >
                            {/* Recommended Badge */}
                            {tier.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-brutalist-accent text-white text-xs font-mono px-3 py-1 uppercase tracking-wider">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="p-6 md:p-8">
                                {/* Tier Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 border flex items-center justify-center ${tier.recommended
                                                    ? 'border-brutalist-accent bg-brutalist-accent'
                                                    : 'border-current'
                                                }`}
                                        >
                                            {tier.icon}
                                        </div>
                                        <div>
                                            <span
                                                className={`text-xs font-mono uppercase tracking-wider block ${tier.recommended ? 'text-brutalist-bg/60' : 'text-brutalist-muted'
                                                    }`}
                                            >
                                                {tier.name}
                                            </span>
                                            <span
                                                className={`text-xs font-mono ${tier.recommended ? 'text-brutalist-bg/60' : 'text-brutalist-muted'
                                                    }`}
                                            >
                                                {tier.number}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-4">
                                    <span
                                        className={`font-space text-4xl md:text-5xl font-bold ${tier.recommended ? 'text-brutalist-bg' : 'text-brutalist-fg'
                                            }`}
                                    >
                                        {tier.price}
                                    </span>
                                    <span
                                        className={`text-sm font-mono ${tier.recommended ? 'text-brutalist-bg/60' : 'text-brutalist-muted'
                                            }`}
                                    >
                                        {tier.unit}
                                    </span>
                                </div>

                                {/* Description */}
                                <p
                                    className={`text-sm font-mono mb-6 ${tier.recommended ? 'text-brutalist-bg/80' : 'text-brutalist-muted'
                                        }`}
                                >
                                    {tier.description}
                                </p>

                                {/* Features */}
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            {feature.included ? (
                                                <Check
                                                    className={`w-4 h-4 ${tier.recommended ? 'text-brutalist-accent' : 'text-green-600'
                                                        }`}
                                                />
                                            ) : (
                                                <X className="w-4 h-4 text-brutalist-muted/50" />
                                            )}
                                            <span
                                                className={`text-sm font-mono ${feature.included
                                                        ? tier.recommended
                                                            ? 'text-brutalist-bg'
                                                            : 'text-brutalist-fg'
                                                        : 'text-brutalist-muted/50'
                                                    }`}
                                            >
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Button
                                    className={`w-full rounded-none text-xs font-mono tracking-wider uppercase h-12 flex items-center justify-center gap-2 ${tier.recommended
                                            ? 'bg-brutalist-bg text-brutalist-fg hover:bg-brutalist-bg/90'
                                            : 'bg-brutalist-fg text-brutalist-bg hover:bg-brutalist-muted'
                                        }`}
                                >
                                    {tier.cta}
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Notes */}
                <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs font-mono text-brutalist-muted">
                        * All plans include HIPAA-compliant security. Cancel anytime.
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-brutalist-muted">
                            Need help choosing?
                        </span>
                        <a href="#" className="text-xs font-mono text-brutalist-accent hover:underline">
                            Talk to our team
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Pricing;
