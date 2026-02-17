import React from 'react';

const ResultView = ({ results }) => {
  return (
    <div className="result-container">
      <h2>Prediction Results</h2>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
};

export default ResultView;
