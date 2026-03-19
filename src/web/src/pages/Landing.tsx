import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Screen.css';
import './Landing.css';

const ONBOARDING_DONE_KEY = (userId: string) => `skafoldai_onboarding_done_${userId}`;

export function Landing() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithEntra, isEntraEnabled } = useAuth();
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

  return (
    <div className="landing-page">
      <div className="landing-shell">
        <header className="landing-header">
          <img
            src="/brand/skafold-logo.png"
            alt="skafold"
            className="landing-logo-full"
            width={280}
            height={80}
          />
          <p className="landing-tagline">
            Ideas → plans → focus. Built for brains that bounce—clear steps, zero clutter.
          </p>
        </header>

        <main className="landing-main">
          <div className="landing-card">
            <h1 className="landing-card-title">Start free with email</h1>
            <p className="landing-card-lede">
              No Microsoft account needed. We&apos;ll set you up in one step.
            </p>

            <form className="landing-form" onSubmit={handleSubmit} noValidate>
              <label className="landing-label" htmlFor="landing-email">
                Email
              </label>
              <input
                id="landing-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                disabled={loading}
                className="landing-input"
              />

              <label className="landing-label" htmlFor="landing-name">
                What should we call you? <span className="landing-optional">(optional)</span>
              </label>
              <input
                id="landing-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                disabled={loading}
                className="landing-input"
              />

              {error && (
                <p className="landing-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="landing-btn-primary" disabled={loading}>
                {loading ? 'Signing you in…' : 'Continue'}
              </button>
            </form>

            <div className="landing-oauth-soon" aria-label="More sign-in options coming soon">
              <span className="landing-oauth-soon-label">More ways to sign in</span>
              <div className="landing-oauth-row">
                <button
                  type="button"
                  className="landing-btn-oauth landing-btn-oauth--disabled"
                  disabled
                  title="Google sign-in — coming soon"
                >
                  <span className="landing-oauth-icon" aria-hidden>
                    G
                  </span>
                  Google
                </button>
                <button
                  type="button"
                  className="landing-btn-oauth landing-btn-oauth--disabled"
                  disabled
                  title="Apple sign-in — coming soon"
                >
                  Apple
                </button>
              </div>
              <p className="landing-oauth-hint">
                We&apos;re adding Google and Apple—hang tight.
              </p>
            </div>

            {isEntraEnabled && (
              <details className="landing-admin-auth">
                <summary className="landing-admin-summary">
                  Team / work sign-in (Microsoft)
                </summary>
                <p className="landing-admin-copy">
                  For people helping run or maintain the app. Everyone else can use email above.
                </p>
                <button
                  type="button"
                  className="landing-btn-entra"
                  onClick={() => loginWithEntra()}
                  disabled={loading}
                >
                  Sign in with Microsoft
                </button>
              </details>
            )}
          </div>
        </main>

        <footer className="landing-footer">
          <p>Simple actions. Calm visuals. You&apos;ve got this.</p>
        </footer>
      </div>
    </div>
  );
}

export { ONBOARDING_DONE_KEY };
