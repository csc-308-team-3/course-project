import { NavLink, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';

function navButtonClass(isActive) {
  return isActive ? 'nav-button active-nav-button' : 'nav-button';
}

function Navbar() {
  const { pathname } = useLocation();
  const isHouseholdSection =
    pathname === '/household' || pathname === '/no-household';

  return (
    <header className="household-nav">
      <div className="household-brand">
        <div className="brand-mark">⌂</div>
        <strong>ChoreMate</strong>
      </div>

      <nav className="nav-actions">
        <NavLink
          className={({ isActive }) =>
            navButtonClass(isActive || isHouseholdSection)
          }
          to="/household"
        >
          Household
        </NavLink>
        <NavLink
          className={({ isActive }) => navButtonClass(isActive)}
          to="/calendar"
        >
          Calendar
        </NavLink>
        <NavLink
          className={({ isActive }) => navButtonClass(isActive)}
          to="/awards"
        >
          Awards
        </NavLink>
        <NavLink
          className={({ isActive }) => navButtonClass(isActive)}
          to="/profile"
        >
          Profile
        </NavLink>
        <LogoutButton />
      </nav>
    </header>
  );
}

export default Navbar;
