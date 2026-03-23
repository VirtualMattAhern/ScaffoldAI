import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { api } from '../api/client';
import './Layout.css';

export function Layout() {
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDaily = location.pathname === '/daily' || location.pathname.endsWith('/daily');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/landing', { replace: true });
  };

  const handleQuickAdd = async () => {
    const title = quickAddTitle.trim();
    if (!title) return;
    setQuickAddSaving(true);
    try {
      await api.tasks.create({ title, type: 'one_off' });
      window.dispatchEvent(new CustomEvent('skafold:task-created'));
      setQuickAddTitle('');
      setQuickAddOpen(false);
      if (!location.pathname.startsWith('/weekly')) navigate('/weekly');
    } finally {
      setQuickAddSaving(false);
    }
  };

  const showHeader = !settings.focusMode || !isDaily;
  return (
    <div
      className={`layout theme-${settings.sensoryTheme} ${settings.highContrast ? 'high-contrast' : ''} ${settings.dyslexiaFont ? 'dyslexia-font' : ''} ${settings.reduceMotion ? 'reduce-motion' : ''} ${settings.darkMode ? 'dark-mode' : ''}`}
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
      <button
        type="button"
        className="quick-add-fab"
        onClick={() => setQuickAddOpen((value) => !value)}
        aria-expanded={quickAddOpen}
        aria-controls="global-quick-add"
      >
        +
      </button>
      {quickAddOpen && (
        <div className="quick-add-popover" id="global-quick-add">
          <label htmlFor="global-quick-add-input" className="quick-add-label">
            Quick add
          </label>
          <div className="quick-add-popover-row">
            <input
              id="global-quick-add-input"
              type="text"
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickAddTitle.trim()) handleQuickAdd();
              }}
              placeholder="Add a task"
            />
            <button type="button" onClick={handleQuickAdd} disabled={!quickAddTitle.trim() || quickAddSaving}>
              {quickAddSaving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
