import { Compare } from '@/sections/Compare';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
    useEffect(() => {
        if (sessionStorage.getItem('loginSuccess') === 'true') {
            toast.success('Hey you are successfully logged in');
            sessionStorage.removeItem('loginSuccess');
        }
    }, []);

    return (
        <div className="min-h-screen bg-brutalist-bg dot-pattern">
            <Toaster position="top-center" richColors />
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
