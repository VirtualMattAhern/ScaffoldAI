import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { getMsalInstance, isEntraConfigured } from './auth/msalConfig';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { MonthlyPlaybooks } from './pages/MonthlyPlaybooks';
import { WeeklyPlanning } from './pages/WeeklyPlanning';
import { DailyRuleOf3 } from './pages/DailyRuleOf3';
import { Settings } from './pages/Settings';
import { GuidedMode } from './pages/GuidedMode';
import { DecisionHelper } from './pages/DecisionHelper';
import { Onboarding } from './pages/Onboarding';
import { Landing } from './pages/Landing';
import { ONBOARDING_DONE_KEY } from './pages/Landing';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

function AppRoutes() {
  useLocation();
  const { user, loading } = useAuth();
  const hasCompletedOnboarding = user ? localStorage.getItem(ONBOARDING_DONE_KEY(user.id)) === 'true' : false;

  if (loading) return <div className="screen-loading">Loading…</div>;

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/landing" replace />} />
      <Route path="/" element={!user ? <Navigate to="/landing" replace /> : hasCompletedOnboarding ? <Layout /> : <Navigate to="/onboarding" replace />}>
        <Route index element={<Navigate to="/daily" replace />} />
        <Route path="monthly" element={<ErrorBoundary><MonthlyPlaybooks /></ErrorBoundary>} />
        <Route path="weekly" element={<ErrorBoundary><WeeklyPlanning /></ErrorBoundary>} />
        <Route path="daily" element={<ErrorBoundary><DailyRuleOf3 /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        <Route path="guided/:taskId" element={<ErrorBoundary><GuidedMode /></ErrorBoundary>} />
        <Route path="decision/:taskId" element={<ErrorBoundary><DecisionHelper /></ErrorBoundary>} />
      </Route>
    </Routes>
  );
}

function App() {
  const content = (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );

  if (isEntraConfigured()) {
    return (
      <MsalProvider instance={getMsalInstance()}>
        {content}
      </MsalProvider>
    );
  }
  return content;
}

export default App;
