import React from 'react';

const Skeleton = ({ height = 16, width = '100%', className = '' }) => {
  return <div className={`skeleton ${className}`} style={{ height, width }} />;
};

export default Skeleton;
