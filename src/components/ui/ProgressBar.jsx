import React from 'react';

const ProgressBar = ({ value = 0 }) => {
  return (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${value}%` }} />
    </div>
  );
};

export default ProgressBar;
