// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login      from './pages/Login';
import GoalSandbox from './pages/GoalSandbox';
import Onboarding  from './pages/Onboarding';
import GoalWizard  from './pages/GoalWizard';
import Dashboard   from './pages/Dashboard';
import api from './services/api';

// ─── Extrai token (suporta { token } e { accessToken }) ───────────────────────
function getToken() {
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p.accessToken || p.token || null;
  } catch { return null; }
}

// ─── Rota privada simples ─────────────────────────────────────────────────────
const PrivateRoute = ({ children }) =>
  getToken() ? children : <Navigate to="/login" />;

// ─── Tela de carregamento ─────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#060910', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#4b5563', fontSize: 13, fontFamily: 'sans-serif', margin: 0 }}>
          Verificando ambiente...
        </p>
      </div>
    </div>
  );
}

// ─── Rota privada com verificação de onboarding ───────────────────────────────
const PrivateRouteWithOnboarding = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { setRedirect('login'); setChecking(false); return; }

    api.get('/onboarding/status')
      .then(({ data }) => {
        if (!data.onboardingCompleto) setRedirect('onboarding');
      })
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('auth_tokens');
          setRedirect('login');
        }
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking)                  return <LoadingScreen />;
  if (redirect === 'login')      return <Navigate to="/login" />;
  if (redirect === 'onboarding') return <Navigate to="/onboarding" />;
  return children;
};

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Routes>

        {/* Públicas */}
        <Route path="/login"   element={<Login />} />
        <Route path="/sandbox" element={<GoalSandbox />} />

        {/* Onboarding — apenas após login, antes de ter empresa */}
        <Route path="/onboarding" element={
          <PrivateRoute><Onboarding /></PrivateRoute>
        } />

        {/* Wizard de Nova Meta / Recalcular (?edit=id) */}
        <Route path="/nova-meta" element={
          <PrivateRouteWithOnboarding><GoalWizard /></PrivateRouteWithOnboarding>
        } />

        {/* Dashboard — lista de metas */}
        <Route path="/dashboard" element={
          <PrivateRouteWithOnboarding><Dashboard /></PrivateRouteWithOnboarding>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </Router>
  );
}
