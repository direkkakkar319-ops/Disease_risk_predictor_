import React from 'react';
import Upload from '../components/Upload';
import Status from '../components/Status';
import ResultView from '../components/ResultView';
import Skeleton from '../components/ui/Skeleton';
import { useAnalysis } from '../context/AnalysisContext';

const Home = () => {
  const { loading } = useAnalysis();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Home</h1>
          <p className="page-subtitle">Monitor uploads, processing, and latest results in one place</p>
        </div>
      </div>
      {loading ? (
        <div className="grid">
          <Skeleton height={260} />
          <Skeleton height={260} />
          <Skeleton height={260} />
        </div>
      ) : (
        <div className="grid">
          <Upload />
          <Status />
          <ResultView />
        </div>
      )}
    </div>
  );
};

export default Home;
