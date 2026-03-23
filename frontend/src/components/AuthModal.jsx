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

export function AuthModal({ children }) {
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
        setSuccess(false);
        setShake(false);
        setIsLogin(true);
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(false);
        setSuccess(false);
        setPassword('');
        setConfirmPassword('');
    };

    const triggerErrorShake = () => {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 300);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(false);

        if (!email || !password) {
            triggerErrorShake();
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            triggerErrorShake();
            return;
        }

        // Mock success
        setSuccess(true);
        setError(false);
        
        if (isLogin) {
            setTimeout(() => {
                setOpen(false);
                setTimeout(resetForm, 500); // Wait for fade out
            }, 800);
        } else {
            setTimeout(() => {
                setSuccess(false);
                setIsLogin(true);
                setPassword('');
                setConfirmPassword('');
            }, 1000);
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
                overlayClassName="bg-black/5 backdrop-blur-sm transition-all duration-300 data-[state=closed]:duration-500"
                className={`sm:max-w-[400px] bg-[#f0ede6] border-brutalist-fg rounded-none p-6 overflow-hidden ${shake ? 'animate-shake' : ''} shadow-2xl duration-250`}
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
                                <DialogClose className="font-mono text-2xl font-bold text-brutalist-fg opacity-50 hover:opacity-100 transition-colors focus:outline-none leading-none flex items-center justify-center p-2 rounded-none hover:bg-brutalist-fg/10">
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
                                        className={`w-full h-10 bg-transparent border ${error && !email ? 'border-red-500' : 'border-brutalist-fg'} px-3 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40 placeholder-lowercase`}
                                        placeholder="user@example.com"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 animate-slide-up relative" style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
                                    <label className="font-mono text-[11px] font-bold tracking-widest uppercase text-brutalist-fg flex items-center">
                                        PASSWORD
                                        {error && <span className="text-red-500 text-[10px] ml-2">// AUTH FAILED</span>}
                                    </label>
                                    <div className="relative group">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full h-10 bg-transparent border ${error ? 'border-red-500' : 'border-brutalist-fg'} pl-3 pr-10 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40`}
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-0 top-0 h-full px-3 text-brutalist-fg hover:text-brutalist-accent focus:outline-none transition-colors"
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button 
                                    type="submit"
                                    className={`w-full mt-2 font-mono font-bold text-xs rounded-none border border-brutalist-fg bg-brutalist-fg text-[#f0ede6] hover:bg-brutalist-accent hover:text-white uppercase tracking-widest h-11 flex items-center justify-center gap-2 group/btn transition-colors animate-slide-up ${success ? 'bg-brutalist-terminal hover:bg-brutalist-terminal border-brutalist-terminal !text-brutalist-fg' : ''}`}
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
                                        className={`w-full h-9 bg-transparent border ${error && !email ? 'border-red-500' : 'border-brutalist-fg'} px-3 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40`}
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
                                            className={`w-full h-9 bg-transparent border ${error && !password ? 'border-red-500' : 'border-brutalist-fg'} pl-3 pr-10 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40`}
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
                                            className={`w-full h-9 bg-transparent border ${error && !passwordsMatch ? 'border-red-500' : 'border-brutalist-fg'} pl-3 pr-10 font-mono text-xs text-brutalist-fg focus:outline-none focus:border-brutalist-accent transition-colors rounded-none placeholder:text-brutalist-fg/40`}
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
                                    className={`w-full mt-2 font-mono font-bold text-xs rounded-none border border-brutalist-fg bg-brutalist-fg text-[#f0ede6] hover:bg-brutalist-accent hover:text-white uppercase tracking-widest h-11 flex items-center justify-center gap-2 group/btn transition-colors ${success ? 'bg-brutalist-terminal hover:bg-brutalist-terminal border-brutalist-terminal !text-brutalist-fg' : ''}`}
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
