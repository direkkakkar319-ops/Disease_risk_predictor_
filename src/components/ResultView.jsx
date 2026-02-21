import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { useAnalysis } from '../context/AnalysisContext';

const ResultView = () => {
  const { latestResult } = useAnalysis();

  if (!latestResult) {
    return null;
  }

  return (
    <Card className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Latest Report Analysis</h2>
          <p className="panel-subtitle">Most recent completed analysis output</p>
        </div>
        <Badge label="COMPLETED" tone="success" />
      </div>
      <div className="result-card">
        <div className="result-body">
          <div className="result-header">
            <div>
              <p className="result-title">{latestResult.fileName}</p>
              <p className="result-subtitle">{latestResult.analysisType}</p>
            </div>
          </div>
          <div className="result-actions">
            <Button variant="primary">View Details</Button>
            <Button variant="secondary">Download</Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ResultView;
