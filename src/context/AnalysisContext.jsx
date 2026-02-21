import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AnalysisContext = createContext(null);

const allowedTypes = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/json'
];

const generateJob = (overrides = {}) => ({
  id: `JOB-${Math.floor(Math.random() * 90000 + 10000)}`,
  fileName: 'sample-material-report.pdf',
  analysisType: 'Spectral',
  status: 'pending',
  progress: 0,
  etaMinutes: 8,
  uploadedAt: new Date().toISOString(),
  completedAt: null,
  fileType: 'pdf',
  preview: 'https://picsum.photos/seed/material/240/160',
  metrics: {
    purity: 92,
    strength: 78,
    conductivity: 64,
    riskScore: 0.23
  },
  ...overrides
});

const seedJobs = [
  generateJob({ status: 'completed', progress: 100, etaMinutes: 0, completedAt: new Date(Date.now() - 3600 * 1000).toISOString(), fileName: 'alloy-batch-21.pdf', analysisType: 'Chemical', fileType: 'pdf' }),
  generateJob({ status: 'processing', progress: 62, etaMinutes: 4, fileName: 'composite-panel.csv', analysisType: 'Structural', fileType: 'csv' }),
  generateJob({ status: 'failed', progress: 100, etaMinutes: 0, fileName: 'ceramic-run-03.xlsx', analysisType: 'Thermal', fileType: 'xlsx' }),
  generateJob({ status: 'pending', progress: 0, etaMinutes: 9, fileName: 'polymer-scan.txt', analysisType: 'Optical', fileType: 'txt' })
];

export const AnalysisProvider = ({ children, initialJobs = seedJobs, initialLoading = true }) => {
  const [jobs, setJobs] = useState(initialJobs);
  const [uploadState, setUploadState] = useState({ status: 'idle', progress: 0, error: null, fileName: null });
  const [loading, setLoading] = useState(initialLoading);
  const timers = useRef([]);

  useEffect(() => {
    if (!initialLoading) return;
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [initialLoading]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearInterval(timer));
      timers.current = [];
    };
  }, []);

  const startUpload = (file) => {
    if (!file) {
      setUploadState({ status: 'error', progress: 0, error: 'No file selected', fileName: null });
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      setUploadState({ status: 'error', progress: 0, error: 'Unsupported file format', fileName: file.name });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadState({ status: 'error', progress: 0, error: 'File exceeds 20MB limit', fileName: file.name });
      return;
    }
    setUploadState({ status: 'uploading', progress: 5, error: null, fileName: file.name });
    let progress = 5;
    const interval = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 12 + 6), 100);
      setUploadState((prev) => ({ ...prev, progress }));
      if (progress >= 100) {
        clearInterval(interval);
        setUploadState((prev) => ({ ...prev, status: 'success' }));
        const newJob = generateJob({
          status: 'processing',
          progress: 5,
          etaMinutes: 6,
          fileName: file.name,
          fileType: file.name.split('.').pop()
        });
        setJobs((prev) => [newJob, ...prev]);
        const jobInterval = setInterval(() => {
          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== newJob.id) return job;
              const nextProgress = Math.min(job.progress + Math.floor(Math.random() * 15 + 5), 100);
              const status = nextProgress >= 100 ? 'completed' : 'processing';
              if (status === 'completed') {
                clearInterval(jobInterval);
              }
              return {
                ...job,
                progress: nextProgress,
                status,
                etaMinutes: Math.max(0, job.etaMinutes - 1),
                completedAt: status === 'completed' ? new Date().toISOString() : null
              };
            })
          );
        }, 1200);
        timers.current.push(jobInterval);
      }
    }, 500);
    timers.current.push(interval);
  };

  const latestResult = useMemo(() => jobs.find((job) => job.status === 'completed'), [jobs]);

  const value = useMemo(
    () => ({
      jobs,
      latestResult,
      uploadState,
      loading,
      startUpload
    }),
    [jobs, latestResult, uploadState, loading]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};

export const useAnalysis = () => useContext(AnalysisContext);
