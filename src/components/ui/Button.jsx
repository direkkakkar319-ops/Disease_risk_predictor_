import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', onClick, type = 'button', disabled = false, ariaLabel }) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

export default Button;
