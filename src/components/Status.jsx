import React from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import ProgressBar from './ui/ProgressBar';
import { useAnalysis } from '../context/AnalysisContext';

const Status = () => {
  const { jobs } = useAnalysis();

  return (
    <Card className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Status Tracker</h2>
          <p className="panel-subtitle">Real-time view of active analysis jobs</p>
        </div>
        <Badge label={`${jobs.length} Jobs`} tone="info" />
      </div>
      <div className="status-list">
        {jobs.slice(0, 4).map((job) => (
          <div key={job.id} className="status-item">
            <div className="status-meta">
              <div>
                <p className="status-title">{job.fileName}</p>
                <p className="status-subtitle">{job.analysisType}</p>
              </div>
              <Badge
                label={job.status.toUpperCase()}
                tone={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'warning'}
              />
            </div>
            <div className="status-progress">
              <ProgressBar value={job.progress} />
              <div className="status-footer">
                <span className="meta-label">{job.status === 'completed' ? 'Completed' : `ETA ${job.etaMinutes} min`}</span>
                <span className="meta-value">{job.progress}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default Status;
