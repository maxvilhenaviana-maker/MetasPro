// src/pages/Login.jsx
// Tela de Login — MetasPro
// Após autenticação, verifica empresas vinculadas:
//   - 1 empresa  → seleciona automaticamente e vai para /inicial
//   - N empresas → abre ModalSelecionarEmpresa antes de avançar
//   - 0 empresas → redireciona para /onboarding

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { T, globalCSS } from '../theme';
import { useSession } from '../contexts/SessionContext';
import ModalSelecionarEmpresa from '../components/ModalSelecionarEmpresa';

export default function Login() {
  const [isRegistering, setIsRegistering]     = useState(false);
  const [formData, setFormData]               = useState({ name: '', email: '', password: '' });
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [modalEmpresas, setModalEmpresas]     = useState(false);
  const [selecionandoEmp, setSelecionandoEmp] = useState(false);

  const navigate = useNavigate();
  const { inicializarSessao, empresasDisponiveis, selecionarEmpresa } = useSession();

  // ── Fluxo pós-autenticação ──────────────────────────────────────────────────
  // inicializarSessao() já faz a limpeza interna da sessão anterior.
  const posAutenticacao = async () => {
    const resultado = await inicializarSessao();

    if (resultado.precisaOnboarding) {
      navigate('/onboarding');
      return;
    }

    if (resultado.precisaEscolherEmpresa) {
      setModalEmpresas(true);
      return;
    }

    navigate('/inicial');
  };

  // ── Login / Registro email+senha ────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const payload  = isRegistering
        ? { nome: formData.name, email: formData.email, senha: formData.password }
        : { email: formData.email, senha: formData.password };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('auth_tokens', JSON.stringify(data));
      await posAutenticacao();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  // ── Login Google ────────────────────────────────────────────────────────────
  const onSuccessGoogle = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential });
      localStorage.setItem('auth_tokens', JSON.stringify(data));
      await posAutenticacao();
    } catch {
      setError('Erro ao autenticar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Usuário escolheu empresa no modal ───────────────────────────────────────
  const handleEscolherEmpresa = async (emp) => {
    setSelecionandoEmp(true);
    try {
      await selecionarEmpresa(emp);
      setModalEmpresas(false);
      navigate('/inicial');
    } finally {
      setSelecionandoEmp(false);
    }
  };

  return (
    <>
      <style>{globalCSS}</style>

      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: T.fontBody,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Logomarca */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img
              src="/Logo_MetasPro.jpg"
              alt="MetasPro"
              style={{ height: 80, width: 'auto', borderRadius: 12, marginBottom: 12 }}
              onError={e => e.target.style.display = 'none'}
            />
            <h1 style={{
              fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 32,
              color: T.navy, letterSpacing: '-0.02em', margin: 0, lineHeight: 1,
            }}>
              Metas<span style={{ color: T.green }}>Pro</span>
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: T.textDim }}>
              Criando Metas · Gerenciando Resultados
            </p>
          </div>

          {/* Card principal */}
          <div style={{
            background: T.surface,
            borderRadius: T.radiusXl,
            border: `1px solid ${T.border}`,
            boxShadow: T.shadowMd,
            padding: '32px 32px',
            animation: 'fadeIn 0.4s ease',
          }}>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 4, marginBottom: 24,
              background: T.bgAlt, borderRadius: T.radius, padding: 4,
            }}>
              {[
                { label: 'Entrar',    value: false },
                { label: 'Registrar', value: true  },
              ].map(tab => (
                <button
                  key={tab.label}
                  onClick={() => { setIsRegistering(tab.value); setError(''); }}
                  style={{
                    flex: 1, padding: '9px 0',
                    background: isRegistering === tab.value ? T.navy : 'transparent',
                    color: isRegistering === tab.value ? '#fff' : T.textMd,
                    border: 'none', borderRadius: T.radiusSm,
                    fontSize: 14, fontWeight: 600,
                    fontFamily: T.fontDisplay, cursor: 'pointer',
                    transition: T.transition,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Formulário */}
            <form onSubmit={handleAuth}>
              {isRegistering && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Nome completo</label>
                  <input
                    type="text" placeholder="Seu nome"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = T.borderFocus}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email" placeholder="seu@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = T.borderFocus}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Senha</label>
                <input
                  type="password" placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = T.borderFocus}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              {error && (
                <div style={{
                  background: T.redDim, border: `1px solid ${T.redLight}33`,
                  borderRadius: T.radiusSm, padding: '10px 14px',
                  color: T.red, fontSize: 13, marginBottom: 16,
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: loading ? T.navyDim : `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`,
                  border: 'none', borderRadius: T.radius,
                  color: loading ? T.textDim : '#fff',
                  fontSize: 15, fontWeight: 700, fontFamily: T.fontDisplay,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: T.transition,
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(15,45,82,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading && <Spinner />}
                {loading ? 'Aguarde...' : isRegistering ? 'Criar Conta' : 'Entrar'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontSize: 12, color: T.textDim }}>ou</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <GoogleLogin
                onSuccess={onSuccessGoogle}
                onError={() => setError('Erro ao autenticar com Google.')}
                theme="outline" shape="rectangular" size="large"
                text={isRegistering ? 'signup_with' : 'signin_with'}
              />
            </div>

            <button
              onClick={() => navigate('/sandbox')}
              style={{
                width: '100%', padding: '11px',
                background: T.bgAlt, border: `1.5px solid ${T.border}`,
                borderRadius: T.radius, color: T.textMd,
                fontSize: 13, fontWeight: 600, fontFamily: T.fontBody,
                cursor: 'pointer', transition: T.transition,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.navy; e.currentTarget.style.color = T.navy; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMd; }}
            >
              🧪 Testar Sandbox (sem login)
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: T.textDim, marginTop: 20 }}>
            MetasPro © {new Date().getFullYear()} · Todos os direitos reservados
          </p>
        </div>
      </div>

      {modalEmpresas && (
        <ModalSelecionarEmpresa
          empresas={empresasDisponiveis}
          onSelecionar={handleEscolherEmpresa}
          carregando={selecionandoEmp}
        />
      )}
    </>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 16, height: 16,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    }} />
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#475569', marginBottom: 5,
  fontFamily: "'DM Sans', sans-serif",
};

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#f8fafc', border: '1.5px solid #e2e8f0',
  borderRadius: '8px', color: '#0f2d52', fontSize: 14,
  outline: 'none', transition: 'border-color 0.2s',
  fontFamily: "'DM Sans', sans-serif",
};
