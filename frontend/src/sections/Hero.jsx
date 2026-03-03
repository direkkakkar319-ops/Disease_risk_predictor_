import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText, Scan, Brain, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
    { id: '1', x: 15, y: 50, label: 'UPLOAD', icon: <FileText className="w-4 h-4" />, side: 'left' },
    { id: 'center', x: 50, y: 50, label: '', icon: <Scan className="w-6 h-6" />, side: 'center' },
    { id: '2', x: 85, y: 25, label: 'EXTRACT', icon: <FileText className="w-4 h-4" />, side: 'right' },
    { id: '3', x: 85, y: 50, label: 'ANALYZE', icon: <Brain className="w-4 h-4" />, side: 'right' },
    { id: '4', x: 85, y: 75, label: 'VISUALIZE', icon: <BarChart3 className="w-4 h-4" />, side: 'right' },
];

export function Hero() {
    const canvasRef = useRef(null);
    const [activeStep, setActiveStep] = useState(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        let animationFrame;
        let time = 0;

        const draw = () => {
            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;

            ctx.clearRect(0, 0, width, height);

            // Draw connections
            const centerStep = steps.find((s) => s.side === 'center');
            if (centerStep) {
                const cx = (centerStep.x / 100) * width;
                const cy = (centerStep.y / 100) * height;

                steps.forEach((step) => {
                    if (step.side !== 'center') {
                        const sx = (step.x / 100) * width;
                        const sy = (step.y / 100) * height;

                        // Animated line
                        ctx.beginPath();
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(sx, sy);
                        ctx.strokeStyle = '#1a1a1a';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        // Animated pulse on line
                        const pulsePos = (time * 0.3) % 1;
                        const px = cx + (sx - cx) * pulsePos;
                        const py = cy + (sy - cy) * pulsePos;

                        ctx.beginPath();
                        ctx.arc(px, py, 4, 0, Math.PI * 2);
                        ctx.fillStyle = '#f97316';
                        ctx.fill();
                    }
                });
            }

            time += 0.02;
            animationFrame = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <section className="min-h-screen pt-20 md:pt-24 pb-16 px-4 md:px-6 lg:px-8 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
                {/* Main Title */}
                <div className="text-center mb-8 md:mb-12">
                    <h1 className="font-space text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-brutalist-fg mb-2">
                        <span className="inline-block">SCAN.</span>{' '}
                        <span className="inline-block">PREDICT.</span>
                    </h1>
                </div>

                {/* Process Diagram */}
                <div className="relative w-full max-w-2xl mx-auto h-48 md:h-56 mb-8 md:mb-12">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                    />

                    {/* Steps */}
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${step.side === 'center'
                                    ? 'w-14 h-14 md:w-16 md:h-16'
                                    : 'w-20 md:w-24'
                                }`}
                            style={{
                                left: `${step.x}%`,
                                top: `${step.y}%`,
                            }}
                            onMouseEnter={() => setActiveStep(step.id)}
                            onMouseLeave={() => setActiveStep(null)}
                        >
                            {step.side === 'center' ? (
                                <div className="w-full h-full border-2 border-brutalist-fg bg-brutalist-accent flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                                    <Scan className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                </div>
                            ) : (
                                <div
                                    className={`flex flex-col items-center gap-2 px-3 py-2 border border-brutalist-fg bg-brutalist-bg cursor-pointer transition-all ${activeStep === step.id
                                            ? 'bg-brutalist-fg text-brutalist-bg'
                                            : ''
                                        }`}
                                >
                                    {step.icon}
                                    <span className="text-xs font-mono tracking-wider uppercase">
                                        {step.label}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Subtitle */}
                <div className="text-center mb-6">
                    <h2 className="font-space text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-brutalist-fg">
                        PREVENT.
                    </h2>
                </div>

                {/* Description */}
                <p className="text-center text-sm md:text-base font-mono text-brutalist-muted max-w-xl mx-auto mb-8 leading-relaxed">
                    MEDSCAN.AI analyzes your health reports using advanced AI to predict
                    disease risks. Upload any medical document and get instant insights
                    with detailed visualizations.
                </p>

                {/* CTA Button */}
                <div className="flex justify-center mb-16">
                    <Button
                        className="group bg-brutalist-fg text-brutalist-bg hover:bg-brutalist-muted text-sm font-mono tracking-wider uppercase h-12 px-6 rounded-none border border-brutalist-fg flex items-center gap-3"
                    >
                        <span className="w-8 h-8 bg-brutalist-accent flex items-center justify-center -ml-2">
                            <ArrowRight className="w-4 h-4 text-white" />
                        </span>
                        Analyze Your Report
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
                    {[
                        { value: '50+', label: 'Diseases Detected' },
                        { value: '99.2%', label: 'Accuracy Rate' },
                        { value: '2M+', label: 'Reports Analyzed' },
                        { value: '<30s', label: 'Analysis Time' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg">
                                {stat.value}
                            </div>
                            <div className="text-xs font-mono text-brutalist-muted uppercase tracking-wider">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scroll Indicator */}
                <div className="flex justify-center">
                    <div className="flex flex-col items-center gap-2 text-brutalist-muted">
                        <span className="text-xs font-mono tracking-widest uppercase">
                            Scroll
                        </span>
                        <div className="w-px h-8 bg-brutalist-fg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-4 bg-brutalist-accent animate-scan" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Hero;
