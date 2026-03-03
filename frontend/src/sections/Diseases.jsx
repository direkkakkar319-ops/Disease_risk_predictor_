import { useState } from 'react';
import { Heart, Brain, Activity, Stethoscope, Bone, Eye, Droplets, Shield } from 'lucide-react';

const diseaseCategories = [
    {
        id: 'cardiovascular',
        name: 'CARDIOVASCULAR',
        icon: <Heart className="w-5 h-5" />,
        color: '#ef4444',
        diseases: [
            'Hypertension',
            'Coronary Artery Disease',
            'Heart Failure',
            'Arrhythmia',
            'High Cholesterol',
        ],
    },
    {
        id: 'metabolic',
        name: 'METABOLIC',
        icon: <Droplets className="w-5 h-5" />,
        color: '#f97316',
        diseases: [
            'Type 2 Diabetes',
            'Prediabetes',
            'Metabolic Syndrome',
            'Thyroid Disorders',
            'Obesity',
        ],
    },
    {
        id: 'neurological',
        name: 'NEUROLOGICAL',
        icon: <Brain className="w-5 h-5" />,
        color: '#8b5cf6',
        diseases: [
            'Stroke Risk',
            'Alzheimer\'s Risk',
            'Parkinson\'s Risk',
            'Migraine Patterns',
            'Epilepsy',
        ],
    },
    {
        id: 'respiratory',
        name: 'RESPIRATORY',
        icon: <Activity className="w-5 h-5" />,
        color: '#06b6d4',
        diseases: [
            'Asthma',
            'COPD',
            'Sleep Apnea',
            'Lung Disease',
            'Respiratory Infections',
        ],
    },
    {
        id: 'oncological',
        name: 'ONCOLOGICAL',
        icon: <Shield className="w-5 h-5" />,
        color: '#ec4899',
        diseases: [
            'Breast Cancer Risk',
            'Lung Cancer Risk',
            'Colorectal Cancer',
            'Prostate Cancer',
            'Skin Cancer Risk',
        ],
    },
    {
        id: 'musculoskeletal',
        name: 'MUSCULOSKELETAL',
        icon: <Bone className="w-5 h-5" />,
        color: '#84cc16',
        diseases: [
            'Osteoporosis',
            'Arthritis',
            'Back Problems',
            'Joint Disorders',
            'Muscle Atrophy',
        ],
    },
    {
        id: 'ophthalmological',
        name: 'OPHTHALMOLOGICAL',
        icon: <Eye className="w-5 h-5" />,
        color: '#14b8a6',
        diseases: [
            'Glaucoma',
            'Cataracts',
            'Diabetic Retinopathy',
            'Macular Degeneration',
            'Vision Problems',
        ],
    },
    {
        id: 'general',
        name: 'GENERAL HEALTH',
        icon: <Stethoscope className="w-5 h-5" />,
        color: '#64748b',
        diseases: [
            'Anemia',
            'Vitamin Deficiencies',
            'Liver Function',
            'Kidney Disease',
            'Immune Disorders',
        ],
    },
];

export function Diseases() {
    const [activeCategory, setActiveCategory] = useState('cardiovascular');
    const [hoveredDisease, setHoveredDisease] = useState(null);

    const activeDiseases = diseaseCategories.find((c) => c.id === activeCategory)?.diseases || [];
    const activeColor = diseaseCategories.find((c) => c.id === activeCategory)?.color || '#1a1a1a';

    return (
        <section className="py-16 md:py-24 px-4 md:px-6 lg:px-8" id="diseases">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-brutalist-fg pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-brutalist-muted">
              // SECTION: DISEASE_DATABASE
                        </span>
                        <span className="text-xs font-mono text-brutalist-muted">
                            002
                        </span>
                    </div>
                </div>

                <h2 className="font-space text-2xl md:text-3xl font-bold text-brutalist-fg mb-4">
                    50+ Diseases Detected
                </h2>
                <p className="text-sm font-mono text-brutalist-muted mb-12 max-w-2xl">
                    Our AI models are trained on millions of medical records to identify
                    risk patterns across major disease categories.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-brutalist-fg">
                    {/* Category List */}
                    <div className="border-b lg:border-b-0 lg:border-r border-brutalist-fg">
                        {diseaseCategories.map((category, index) => (
                            <button
                                key={category.id}
                                className={`w-full flex items-center gap-3 p-4 text-left transition-all ${activeCategory === category.id
                                        ? 'bg-brutalist-fg text-brutalist-bg'
                                        : 'bg-brutalist-bg hover:bg-brutalist-fg/5'
                                    } ${index < diseaseCategories.length - 1 ? 'border-b border-brutalist-fg' : ''}`}
                                onClick={() => setActiveCategory(category.id)}
                            >
                                <span
                                    className="w-8 h-8 flex items-center justify-center"
                                    style={{
                                        backgroundColor:
                                            activeCategory === category.id ? category.color : 'transparent',
                                        border: `1px solid ${activeCategory === category.id ? category.color : '#1a1a1a'}`,
                                    }}
                                >
                                    {category.icon}
                                </span>
                                <span className="font-mono text-sm uppercase tracking-wider">
                                    {category.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Disease Grid */}
                    <div className="lg:col-span-2 p-6 md:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-mono text-brutalist-muted uppercase">
                                {diseaseCategories.find((c) => c.id === activeCategory)?.name} DISEASES
                            </span>
                            <span
                                className="text-xs font-mono px-2 py-1"
                                style={{
                                    backgroundColor: activeColor,
                                    color: 'white',
                                }}
                            >
                                {activeDiseases.length} CONDITIONS
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeDiseases.map((disease) => (
                                <div
                                    key={disease}
                                    className="border border-brutalist-fg p-4 cursor-pointer transition-all hover:bg-brutalist-fg hover:text-brutalist-bg"
                                    onMouseEnter={() => setHoveredDisease(disease)}
                                    onMouseLeave={() => setHoveredDisease(null)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: activeColor }}
                                        />
                                        <span className="font-mono text-sm">{disease}</span>
                                    </div>
                                    {hoveredDisease === disease && (
                                        <div className="mt-3 pt-3 border-t border-current/20">
                                            <span className="text-xs font-mono opacity-60">
                                                Click to view risk factors and prevention
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="mt-8 pt-6 border-t border-brutalist-fg">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                                        Detection Rate
                                    </span>
                                    <span className="font-space text-xl font-bold text-brutalist-fg">
                                        98.7%
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                                        False Positive
                                    </span>
                                    <span className="font-space text-xl font-bold text-brutalist-fg">
                                        0.8%
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs font-mono text-brutalist-muted uppercase block mb-1">
                                        Data Points
                                    </span>
                                    <span className="font-space text-xl font-bold text-brutalist-fg">
                                        500+
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Diseases;
