// ─── App.jsx — Root component ────────────────────────────────────────────────
//
// This is a Single Page Application (SPA): there is NO React Router.
// "Navigation" is done purely by scroll — each section is a full-page block
// with a matching id (e.g. id="results", id="history").
//
// Section rendering order matters for UX:
//   Hero → explains the product → HowItWorks → Diseases (what we detect)
//   → Results (live output after upload) → History (past reports)
//   → Compare (side-by-side diff) → Security / Pricing / Partners (landing copy)
//
// Cross-section communication (e.g. UploadModal → Results → History) is done
// through a custom browser event: window.dispatchEvent(new CustomEvent('reportUploaded', ...))
// instead of a shared state store, keeping sections decoupled.

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
        // dot-pattern = CSS background dots defined in tailwind.config
        <div className="min-h-screen bg-brutalist-bg dot-pattern">
            <Navbar />
            <main>
                {/* Landing sections — visible before login */}
                <Hero />
                <HowItWorks />
                <Diseases />

                {/* Functional sections — require auth to show real data */}
                <Results />   {/* polls /api/status/{id} after upload */}
                <History />   {/* lists /api/reports for the current user */}
                <Compare />   {/* side-by-side diff of two same-type reports */}

                {/* Marketing / informational sections */}
                <Security />
                <Pricing />
                <Partners />
            </main>
            <Footer />
        </div>
    );
}

export default App;
