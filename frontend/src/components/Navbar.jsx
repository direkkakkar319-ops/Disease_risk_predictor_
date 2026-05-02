import { useState, useEffect } from 'react';
import { Activity, Moon, Sun, History, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadReportModal } from './UploadReportModal';
import { AuthModal } from './AuthModal';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
const navLinks = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Diseases', href: '#diseases' },
    { label: 'Results', href: '#results' },
    { label: 'History', href: '#history', icon: <History className="w-3 h-3" /> },
    { label: 'Compare', href: '#compare', icon: <GitCompare className="w-3 h-3" /> },
    { label: 'Security', href: '#security' },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('access_token'));

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('healthinsight_latest_report_id');
        localStorage.removeItem('healthinsight_pending_report_id');
        setIsLoggedIn(false);
        window.location.reload();
    };

    const toggleTheme = () => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.remove('dark');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            setIsDark(true);
        }
    };

    const handleUploadClick = (e) => {
        if (!isLoggedIn) {
            e.preventDefault();
            toast.error('Please log in first to upload a report');
        }
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-brutalist-bg border-b border-brutalist-fg'
                : 'bg-transparent'
                }`}
        >
            <div className="mx-4 md:mx-6 lg:mx-8">
                <nav className="flex items-center justify-between h-14 md:h-16">
                    {/* Logo */}
                    <a href="#" className="flex items-center gap-2 group">
                        <Activity className="w-5 h-5 text-brutalist-fg" />
                        <span className="font-space font-bold text-sm tracking-wider text-brutalist-fg">
                            MEDSCAN.AI
                        </span>
                    </a>

                    {/* Navigation Links - Desktop */}
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="flex items-center gap-1.5 text-xs font-mono tracking-widest text-brutalist-muted hover:text-brutalist-fg transition-colors uppercase"
                            >
                                {link.icon && <span>{link.icon}</span>}
                                <span>{link.label}</span>
                            </a>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 border border-brutalist-fg hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        {isLoggedIn ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        className="hidden sm:block text-xs font-mono tracking-widest text-brutalist-muted hover:text-red-500 transition-all uppercase group"
                                    >
                                        <span className="opacity-0 group-hover:opacity-100 group-hover:text-red-500 transition-opacity mr-1">[</span>
                                        LOG OUT
                                        <span className="opacity-0 group-hover:opacity-100 group-hover:text-red-500 transition-opacity ml-1">]</span>
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="sm:max-w-[400px] bg-[#f0ede6] dark:bg-[#1a1a1a] border-brutalist-fg rounded-none p-6 shadow-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-space text-[40px] font-bold tracking-tight text-brutalist-fg uppercase leading-none mt-2">
                                            LOG OUT?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="font-mono text-xs text-brutalist-fg/70 mt-4 uppercase font-bold tracking-wider">
                                            Are you sure you want to exit the system?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6 flex-row gap-3 sm:justify-start w-full">
                                        <AlertDialogCancel className="flex-1 font-mono text-[10px] font-bold rounded-none border border-brutalist-fg bg-transparent text-brutalist-fg hover:bg-brutalist-fg hover:text-[#f0ede6] dark:hover:text-[#1a1a1a] uppercase tracking-widest h-10 mt-0 sm:mt-0">
                                            STAY
                                        </AlertDialogCancel>
                                        <AlertDialogAction onClick={handleLogout} className="flex-1 font-mono text-[10px] font-bold rounded-none border border-brutalist-fg bg-red-500 text-white hover:bg-red-600 hover:border-red-600 uppercase tracking-widest h-10">
                                            CONFIRM
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                            <AuthModal>
                                <button
                                    className="hidden sm:block text-xs font-mono tracking-widest text-brutalist-muted hover:text-brutalist-fg transition-all uppercase group"
                                >
                                    <span className="opacity-0 group-hover:opacity-100 group-hover:text-brutalist-accent transition-opacity mr-1">[</span>
                                    LOG IN
                                    <span className="opacity-0 group-hover:opacity-100 group-hover:text-brutalist-accent transition-opacity ml-1">]</span>
                                </button>
                            </AuthModal>
                        )}
                        {isLoggedIn ? (
                            <UploadReportModal>
                                <Button
                                    className="bg-brutalist-fg text-brutalist-bg hover:bg-brutalist-muted text-xs font-mono tracking-wider uppercase h-9 px-4 rounded-none border border-brutalist-fg"
                                >
                                    Upload Report
                                </Button>
                            </UploadReportModal>
                        ) : (
                            <Button
                                onClick={handleUploadClick}
                                className="bg-brutalist-fg text-brutalist-bg hover:bg-brutalist-muted text-xs font-mono tracking-wider uppercase h-9 px-4 rounded-none border border-brutalist-fg"
                            >
                                Upload Report
                            </Button>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default Navbar;
