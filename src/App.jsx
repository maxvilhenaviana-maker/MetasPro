// src/App.jsx
// Roteamento principal — MetasPro
// ATUALIZADO: SessionProvider envolve toda a aplicação para gestão
//             de empresa ativa, papel e unidade de monitoramento.

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login       from './pages/Login';
import GoalSandbox from './pages/GoalSandbox';
import Onboarding  from './pages/Onboarding';
import GoalWizard  from './pages/GoalWizard';
import Dashboard   from './pages/Dashboard';
import Inicial     from './pages/Inicial';
import Usuarios    from './pages/Usuarios';
import Empresas    from './pages/Empresas';
import { SessionProvider } from './contexts/SessionContext';
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

// ─── Tela de carregamento ─────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #e2e8f0',
        borderTopColor: '#0f2d52',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16,
      }} />
      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
        Verificando ambiente...
      </p>
    </div>
  );
}

// ─── Rota privada simples ─────────────────────────────────────────────────────
const PrivateRoute = ({ children }) =>
  getToken() ? children : <Navigate to="/login" />;

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
          localStorage.removeItem('session_context');
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
    // SessionProvider envolve tudo para que empresa/unidade fiquem
    // acessíveis em qualquer página via useSession()
    <SessionProvider>
      <Router>
        <Routes>

          {/* ── Rotas públicas ───────────────────────────────────────────── */}
          <Route path="/login"   element={<Login />} />
          <Route path="/sandbox" element={<GoalSandbox />} />

          {/* ── Onboarding ───────────────────────────────────────────────── */}
          <Route path="/onboarding" element={
            <PrivateRoute><Onboarding /></PrivateRoute>
          } />

          {/* ── TELA INICIAL ─────────────────────────────────────────────── */}
          <Route path="/inicial" element={
            <PrivateRouteWithOnboarding><Inicial /></PrivateRouteWithOnboarding>
          } />

          {/* ── Dashboard ────────────────────────────────────────────────── */}
          <Route path="/dashboard" element={
            <PrivateRouteWithOnboarding><Dashboard /></PrivateRouteWithOnboarding>
          } />

          {/* ── Wizard de Nova Meta ───────────────────────────────────────── */}
          <Route path="/nova-meta" element={
            <PrivateRouteWithOnboarding><GoalWizard /></PrivateRouteWithOnboarding>
          } />

          {/* ── MÓDULO USUÁRIOS ───────────────────────────────────────────── */}
          <Route path="/usuarios" element={
            <PrivateRouteWithOnboarding><Usuarios /></PrivateRouteWithOnboarding>
          } />

          {/* ── Módulos placeholder ───────────────────────────────────────── */}
          <Route path="/empresas" element={<PrivateRouteWithOnboarding><Empresas /></PrivateRouteWithOnboarding>} />
          <Route path="/unidades"       element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Unidades de Monitoramento" icone="🏭" /></PrivateRouteWithOnboarding>} />
          <Route path="/historico"      element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Histórico" icone="📈" /></PrivateRouteWithOnboarding>} />
          <Route path="/resultados"     element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Resultados" icone="📊" /></PrivateRouteWithOnboarding>} />
          <Route path="/justificativas" element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Justificativas" icone="📝" /></PrivateRouteWithOnboarding>} />
          <Route path="/termo"          element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Termo de Compromisso" icone="📄" /></PrivateRouteWithOnboarding>} />
          <Route path="/pacotes"        element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Pacotes de Assinatura" icone="📦" /></PrivateRouteWithOnboarding>} />
          <Route path="/saldo"          element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Saldo" icone="💰" /></PrivateRouteWithOnboarding>} />
          <Route path="/financeiro"     element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Financeiro" icone="💳" /></PrivateRouteWithOnboarding>} />
          <Route path="/outros"         element={<PrivateRouteWithOnboarding><PlaceholderModulo titulo="Outras Configurações" icone="🔧" /></PrivateRouteWithOnboarding>} />
          <Route path="/quem-somos"     element={<PlaceholderModulo titulo="Quem Somos" icone="🏅" publico />} />
          <Route path="/conceitos"      element={<PlaceholderModulo titulo="Conceitos MetasPro" icone="💡" publico />} />
          <Route path="/contato"        element={<PlaceholderModulo titulo="Contato" icone="📞" publico />} />

          {/* ── Raiz ─────────────────────────────────────────────────────── */}
          <Route path="/" element={
            getToken() ? <Navigate to="/inicial" /> : <Navigate to="/login" />
          } />

          {/* ── Fallback ─────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </Router>
    </SessionProvider>
  );
}

// ─── Placeholder genérico para módulos em desenvolvimento ────────────────────
function PlaceholderModulo({ titulo, icone, publico }) {
  const { useNavigate, useSearchParams } = require('react-router-dom');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const nav = useNavigate();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [params] = useSearchParams();
  const acao = params.get('acao');

  const ACOES_INFO = {
    consultar: { label: 'Consultar',  icon: '🔍', desc: 'Visualize, imprima, copie ou compartilhe pelo WhatsApp.' },
    incluir:   { label: 'Incluir',    icon: '➕', desc: 'Adicione um novo registro.' },
    alterar:   { label: 'Alterar',    icon: '✏️',  desc: 'Edite um registro existente.' },
    excluir:   { label: 'Excluir',    icon: '🗑️', desc: 'Remova um registro.' },
  };
  const acaoInfo = acao && ACOES_INFO[acao];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div style={{
        minHeight: '100vh', background: '#f8fafc',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <nav style={{
          background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '0 24px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={() => nav('/inicial')} style={{
            background: 'transparent', border: 'none',
            color: '#0f2d52', fontSize: 18, fontWeight: 900,
            fontFamily: "'Sora', sans-serif", cursor: 'pointer',
          }}>
            Metas<span style={{ color: '#16a34a' }}>Pro</span>
          </button>
          <button onClick={() => nav(-1)} style={{
            padding: '6px 14px', background: 'transparent',
            border: '1.5px solid #e2e8f0', borderRadius: 8,
            color: '#475569', fontSize: 13, cursor: 'pointer',
          }}>
            ← Voltar
          </button>
        </nav>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{
            background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
            boxShadow: '0 4px 24px rgba(15,45,82,0.08)',
            padding: '48px 40px', textAlign: 'center', maxWidth: 460,
            animation: 'fadeIn 0.35s ease',
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{icone}</div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 900, fontSize: 24, color: '#0f2d52', marginBottom: 8 }}>
              {titulo}
            </h1>
            {acaoInfo && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#f0f7ff', border: '1px solid #bfdbfe',
                borderRadius: 8, padding: '6px 14px',
                fontSize: 13, fontWeight: 600, color: '#1d6fb8', marginBottom: 16,
              }}>
                {acaoInfo.icon} {acaoInfo.label}
              </div>
            )}
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              {acaoInfo ? acaoInfo.desc : 'Este módulo está em desenvolvimento e estará disponível em breve.'}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fef9c3', border: '1px solid #fde047',
              borderRadius: 8, padding: '8px 16px',
              fontSize: 12, color: '#713f12',
            }}>
              🚧 Em desenvolvimento — funcionalidade disponível em breve
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
