import React from 'react';

const Status = ({ status }) => {
  return (
    <div className="status-container">
      <h3>Processing Status: {status}</h3>
    </div>
  );
};

export default Status;
