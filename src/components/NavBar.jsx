import React from 'react';
import { NavLink } from 'react-router-dom';

const NavBar = () => {
  return (
    <header className="app-header">
      <div className="app-brand">
        <span className="brand-icon">◇</span>
        <div>
          <p className="brand-title">DeepHealth</p>
        </div>
      </div>
      <nav className="app-nav" aria-label="Primary">
        <NavLink className="nav-link" to="/">
          Home
        </NavLink>
        <NavLink className="nav-link" to="/history">
          History
        </NavLink>
        <NavLink className="nav-link" to="/analytics">
          Analytics
        </NavLink>
      </nav>
    </header>
  );
};

export default NavBar;
