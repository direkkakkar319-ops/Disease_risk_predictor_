import React from 'react';

const Card = ({ children, className = '' }) => {
  return <div className={`card-surface ${className}`}>{children}</div>;
};

export default Card;
