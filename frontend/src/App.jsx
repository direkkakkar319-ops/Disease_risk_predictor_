import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Hero } from '@/sections/Hero';
import { HowItWorks } from '@/sections/HowItWorks';
import { Diseases } from '@/sections/Diseases';
import { Results } from '@/sections/Results';
import { Security } from '@/sections/Security';
import { Pricing } from '@/sections/Pricing';
import { Partners } from '@/sections/Partners';
import { History } from '@/sections/History';
import { Compare } from '@/sections/Compare';

function App() {
    return (
        <div className="min-h-screen bg-brutalist-bg dot-pattern">
            <Navbar />
            <main>
                <Hero />
                <HowItWorks />
                <Diseases />
                <Results />
                <History />
                <Compare />
                <Security />
                <Pricing />
                <Partners />
            </main>
            <Footer />
        </div>
    );
}

export default App;
