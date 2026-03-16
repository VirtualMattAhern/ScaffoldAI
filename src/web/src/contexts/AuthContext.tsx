import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest, isEntraConfigured } from '../auth/msalConfig';
import { setAuthTokenProvider } from '../api/client';

const STORAGE_KEY = 'skafoldai_user';

export type User = { id: string; email: string; displayName: string };

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as User;
    return u?.id && u?.email ? u : null;
  } catch {
    return null;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, displayName?: string) => Promise<User>;
  loginWithEntra: () => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
  isEntraEnabled: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const entraEnabled = isEntraConfigured();
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const setUser = useCallback((u: User | null) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
    setUserState(u);
  }, []);

  const login = useCallback(async (email: string, displayName?: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), displayName: displayName?.trim() || undefined }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => 'Login failed'));
    const u = (await res.json()) as User;
    setUser(u);
    return u;
  }, [setUser]);

  const loginWithEntra = useCallback(async () => {
    if (!entraEnabled || !instance) return;
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error('Entra login failed:', err);
    }
  }, [entraEnabled, instance]);

  const logout = useCallback(() => {
    if (entraEnabled && instance) {
      instance.logoutRedirect().catch(() => setUser(null));
    }
    setUser(null);
  }, [setUser, entraEnabled, instance]);

  // After Entra redirect: get token, call /api/auth/me with Bearer, sync user
  useEffect(() => {
    if (!entraEnabled || !instance || inProgress !== 'none') return;
    if (!isAuthenticated) {
      setLoading(false);
      setUserState(loadUser());
      return;
    }
    const syncEntraUser = async () => {
      try {
        const accounts = instance.getAllAccounts();
        if (accounts.length === 0) {
          setLoading(false);
          return;
        }
        const tokenRes = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        const token = tokenRes?.idToken ?? tokenRes?.accessToken;
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const u = (await res.json()) as User;
        setUser(u);
      } catch {
        // Silent fail - user may need to sign in again
      } finally {
        setLoading(false);
      }
    };
    syncEntraUser();
  }, [entraEnabled, instance, inProgress, isAuthenticated, setUser]);

  // Initial load when not using Entra
  useEffect(() => {
    if (!entraEnabled) {
      setUserState(loadUser());
      setLoading(false);
    }
  }, [entraEnabled]);

  // Register token provider for API client when using Entra
  useEffect(() => {
    if (!entraEnabled || !instance) return;
    setAuthTokenProvider(async () => {
      try {
        const accounts = instance.getAllAccounts();
        if (accounts.length === 0) return null;
        const res = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
        return res?.idToken ?? res?.accessToken ?? null;
      } catch {
        return null;
      }
    });
    return () => setAuthTokenProvider(null);
  }, [entraEnabled, instance]);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    loginWithEntra,
    logout,
    setUser,
    isEntraEnabled: entraEnabled,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isEntraConfigured()) {
    return <AuthProviderInner>{children}</AuthProviderInner>;
  }
  return <AuthProviderFallback>{children}</AuthProviderFallback>;
}

function AuthProviderFallback({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUserState(loadUser());
    setLoading(false);
  }, []);

  const setUser = useCallback((u: User | null) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
    setUserState(u);
  }, []);

  const login = useCallback(async (email: string, displayName?: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), displayName: displayName?.trim() || undefined }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => 'Login failed'));
    const u = (await res.json()) as User;
    setUser(u);
    return u;
  }, [setUser]);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    loginWithEntra: async () => {},
    logout: () => setUser(null),
    setUser,
    isEntraEnabled: false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
