import React from 'react';

const Badge = ({ label, tone = 'default' }) => {
  return <span className={`badge badge-${tone}`}>{label}</span>;
};

export default Badge;
