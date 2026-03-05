// src/App.jsx
// Atualizado para incluir rota de Onboarding e verificação de status pós-login

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

// ─── Rota privada com verificação de onboarding ───────────────────────────────
// Redireciona para /onboarding se o usuário ainda não cadastrou empresa
const PrivateRouteWithOnboarding = ({ children }) => {
  const tokens = localStorage.getItem('auth_tokens');
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!tokens) return setChecking(false);

    api.get('/onboarding/status')
      .then(({ data }) => {
        setNeedsOnboarding(!data.onboardingCompleto);
      })
      .catch(() => {
        // Em caso de erro na verificação, deixa passar para o dashboard
        setNeedsOnboarding(false);
      })
      .finally(() => setChecking(false));
  }, []);

  if (!tokens) return <Navigate to="/login" />;

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh', background: '#020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #1e293b',
            borderTopColor: '#3b82f6', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#475569', fontSize: 13, fontFamily: 'sans-serif' }}>
            Verificando ambiente...
          </p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) return <Navigate to="/onboarding" />;

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
