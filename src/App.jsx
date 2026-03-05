// src/App.jsx
// CORRIGIDO: lê token no formato { token, user } do index.js atual
// Evita loop de refresh e 401 no /onboarding/status

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import GoalSandbox from './pages/GoalSandbox';
import Onboarding from './pages/Onboarding';
import api from './services/api';

// ─── Rota privada simples ─────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const tokens = localStorage.getItem('auth_tokens');
  return tokens ? children : <Navigate to="/login" />;
};

// ─── Extrai o token JWT do localStorage (suporta ambos os formatos) ──────────
function getToken() {
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.accessToken || parsed.token || null;
  } catch {
    return null;
  }
}

// ─── Tela de carregamento ─────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #1e293b',
          borderTopColor: '#3b82f6', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <p style={{ color: '#475569', fontSize: 13, fontFamily: 'sans-serif', margin: 0 }}>
          Verificando ambiente...
        </p>
      </div>
    </div>
  );
}

// ─── Rota privada com verificação de onboarding ───────────────────────────────
const PrivateRouteWithOnboarding = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [redirect, setRedirect] = useState(null); // null | 'login' | 'onboarding'

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setRedirect('login');
      setChecking(false);
      return;
    }

    api.get('/onboarding/status')
      .then(({ data }) => {
        if (!data.onboardingCompleto) setRedirect('onboarding');
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('auth_tokens');
          setRedirect('login');
        }
        // Qualquer outro erro: deixa entrar no dashboard
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <LoadingScreen />;
  if (redirect === 'login') return <Navigate to="/login" />;
  if (redirect === 'onboarding') return <Navigate to="/onboarding" />;
  return children;
};

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Routes>

        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/sandbox" element={<GoalSandbox />} />

        {/* Onboarding — acessível apenas após login */}
        <Route path="/onboarding" element={
          <PrivateRoute>
            <Onboarding />
          </PrivateRoute>
        } />

        {/* Dashboard — verifica onboarding antes de exibir */}
        <Route path="/dashboard" element={
          <PrivateRouteWithOnboarding>
            <div className="min-h-screen bg-slate-50 p-10 flex flex-col items-center justify-center text-center">
              <img
                src="/logo.jpg"
                alt="Logo MetasPro"
                className="w-32 h-32 mb-6 object-contain"
              />
              <h1 className="text-4xl font-black text-slate-800">
                Metas<span className="text-blue-600">Pro</span>
              </h1>
              <p className="text-slate-500 mt-4 text-xl">🚀 Dashboard Principal em Construção</p>
              <button
                onClick={() => {
                  localStorage.removeItem('auth_tokens');
                  window.location.href = '/login';
                }}
                className="mt-8 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
              >
                ← Sair
              </button>
            </div>
          </PrivateRouteWithOnboarding>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </Router>
  );
}
