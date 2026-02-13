import React, { useState } from 'react';
import Upload from '../components/Upload';
import Status from '../components/Status';
import ResultView from '../components/ResultView';

const Home = () => {
  const [status, setStatus] = useState('Idle');
  const [results, setResults] = useState(null);

  return (
    <div className="home-page">
      <h1>Disease Risk Predictor</h1>
      <Upload setStatus={setStatus} setResults={setResults} />
      <Status status={status} />
      {results && <ResultView results={results} />}
    </div>
  );
};

export default Home;
