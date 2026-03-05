// src/pages/Onboarding.jsx
// Fluxo de onboarding pós-login: Empresa → Unidade → Conclusão
// Design: corporativo refinado, azul-marinho profundo + verde MetasPro

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────
const IconBuilding = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3.75 21h16.5M4.5 3h15l.75 3.75v13.5H3.75V6.75L4.5 3zM9 21V9h6v12M9 9h6M9 13.5h6M9 18h6" />
  </svg>
);
const IconFactory = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3.75 21h16.5M4.5 21V9.75L9 6v3.75L13.5 6v3.75L18 6v15M9 21v-4.5h6V21" />
  </svg>
);
const IconCheck = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const IconTarget = () => (
  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
  </svg>
);

// ─── Formatação de CNPJ ───────────────────────────────────────────────────────
function formatCNPJ(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function validateCNPJ(cnpj) {
  const digits = cnpj.replace(/\D/g, '');
  return digits.length === 14;
}

// ─── Indicador de progresso ───────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Empresa' },
    { n: 2, label: 'Unidade' },
    { n: 3, label: 'Pronto' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15,
              background: current > s.n ? '#22c55e' : current === s.n ? '#1d4ed8' : 'transparent',
              border: current > s.n ? '2px solid #22c55e' : current === s.n ? '2px solid #1d4ed8' : '2px solid #334155',
              color: current >= s.n ? '#fff' : '#64748b',
              transition: 'all 0.3s ease',
            }}>
              {current > s.n ? <IconCheck /> : s.n}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
              color: current >= s.n ? '#e2e8f0' : '#475569',
              textTransform: 'uppercase',
            }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 80, height: 2, marginBottom: 22,
              background: current > s.n + 0 ? '#22c55e' : '#1e293b',
              transition: 'background 0.3s ease',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── STEP 1: Dados da Empresa ─────────────────────────────────────────────────
function StepEmpresa({ onNext }) {
  const [form, setForm] = useState({ cnpj: '', razao_social: '', nome_fantasia: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCNPJ = (e) => {
    setForm({ ...form, cnpj: formatCNPJ(e.target.value) });
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateCNPJ(form.cnpj)) return setError('CNPJ inválido. Verifique e tente novamente.');
    if (!form.razao_social.trim()) return setError('Razão Social é obrigatória.');

    setLoading(true);
    try {
      const { data } = await api.post('/onboarding/empresa', {
        cnpj: form.cnpj,
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia.trim() || form.razao_social.trim(),
      });
      onNext(data.empresa);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#93c5fd', boxShadow: '0 4px 20px rgba(29,78,216,0.4)',
        }}>
          <IconBuilding />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Sora', sans-serif" }}>
            Dados da Empresa
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Informe os dados da organização que será gerenciada
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field
          label="CNPJ *"
          value={form.cnpj}
          onChange={handleCNPJ}
          placeholder="00.000.000/0000-00"
          maxLength={18}
        />
        <Field
          label="Razão Social *"
          value={form.razao_social}
          onChange={e => setForm({ ...form, razao_social: e.target.value })}
          placeholder="Nome jurídico completo da empresa"
        />
        <Field
          label="Nome Fantasia"
          value={form.nome_fantasia}
          onChange={e => setForm({ ...form, nome_fantasia: e.target.value })}
          placeholder="Como a empresa é conhecida (opcional)"
        />
      </div>

      {error && <ErrorBox msg={error} />}

      <button onClick={handleSubmit} disabled={loading} style={btnPrimary(loading)}>
        {loading ? 'Salvando...' : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Continuar <IconArrow />
          </span>
        )}
      </button>
    </div>
  );
}

// ─── STEP 2: Dados da Unidade ─────────────────────────────────────────────────
function StepUnidade({ empresa, onNext }) {
  const [form, setForm] = useState({ nome_unidade: '', codigo_unidade: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.nome_unidade.trim()) return setError('Nome da unidade é obrigatório.');

    setLoading(true);
    try {
      const { data } = await api.post('/onboarding/unidade', {
        empresa_id: empresa.id,
        nome_unidade: form.nome_unidade.trim(),
        codigo_unidade: form.codigo_unidade.trim() || null,
      });
      onNext(data.unidade);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar unidade. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #065f46, #047857)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#6ee7b7', boxShadow: '0 4px 20px rgba(6,95,70,0.4)',
        }}>
          <IconFactory />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Sora', sans-serif" }}>
            Unidade Monitorada
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Defina a primeira unidade da <strong style={{ color: '#94a3b8' }}>
              {empresa.nome_fantasia || empresa.razao_social}
            </strong>
          </p>
        </div>
      </div>

      {/* Info card da empresa */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', border: '1px solid #1e3a5f',
        borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#22c55e', flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          Empresa cadastrada: <strong style={{ color: '#e2e8f0' }}>
            {empresa.nome_fantasia || empresa.razao_social}
          </strong>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field
          label="Nome da Unidade *"
          value={form.nome_unidade}
          onChange={e => setForm({ ...form, nome_unidade: e.target.value })}
          placeholder="Ex: Filial São Paulo, Loja Centro, Fábrica Norte"
        />
        <Field
          label="Código da Unidade"
          value={form.codigo_unidade}
          onChange={e => setForm({ ...form, codigo_unidade: e.target.value })}
          placeholder="Ex: SP-01, LOJA-03 (opcional)"
        />
      </div>

      <div style={{
        background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)',
        borderRadius: 10, padding: '10px 14px', marginTop: 16,
      }}>
        <p style={{ margin: 0, fontSize: 12, color: '#93c5fd', lineHeight: 1.5 }}>
          💡 Você poderá adicionar mais unidades depois. Comece pela principal.
        </p>
      </div>

      {error && <ErrorBox msg={error} />}

      <button onClick={handleSubmit} disabled={loading} style={btnPrimary(loading)}>
        {loading ? 'Salvando...' : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Finalizar Configuração <IconArrow />
          </span>
        )}
      </button>
    </div>
  );
}

// ─── STEP 3: Conclusão ────────────────────────────────────────────────────────
function StepConclusao({ empresa, unidade }) {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Animação de sucesso */}
      <div style={{
        width: 90, height: 90, borderRadius: '50%', margin: '0 auto 24px',
        background: 'linear-gradient(135deg, #065f46, #16a34a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 12px rgba(22,163,74,0.12), 0 0 0 24px rgba(22,163,74,0.06)',
        animation: 'pulse-success 2s infinite',
        color: '#fff',
      }}>
        <IconCheck />
      </div>

      <h2 style={{
        fontSize: 26, fontWeight: 900, color: '#f1f5f9', margin: '0 0 8px',
        fontFamily: "'Sora', sans-serif",
      }}>
        Tudo configurado!
      </h2>
      <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
        Sua empresa e unidade estão prontas.<br />
        Agora você pode criar sua primeira meta.
      </p>

      {/* Resumo */}
      <div style={{
        background: 'rgba(15,23,42,0.8)', border: '1px solid #1e293b',
        borderRadius: 14, padding: 20, marginBottom: 28, textAlign: 'left',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Resumo do cadastro
        </p>
        <SummaryRow label="Empresa" value={empresa.nome_fantasia || empresa.razao_social} />
        <SummaryRow label="CNPJ" value={empresa.cnpj} />
        <SummaryRow label="Unidade" value={unidade.nome_unidade} last />
      </div>

      <button
        onClick={() => navigate('/dashboard')}
        style={btnPrimary(false)}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IconTarget />
          Criar minha primeira meta
        </span>
      </button>

      <button
        onClick={() => navigate('/dashboard')}
        style={{
          width: '100%', padding: '13px', marginTop: 10,
          background: 'transparent', border: '1px solid #1e293b',
          borderRadius: 12, color: '#64748b', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseOver={e => e.target.style.borderColor = '#334155'}
        onMouseOut={e => e.target.style.borderColor = '#1e293b'}
      >
        Ir para o Dashboard
      </button>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '13px 16px', boxSizing: 'border-box',
          background: focused ? 'rgba(29,78,216,0.06)' : 'rgba(15,23,42,0.6)',
          border: focused ? '1.5px solid #1d4ed8' : '1.5px solid #1e293b',
          borderRadius: 10, color: '#e2e8f0', fontSize: 14,
          outline: 'none', transition: 'all 0.2s',
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 10, padding: '10px 14px', marginTop: 14,
      color: '#fca5a5', fontSize: 13,
    }}>
      ⚠️ {msg}
    </div>
  );
}

function SummaryRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid #0f172a',
    }}>
      <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{value}</span>
    </div>
  );
}

function btnPrimary(loading) {
  return {
    width: '100%', padding: '14px', marginTop: 24,
    background: loading ? '#1e3a5f' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
    border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.2s',
    boxShadow: loading ? 'none' : '0 4px 20px rgba(29,78,216,0.35)',
    fontFamily: "'Sora', sans-serif",
  };
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState(null);
  const [unidade, setUnidade] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes pulse-success {
          0%, 100% { box-shadow: 0 0 0 12px rgba(22,163,74,0.12), 0 0 0 24px rgba(22,163,74,0.06); }
          50% { box-shadow: 0 0 0 16px rgba(22,163,74,0.18), 0 0 0 32px rgba(22,163,74,0.08); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        input::placeholder { color: #334155; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #0f172a inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 20% 20%, rgba(29,78,216,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(6,95,70,0.10) 0%, transparent 50%), #020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{
              margin: '0 0 4px', fontSize: 28, fontWeight: 900,
              fontFamily: "'Sora', sans-serif", color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}>
              Metas<span style={{ color: '#3b82f6' }}>Pro</span>
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
              Configure seu ambiente em 2 passos
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator current={step} />

          {/* Card */}
          <div style={{
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid #1e293b',
            borderRadius: 20,
            padding: '32px 36px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            animation: 'fadeSlideIn 0.4s ease forwards',
          }}>
            {step === 1 && (
              <StepEmpresa onNext={(emp) => { setEmpresa(emp); setStep(2); }} />
            )}
            {step === 2 && (
              <StepUnidade empresa={empresa} onNext={(uni) => { setUnidade(uni); setStep(3); }} />
            )}
            {step === 3 && (
              <StepConclusao empresa={empresa} unidade={unidade} />
            )}
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#1e293b', marginTop: 20 }}>
            MetasPro © {new Date().getFullYear()} · Criando Metas · Gerenciando Resultados
          </p>
        </div>
      </div>
    </>
  );
}
