import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Screen.css';
import './Onboarding.css';
import './Landing.css';

const ONBOARDING_DONE_KEY = (userId: string) => `skafoldai_onboarding_done_${userId}`;

export function Landing() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    setShowSignIn(true);
    document.getElementById('landing-signin')?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-brand">
            <img src="/mascot.png" alt="" className="landing-mascot" aria-hidden />
            <h1 className="landing-logo">Skafold</h1>
          </div>
          <p className="landing-tagline">
            From ideas to plans to focused action.
          </p>
          <button
            type="button"
            className="landing-get-started"
            onClick={handleGetStarted}
          >
            Get Started
          </button>
        </div>
      </section>

      <section id="landing-signin" className="landing-signin">
        <div className="onboarding-card">
          <h2>Sign in to continue</h2>
          <p>Create your account or sign in to get started.</p>
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
              autoFocus={showSignIn && !isEntraEnabled}
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
      </section>
    </div>
  );
}

export { ONBOARDING_DONE_KEY };
