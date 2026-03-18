import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '480px',
          margin: '4rem auto',
        }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: 'var(--skafold-slate-600)', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--skafold-blue-700)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginRight: '0.5rem',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => { window.location.href = '/daily'; }}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--skafold-white)',
              color: 'var(--skafold-slate-800)',
              border: '1px solid var(--skafold-slate-200)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Go to Daily
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
