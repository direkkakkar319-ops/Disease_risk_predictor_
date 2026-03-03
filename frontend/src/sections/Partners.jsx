const partners = [
    'MAYO CLINIC',
    'CLEVELAND CLINIC',
    'JOHNS HOPKINS',
    'STANFORD HEALTH',
    'HARVARD MEDICAL',
    'Kaiser Permanente',
    'UNITED HEALTHCARE',
    'CIGNA',
    'AETNA',
    'BLUE CROSS',
];

export function Partners() {
    // Duplicate partners for seamless loop
    const allPartners = [...partners, ...partners];

    return (
        <section className="py-16 md:py-24 overflow-hidden">
            {/* Section Header */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mb-8">
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // PARTNERS: HEALTHCARE_NETWORK
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            006
                        </span>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mb-8">
                <h2 className="font-space text-xl md:text-2xl font-bold text-brutalist-fg mb-2">
                    Trusted by Leading Healthcare Organizations
                </h2>
                <p className="text-sm font-mono text-brutalist-muted">
                    Our AI is used by top hospitals, insurance providers, and medical institutions worldwide.
                </p>
            </div>

            {/* Marquee Container */}
            <div className="relative">
                {/* Gradient Masks */}
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-brutalist-bg to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-brutalist-bg to-transparent z-10 pointer-events-none" />

                {/* Scrolling Content */}
                <div className="flex animate-marquee">
                    {allPartners.map((partner, index) => (
                        <div
                            key={`${partner}-${index}`}
                            className="flex-shrink-0 px-8 md:px-12"
                        >
                            <span className="font-space text-xl md:text-2xl font-bold text-brutalist-fg/20 hover:text-brutalist-fg transition-colors cursor-default whitespace-nowrap">
                                {partner}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Row */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mt-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-brutalist-fg">
                    {[
                        { value: '500+', label: 'Partner Hospitals' },
                        { value: '50M+', label: 'Patients Served' },
                        { value: '120+', label: 'Countries' },
                        { value: '4.9/5', label: 'Provider Rating' },
                    ].map((stat, index) => (
                        <div
                            key={stat.label}
                            className={`p-6 text-center ${index < 3 ? 'border-r border-brutalist-fg' : ''
                                } ${index < 2 ? 'border-b md:border-b-0 border-brutalist-fg' : ''}`}
                        >
                            <span className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg block">
                                {stat.value}
                            </span>
                            <span className="text-xs font-mono text-brutalist-muted uppercase tracking-wider">
                                {stat.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Partners;
