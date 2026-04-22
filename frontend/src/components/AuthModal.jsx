import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

/**
 * AuthModal Component
 * 
 * This component renders the authentication modal which includes
 * both the Log In and Sign Up forms.
 * 
 * Features:
 * - Smooth sliding between Log In and Sign Up panes
 * - Form validation and shake animation on error
 * - Password visibility toggle
 * - Brutalist UI design with custom borders
({ children }) {
    const [open, setOpen] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    
    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Status state
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [shake, setShake] = useState(false);

    const handleOpenChange = (newOpen) => {
        if (!newOpen && !success) {
            resetForm();
        }
        setOpen(newOpen);
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(false);
        setErrorMessage('');
        setSuccess(false);
        setShake(false);
        setIsLogin(true);
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(false);
        setErrorMessage('');
        setSuccess(false);
        setPassword('');
        setConfirmPassword('');
    };

    const triggerErrorShake = (message = 'Authentication failed') => {
        setError(true);
        setErrorMessage(message);
        setShake(true);
        setTimeout(() => setShake(false), 300);
    };

    const getErrorMessage = async (response, fallbackMessage) => {
        try {
            const errorData = await response.json();
            if (typeof errorData?.detail === 'string') return errorData.detail;
            if (Array.isArray(errorData?.detail)) return errorData.detail.map((item) => item.msg).join(', ');
            return fallbackMessage;
        } catch {
            return fallbackMessage;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(false);
        setErrorMessage('');

        if (!email || !password) {
            triggerErrorShake();
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            triggerErrorShake();
            return;
        }

        try {
            const loginFormData = new URLSearchParams();
            loginFormData.append('username', email);
            loginFormData.append('password', password);

            if (!isLogin) {
                const registerResponse = await apiFetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        username: email,
                        password,
                    }),
                });

                if (!registerResponse.ok) {
                    const message = await getErrorMessage(registerResponse, 'Signup failed');
                    throw new Error(message);
                }
            }

            const loginResponse = await apiFetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: loginFormData,
            });

            if (!loginResponse.ok) {
                const message = await getErrorMessage(loginResponse, 'Login failed');
                throw new Error(message);
            }

            const loginData = await loginResponse.json();
            localStorage.setItem('access_token',  loginData.access_token);
            if (loginData.refresh_token) {
                localStorage.setItem('refresh_token', loginData.refresh_token);
            }
            setSuccess(true);
            setError(false);
            setTimeout(() => {
                setOpen(false);
                setTimeout(resetForm, 500);
                window.location.reload();
            }, 800);
        } catch (err) {
            console.error('Auth error:', err);
            triggerErrorShake(err instanceof Error ? err.message : 'Authentication failed');
        }
    };

    const passwordsMatch = password.length > 0 && password === confirmPassword;
    const ValidationMessage = () => {
        if (!isLogin && confirmPassword.length > 0) {
            if (passwordsMatch) {
                return <span className="text-brutalist-terminal text-[10px] ml-2 animate-pulse-glow">// PASSWORDS CONFIRMED ✓</span>;
            } else {
                return <span className="text-red-500 text-[10px] ml-2">// PASSWORDS DO NOT MATCH</span>;
            }
        }
        return null;
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent 
                showCloseButton={false}
                overlayClassName="bg-black/5 dark:bg-black/40 backdrop-blur-sm transition-all duration-300 data-[state=closed]:duration-500"
                className={`sm:max-w-[400px] bg-[#f0ede6] dark:bg-[#1a1a1a] border-brutalist-fg rounded-none p-6 overflow-hidden ${shake ? 'animate-shake' : ''} shadow-2xl duration-250`}
            >
                <div className="relative z-10 flex flex-col gap-0 w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `translateX(${isLogin ? '0' : '-50%'})` }}>
                    {/* The Two Forms Container */}
                    <div className="flex w-full">
                        
                        {/* ----------------- LOG IN FORM ----------------- */}
                        <div className="w-1/2 pr-6 shrink-0 flex flex-col items-stretch">
                            <DialogHeader className="mb-4 !flex-row items-start justify-between">
                                <DialogTitle className="font-space text-[40px] font-bold tracking-tight text-brutalist-fg uppercase animate-slide-up leading-none mt-2" style={{ animationDelay: '0ms' }}>
                                    LOG. IN.
                                </DialogTitle>
                                <DialogClose className="font-mono text-2xl font-bold text-brutalist-fg opacity-50 hover:opacity-100 transition-colors focus:outline-none leading-none flex items-center justify-center p-2 rounded-none hover:bg-brutalist-fg/10 dark:hover:bg-brutalist-fg/20 dark:hover:bg-brutalist-fg/20">
                                    ×
                                </DialogClose>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                
                                <div className="flex flex-col gap-1.5 animate-slide-up group" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
                                    <label className="font-mono text-[11px] font-bold tracking-widest uppercase text-brutalist-fg">
                                        EMAIL
                                    </label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full h-10 bg-transparent border ${error && !email ? 'border-red-500' : 'border-brutalist-fg'} px-3 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40 dark:placeholder:text-brutalist-fg/50 placeholder-lowercase`}
                                        placeholder="user@example.com"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 animate-slide-up relative" style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
                                    <label className="font-mono text-[11px] font-bold tracking-widest uppercase text-brutalist-fg flex items-center">
                                        PASSWORD
                                        {error && <span className="text-red-500 text-[10px] ml-2">{`// ${errorMessage}`}</span>}
                                    </label>
                                    <div className="relative group">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full h-10 bg-transparent border ${error ? 'border-red-500' : 'border-brutalist-fg'} pl-3 pr-10 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40 dark:placeholder:text-brutalist-fg/50`}
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-0 top-0 h-full px-3 text-brutalist-fg hover:text-brutalist-accent dark:hover:text-brutalist-accent dark:hover:text-brutalist-accent dark:hover:text-brutalist-accent focus:outline-none transition-colors"
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button 
                                    type="submit"
                                    className={`w-full mt-2 font-mono font-bold text-xs rounded-none border border-brutalist-fg bg-brutalist-fg text-[#f0ede6] dark:text-[#1a1a1a] hover:bg-brutalist-accent hover:text-white dark:hover:text-white dark:hover:text-white uppercase tracking-widest h-11 flex items-center justify-center gap-2 group/btn transition-colors animate-slide-up ${success ? 'bg-brutalist-terminal hover:bg-brutalist-terminal border-brutalist-terminal !text-brutalist-fg' : ''}`}
                                    style={{ animationDelay: '240ms', animationFillMode: 'both' }}
                                >
                                    {success ? '// ACCESS GRANTED ✓' : (
                                        <>
                                            ENTER SYSTEM
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-4 pt-4 border-t border-brutalist-fg/20 flex justify-center animate-slide-up" style={{ animationDelay: '320ms', animationFillMode: 'both' }}>
                                <button 
                                    type="button" 
                                    onClick={toggleMode}
                                    className="font-mono text-[10px] text-brutalist-fg uppercase tracking-widest hover:text-brutalist-accent transition-colors font-bold"
                                    tabIndex={isLogin ? 0 : -1}
                                >
                                    NEW USER? SIGN UP
                                </button>
                            </div>
                        </div>

                        {/* ----------------- SIGN UP FORM ----------------- */}
                        <div className="w-1/2 pl-6 shrink-0 flex flex-col items-stretch border-l border-brutalist-fg/20">
                            <DialogHeader className="mb-4 !flex-row items-start justify-between">
                                <DialogTitle className="font-space text-[40px] font-bold tracking-tight text-brutalist-fg uppercase leading-none mt-2">
                                    NEW. USER.
                                </DialogTitle>
                                <DialogClose className="font-mono text-2xl font-bold text-brutalist-fg opacity-50 hover:opacity-100 transition-colors focus:outline-none leading-none flex items-center justify-center p-2 rounded-none hover:bg-brutalist-fg/10" tabIndex={isLogin ? -1 : 0}>
                                    ×
                                </DialogClose>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                                
                                <div className="flex flex-col gap-1">
                                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase text-brutalist-fg">
                                        EMAIL
                                    </label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full h-9 bg-transparent border ${error && !email ? 'border-red-500' : 'border-brutalist-fg'} px-3 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40 dark:placeholder:text-brutalist-fg/50`}
                                        placeholder="user@example.com"
                                        tabIndex={isLogin ? -1 : 0}
                                    />
                                </div>

                                <div className="flex flex-col gap-1 relative">
                                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase text-brutalist-fg">
                                        PASSWORD
                                    </label>
                                    <div className="relative group">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full h-9 bg-transparent border ${error && !password ? 'border-red-500' : 'border-brutalist-fg'} pl-3 pr-10 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40 dark:placeholder:text-brutalist-fg/50`}
                                            placeholder="••••••••"
                                            tabIndex={isLogin ? -1 : 0}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-0 top-0 h-full px-3 text-brutalist-fg hover:text-brutalist-accent focus:outline-none transition-colors"
                                            tabIndex={isLogin ? -1 : 0}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 relative">
                                    <label className="font-mono text-[10px] font-bold tracking-widest uppercase text-brutalist-fg flex items-center h-4">
                                        CONFIRM
                                        <ValidationMessage />
                                    </label>
                                    <div className="relative group">
                                        <input 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full h-9 bg-transparent border ${error && !passwordsMatch ? 'border-red-500' : 'border-brutalist-fg'} pl-3 pr-10 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40 dark:placeholder:text-brutalist-fg/50`}
                                            placeholder="••••••••"
                                            tabIndex={isLogin ? -1 : 0}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-0 top-0 h-full px-3 text-brutalist-fg hover:text-brutalist-accent focus:outline-none transition-colors"
                                            tabIndex={isLogin ? -1 : 0}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button 
                                    type="submit"
                                    className={`w-full mt-2 font-mono font-bold text-xs rounded-none border border-brutalist-fg bg-brutalist-fg text-[#f0ede6] dark:text-[#1a1a1a] hover:bg-brutalist-accent hover:text-white uppercase tracking-widest h-11 flex items-center justify-center gap-2 group/btn transition-colors ${success ? 'bg-brutalist-terminal hover:bg-brutalist-terminal border-brutalist-terminal !text-brutalist-fg' : ''}`}
                                    tabIndex={isLogin ? -1 : 0}
                                >
                                    {success ? '// ACCOUNT CREATED ✓' : (
                                        <>
                                            CREATE ACCESS
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-4 pt-3 border-t border-brutalist-fg/20 flex justify-center">
                                <button 
                                    type="button" 
                                    onClick={toggleMode}
                                    className="font-mono text-[10px] text-brutalist-fg uppercase tracking-widest hover:text-brutalist-accent transition-colors font-bold"
                                    tabIndex={isLogin ? -1 : 0}
                                >
                                    ALREADY REGISTRED? LOG IN
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default AuthModal;

