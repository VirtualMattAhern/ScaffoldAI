import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Screen.css';
import './Onboarding.css';

const ONBOARDING_DONE_KEY = (userId: string) => `skafoldai_onboarding_done_${userId}`;

export function Landing() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      const u = await login(email.trim(), displayName.trim() || undefined);
      const done = localStorage.getItem(ONBOARDING_DONE_KEY(u.id)) === 'true';
      navigate(done ? '/daily' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const { loginWithEntra, isEntraEnabled } = useAuth();

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1>Welcome to SkafoldAI</h1>
        <p>From ideas to plans to focused action. Sign in to get started.</p>
        {isEntraEnabled && (
          <>
            <button
              type="button"
              className="landing-entra-btn"
              onClick={() => loginWithEntra()}
              disabled={loading}
            >
              Sign in with Microsoft
            </button>
            <p className="landing-divider">or</p>
          </>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            autoComplete="email"
            autoFocus={!isEntraEnabled}
            disabled={loading}
          />
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name (optional)"
            autoComplete="name"
            disabled={loading}
          />
          {error && <p className="landing-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : isEntraEnabled ? 'Sign in with email' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export { ONBOARDING_DONE_KEY };
