import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export function Layout() {
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDaily = location.pathname === '/daily' || location.pathname.endsWith('/daily');

  const handleSignOut = () => {
    logout();
    navigate('/landing', { replace: true });
  };

  const showHeader = !settings.focusMode || !isDaily;
  return (
    <div
      className={`layout ${settings.highContrast ? 'high-contrast' : ''} ${settings.dyslexiaFont ? 'dyslexia-font' : ''} ${settings.reduceMotion ? 'reduce-motion' : ''}`}
      style={{ fontSize: `${settings.fontSizePercent}%` }}
    >
      {showHeader && (
      <header className="layout-header">
        <span className="brand">SkafoldAI</span>
        <nav className="horizon-switcher" aria-label="Planning horizons">
          <NavLink to="/monthly" className={({ isActive }) => (isActive ? 'active' : '')}>
            Monthly
          </NavLink>
          <span className="separator">·</span>
          <NavLink to="/weekly" className={({ isActive }) => (isActive ? 'active' : '')}>
            Weekly
          </NavLink>
          <span className="separator">·</span>
          <NavLink to="/daily" className={({ isActive }) => (isActive ? 'active' : '')}>
            Daily
          </NavLink>
        </nav>
        <div className="header-right">
          {user && <span className="user-email" title={user.email}>{user.displayName || user.email}</span>}
          <Link to="/settings" className="settings-link">Settings</Link>
          <button type="button" onClick={handleSignOut} className="sign-out-btn">Sign out</button>
        </div>
      </header>
      )}
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
