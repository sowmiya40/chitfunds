import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <div className="navbar-logo-section">
          <img src="/logo.jpg" alt="Chit Funds Logo" className="brand-logo" />
          <span className="brand-name">Chit Funds</span>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/groups" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Groups
            </NavLink>
          </li>
          <li>
            <NavLink to="/subscribers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Subscribers
            </NavLink>
          </li>
          <li>
            <NavLink to="/fund-calculation" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Fund Calculation
            </NavLink>
          </li>
          <li>
               <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                 Profile
               </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
