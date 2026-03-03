import { useState, useEffect, useRef } from 'react';
import { Upload, FileSearch, Brain, TrendingUp, Check } from 'lucide-react';

const processSteps = [
    {
        id: 1,
        title: 'UPLOAD REPORT',
        description: 'Upload any medical report - PDF, image, or scanned document. Supports blood tests, imaging reports, prescriptions, and more.',
        icon: <Upload className="w-5 h-5" />,
        logs: [
            '> Receiving file: blood_report.pdf',
            '> File size: 2.4MB',
            '> Validating format...',
            '> PDF structure verified',
        ],
    },
    {
        id: 2,
        title: 'TEXT EXTRACTION',
        description: 'Our OCR engine extracts all text, numbers, and medical terms from your document with 99.8% accuracy.',
        icon: <FileSearch className="w-5 h-5" />,
        logs: [
            '> Initializing OCR pipeline...',
            '> Detecting 3 pages',
            '> Extracting text blocks...',
            '> Found 247 data points',
            '> Parsing medical terms...',
        ],
    },
    {
        id: 3,
        title: 'AI ANALYSIS',
        description: 'Machine learning models analyze your data against millions of medical records to identify risk patterns.',
        icon: <Brain className="w-5 h-5" />,
        logs: [
            '> Loading diagnostic models...',
            '> Analyzing biomarkers...',
            '> Cross-referencing database...',
            '> Detecting anomalies...',
            '> Risk assessment complete',
        ],
    },
    {
        id: 4,
        title: 'VISUAL RESULTS',
        description: 'Get clear, interactive visualizations showing your risk levels, trends, and personalized recommendations.',
        icon: <TrendingUp className="w-5 h-5" />,
        logs: [
            '> Generating risk charts...',
            '> Building trend graphs...',
            '> Creating health dashboard...',
            '> Report ready for viewing',
        ],
    },
];

export function HowItWorks() {
    const [activeStep, setActiveStep] = useState(1);
    const [visibleLogs, setVisibleLogs] = useState([]);
    const terminalRef = useRef(null);

    useEffect(() => {
        const currentStep = processSteps.find((s) => s.id === activeStep);
        if (!currentStep) return;

        setVisibleLogs([]);
        let logIndex = 0;

        const interval = setInterval(() => {
            if (logIndex < currentStep.logs.length) {
                setVisibleLogs((prev) => [...prev, currentStep.logs[logIndex]]);
                logIndex++;
                if (terminalRef.current) {
                    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
                }
            } else {
                clearInterval(interval);
            }
        }, 300);

        return () => clearInterval(interval);
    }, [activeStep]);

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="how-it-works">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: PROCESS_PIPELINE
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            001
                        </span>
                    </div>
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    How It Works
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-12 max-w-2xl">
                    Our AI-powered platform processes your health reports in four simple steps,
                    delivering accurate risk predictions in under 30 seconds.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Steps List */}
                    <div className="space-y-4">
                        {processSteps.map((step) => (
                            <div
                                key={step.id}
                                className={`border border-brutalist-fg p-4 cursor-pointer transition-all ${activeStep === step.id
                                        ? 'bg-brutalist-fg text-brutalist-bg'
                                        : 'bg-brutalist-bg hover:bg-brutalist-fg/5'
                                    }`}
                                onClick={() => setActiveStep(step.id)}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-10 h-10 border border-current flex items-center justify-center flex-shrink-0 ${activeStep === step.id
                                                ? 'bg-brutalist-accent border-brutalist-accent'
                                                : ''
                                            }`}
                                    >
                                        {step.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span
                                                className={`text-xs font-mono ${activeStep === step.id
                                                        ? 'text-brutalist-bg/60'
                                                        : 'text-brutalist-muted'
                                                    }`}
                                            >
                                                STEP_0{step.id}
                                            </span>
                                            {activeStep > step.id && (
                                                <Check className="w-4 h-4 text-green-500" />
                                            )}
                                        </div>
                                        <h3 className="font-space font-bold text-lg mb-1">
                                            {step.title}
                                        </h3>
                                        <p
                                            className={`text-sm font-mono ${activeStep === step.id
                                                    ? 'text-brutalist-bg/80'
                                                    : 'text-brutalist-muted'
                                                }`}
                                        >
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Terminal Preview */}
                    <div className="border border-brutalist-fg">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-brutalist-fg bg-brutalist-bg">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                processing.log
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-brutalist-accent" />
                                <div className="w-3 h-3 border border-brutalist-fg" />
                                <div className="w-3 h-3 border border-brutalist-fg" />
                            </div>
                        </div>
                        <div
                            ref={terminalRef}
                            className="h-80 bg-[#1a1a1a] p-4 overflow-y-auto font-mono text-sm"
                        >
                            <div className="text-brutalist-terminal mb-4">
                                {`> MEDSCAN.AI v2.4.1 initialized`}
                            </div>
                            <div className="text-brutalist-terminal/60 mb-4">
                                {`> Processing Step ${activeStep}: ${processSteps.find(s => s.id === activeStep)?.title}`}
                            </div>
                            {visibleLogs.map((log, index) => (
                                <div
                                    key={index}
                                    className="text-brutalist-terminal mb-1 opacity-0 animate-[fadeIn_0.2s_ease_forwards]"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    {log}
                                </div>
                            ))}
                            <span className="inline-block w-2 h-4 bg-brutalist-terminal animate-blink mt-1" />
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

export default HowItWorks;
