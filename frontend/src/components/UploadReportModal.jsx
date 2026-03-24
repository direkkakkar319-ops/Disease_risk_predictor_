import React, { useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Activity, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadReportModal({ children }) {
    const [open, setOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFiles = (incomingFiles) => {
        setError(null);
        let hasError = false;
        
        const validFiles = Array.from(incomingFiles).filter(file => {
            if (file.size > MAX_FILE_SIZE) {
                setError(`File ${file.name} exceeds the 50MB limit.`);
                hasError = true;
                return false;
            }
            return true;
        });

        if (!hasError && validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFiles(e.target.files);
        }
        // Reset input value so same file can be selected again if removed
        e.target.value = '';
    };

    const removeFile = (indexToRemove) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
        setError(null);
    };

    const handleUpload = () => {
        // Pass files to existing model/analysis pipeline here
        console.log("Analyzing files:", files);
        
        // Reset state and close
        setFiles([]);
        setError(null);
        setOpen(false);
    };

    const handleOpenChange = (newOpen) => {
        if (!newOpen) {
            setFiles([]);
            setError(null);
        }
        setOpen(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-brutalist-bg border-brutalist-fg rounded-none p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
                <DialogHeader className="mb-8">
                    <DialogTitle className="font-space text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brutalist-fg uppercase">
                        UPLOAD. REPORT.
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs sm:text-sm text-brutalist-muted mt-2">
                        Upload your medical reports or lab images for AI analysis
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-3 sm:gap-4 mb-8">
                    <div className="flex flex-col items-center justify-center gap-2 py-4 border border-brutalist-fg bg-brutalist-bg flex-1 hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors group cursor-default">
                        <FileText className="w-5 h-5 text-brutalist-fg group-hover:text-brutalist-bg transition-colors" />
                        <span className="text-xs font-mono tracking-wider uppercase text-brutalist-fg group-hover:text-brutalist-bg transition-colors">PDF</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 py-4 border border-brutalist-fg bg-brutalist-bg flex-1 hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors group cursor-default">
                        <ImageIcon className="w-5 h-5 text-brutalist-fg group-hover:text-brutalist-bg transition-colors" />
                        <span className="text-xs font-mono tracking-wider uppercase text-brutalist-fg group-hover:text-brutalist-bg transition-colors">IMAGE</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 py-4 border border-brutalist-fg bg-brutalist-bg flex-1 hover:bg-brutalist-fg hover:text-brutalist-bg transition-colors group cursor-default">
                        <Activity className="w-5 h-5 text-brutalist-fg group-hover:text-brutalist-bg transition-colors" />
                        <span className="text-xs font-mono tracking-wider uppercase text-brutalist-fg group-hover:text-brutalist-bg transition-colors">DICOM</span>
                    </div>
                </div>
                
                <div 
                    className={`relative border-2 border-dashed ${dragActive ? 'border-brutalist-accent bg-brutalist-accent/5' : 'border-brutalist-fg'} transition-all duration-200 p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer group overflow-hidden`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {/* Animated Scan Line */}
                    {(files.length > 0 || dragActive) && (
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
                            <div className="absolute left-0 w-full h-2 sm:h-3 bg-brutalist-accent/50 animate-[scan-vertical_1.2s_linear_infinite] shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                        </div>
                    )}

                    <input 
                        type="file" 
                        multiple 
                        accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                        onChange={handleChange}
                    />
                    
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-brutalist-fg bg-brutalist-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-brutalist-fg" />
                    </div>
                    
                    <p className="font-space font-bold text-lg sm:text-xl tracking-tight text-brutalist-fg text-center uppercase mb-2 relative z-10">
                        DRAG & DROP YOUR FILES HERE
                    </p>
                    <p className="font-mono text-xs text-brutalist-muted text-center mb-6 uppercase tracking-wider relative z-10">
                        Supported: PDF, JPG, PNG, DICOM
                    </p>
                    
                    <Button 
                        variant="outline" 
                        type="button"
                        className="bg-transparent hover:bg-brutalist-fg text-brutalist-fg hover:text-brutalist-bg text-xs font-mono uppercase h-10 px-6 sm:px-8 rounded-none border border-brutalist-fg transition-colors relative z-10 pointer-events-none"
                    >
                        BROWSE FILES
                    </Button>
                </div>

                {error && (
                    <div className="mt-4 p-3 border border-red-500 bg-red-500/10 text-red-500 font-mono text-xs uppercase tracking-wider text-center">
                        {error}
                    </div>
                )}

                {files.length > 0 && (
                    <div className="mt-6 flex flex-col gap-3 max-h-48 overflow-y-auto pr-2">
                        {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 border border-brutalist-fg bg-brutalist-bg font-mono text-xs relative overflow-hidden group">
                                <div className="flex items-center gap-4 z-10 w-full pr-8">
                                    <div className="p-2 bg-brutalist-fg text-brutalist-bg border border-brutalist-fg">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col w-full min-w-0">
                                        <span className="truncate text-brutalist-fg uppercase tracking-wider font-bold mb-1">
                                            {file.name}
                                        </span>
                                        <div className="flex items-center justify-between text-brutalist-muted">
                                            <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                            <span>Ready</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeFile(index); }} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brutalist-muted hover:text-red-500 transition-colors z-10 p-2 bg-brutalist-bg"
                                    aria-label="Remove file"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                {/* Fake progress bar at bottom */}
                                <div className="absolute bottom-0 left-0 h-1 bg-brutalist-accent" style={{ width: '100%' }} />
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                    <Button 
                        variant="outline" 
                        className="font-mono font-bold text-xs rounded-none border border-brutalist-fg bg-transparent text-brutalist-fg hover:bg-brutalist-fg hover:text-brutalist-bg uppercase tracking-widest h-12 px-6 sm:px-8 w-full sm:w-auto"
                        onClick={() => handleOpenChange(false)}
                    >
                        CANCEL
                    </Button>
                    <Button 
                        disabled={files.length === 0}
                        className="font-mono font-bold text-xs rounded-none border border-brutalist-fg bg-brutalist-fg text-brutalist-bg hover:bg-brutalist-accent hover:border-brutalist-accent uppercase tracking-widest h-12 px-6 sm:px-8 w-full sm:w-auto flex items-center justify-center gap-3 group/btn disabled:opacity-50 disabled:hover:bg-brutalist-fg disabled:hover:border-brutalist-fg disabled:cursor-not-allowed"
                        onClick={handleUpload}
                    >
                        ANALYZE REPORT
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default UploadReportModal;
