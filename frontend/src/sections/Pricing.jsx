import { useEffect, useRef, useState } from 'react';
import { Check, X, ArrowRight, Stethoscope, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

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
            { text: 'Basic disease detection', included: true },
            { text: 'PDF summary download', included: true },
            { text: '7-day data retention', included: true },
            { text: 'Advanced visualizations', included: false },
            { text: 'Historical tracking', included: false },
            { text: 'Family sharing', included: false },
            { text: 'API access', included: false },
        ],
    },
    {
        id: 'premium',
        name: 'PREMIUM',
        number: '02',
        price: '₹999',
        unit: '/ month',
        description: 'Unlimited reports with full disease detection and advanced analytics.',
        icon: <Users className="w-5 h-5" />,
        features: [
            { text: 'Unlimited reports', included: true },
            { text: 'Full disease detection (14)', included: true },
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
            { text: 'All 14 diseases', included: true },
            { text: 'White-label reports', included: true },
            { text: 'Unlimited retention', included: true },
            { text: 'Custom dashboards', included: true },
            { text: 'Patient management', included: true },
            { text: 'Unlimited staff accounts', included: true },
            { text: 'Full API access', included: true },
        ],
        underConstruction: true,
    },
];

// Load the Razorpay checkout script once and return a promise that resolves
// when it is ready. Calling this multiple times is safe -- the script tag is
// only injected once.
function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload  = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export function Pricing() {
    const [loading, setLoading]   = useState(false);
    const [payStatus, setPayStatus] = useState(null); // 'success' | 'failed' | null
    const rzpRef = useRef(null);

    // Pre-load the Razorpay script in the background when the section mounts
    useEffect(() => { loadRazorpayScript(); }, []);

    async function handlePremiumClick() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to upgrade to Premium.');
            return;
        }

        setLoading(true);
        setPayStatus(null);

        try {
            // 1. Ask the backend to create a Razorpay order
            const res = await apiFetch('/api/payments/create-order', { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Could not create payment order.');
            }
            const order = await res.json();

            // 2. Make sure the checkout script is loaded
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error('Failed to load payment gateway. Check your connection.');

            // 3. Open Razorpay checkout
            const options = {
                key:         order.key_id,
                amount:      order.amount,
                currency:    order.currency,
                name:        'MEDSCAN.AI',
                description: 'Premium Plan - Rs. 999/month',
                order_id:    order.order_id,
                theme:       { color: '#f97316' },  // brutalist-accent orange

                handler: async function (response) {
                    // 4. Verify the payment on the backend
                    try {
                        const verifyRes = await apiFetch('/api/payments/verify', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id:   response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature:  response.razorpay_signature,
                            }),
                        });
                        if (!verifyRes.ok) throw new Error('Verification failed');
                        setPayStatus('success');
                    } catch {
                        setPayStatus('failed');
                    } finally {
                        setLoading(false);
                    }
                },

                modal: {
                    ondismiss: () => setLoading(false),
                },
            };

            rzpRef.current = new window.Razorpay(options);
            rzpRef.current.open();

        } catch (err) {
            alert(err.message || 'Payment failed. Please try again.');
            setLoading(false);
        }
    }

    function handleCtaClick(tierId) {
        if (tierId === 'premium') {
            handlePremiumClick();
        } else if (tierId === 'enterprise') {
            window.location.href = 'mailto:sales@medscan.ai';
        }
        // basic: no action needed (free plan)
    }

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="pricing">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
                            // SECTION: PRICING_TIERS
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">005</span>
                    </div>
                </div>



                {/* Title */}
                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    Choose Your Plan
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-12 max-w-2xl">
                    Start free and upgrade when you need more. All plans include our core
                    AI disease detection technology with bank-grade security.
                </p>

                {/* Payment status banners */}
                {payStatus === 'success' && (
                    <div className="mb-6 border border-green-600 bg-green-950/30 px-4 py-3 font-mono text-sm text-green-400">
                        Payment successful! Your account has been upgraded to Premium.
                    </div>
                )}
                {payStatus === 'failed' && (
                    <div className="mb-6 border border-red-600 bg-red-950/30 px-4 py-3 font-mono text-sm text-red-400">
                        Payment verification failed. Please contact support.
                    </div>
                )}

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-brutalist-fg">
                    {pricingTiers.map((tier, index) => (
                        <div
                            key={tier.id}
                            className={`relative ${
                                index < pricingTiers.length - 1
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

                            {/* Under Construction Badge */}
                            {tier.underConstruction && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                    <span className="bg-yellow-500 text-black text-xs font-mono px-3 py-1 uppercase tracking-wider flex items-center gap-1">
                                        🚧 Under Construction
                                    </span>
                                </div>
                            )}

                            <div className="p-6 md:p-8">
                                {/* Tier Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 border flex items-center justify-center ${
                                                tier.recommended
                                                    ? 'border-brutalist-accent bg-brutalist-accent'
                                                    : 'border-current'
                                            }`}
                                        >
                                            {tier.icon}
                                        </div>
                                        <div>
                                            <span
                                                className={`text-xs font-mono uppercase tracking-wider block ${
                                                    tier.recommended ? 'text-brutalist-bg/60' : 'text-brutalist-muted'
                                                }`}
                                            >
                                                {tier.name}
                                            </span>
                                            <span
                                                className={`text-xs font-mono ${
                                                    tier.recommended ? 'text-brutalist-bg/60' : 'text-brutalist-muted'
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
                                        className={`font-space text-4xl md:text-5xl font-bold ${
                                            tier.recommended ? 'text-brutalist-bg' : 'text-brutalist-fg'
                                        }`}
                                    >
                                        {tier.price}
                                    </span>
                                    <span
                                        className={`text-sm font-mono ${
                                            tier.recommended ? 'text-brutalist-bg/60' : 'text-brutalist-muted'
                                        }`}
                                    >
                                        {tier.unit}
                                    </span>
                                </div>

                                {/* Description */}
                                <p
                                    className={`text-sm font-mono mb-6 ${
                                        tier.recommended ? 'text-brutalist-bg/80' : 'text-brutalist-muted'
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
                                                    className={`w-4 h-4 ${
                                                        tier.recommended ? 'text-brutalist-accent' : 'text-green-600'
                                                    }`}
                                                />
                                            ) : (
                                                <X className="w-4 h-4 text-brutalist-muted/50" />
                                            )}
                                            <span
                                                className={`text-sm font-mono ${
                                                    feature.included
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
                                {tier.id === 'premium' && (
                                    <Button
                                        onClick={() => handleCtaClick(tier.id)}
                                        disabled={tier.id === 'premium' && loading}
                                        className={`w-full rounded-none text-xs font-mono tracking-wider uppercase h-12 flex items-center justify-center gap-2 ${
                                            tier.recommended
                                                ? 'bg-brutalist-bg text-brutalist-fg hover:bg-brutalist-bg/90'
                                                : 'bg-brutalist-fg text-brutalist-bg hover:bg-brutalist-muted'
                                        }`}
                                    >
                                        {tier.id === 'premium' && loading ? (
                                            'PROCESSING...'
                                        ) : (
                                            <>
                                                {tier.cta}
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Notes */}
                <div className="mt-6 flex flex-col md:flex-row items-center justify-end gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-brutalist-muted">
                            Need help choosing?
                        </span>
                        <a href="mailto:sales@medscan.ai" className="text-xs font-mono text-brutalist-accent hover:underline">
                            Talk to our team
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Pricing;
