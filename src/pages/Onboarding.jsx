// src/pages/Onboarding.jsx
// Fluxo de onboarding pós-login: Empresa → Unidade → Conclusão
// Design: LIGHT — fundo branco, azul marinho + verde MetasPro
// ATUALIZADO: identidade visual padronizada

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { T, globalCSS } from '../theme';

// ─── Formatação de CNPJ ───────────────────────────────────────────────────────
function formatCNPJ(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// ─── Indicador de Etapas ──────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Empresa'   },
    { n: 2, label: 'Unidade'   },
    { n: 3, label: 'Concluído' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: current >= s.n
                ? current === s.n
                  ? `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`
                  : T.green
                : T.bgAlt,
              border: `2px solid ${current >= s.n ? 'transparent' : T.border}`,
              color: current >= s.n ? '#fff' : T.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, fontFamily: T.fontDisplay,
              transition: T.transition,
            }}>
              {current > s.n ? '✓' : s.n}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: T.fontBody,
              color: current >= s.n ? T.navy : T.textDim,
              transition: T.transition,
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 6px 16px',
              background: current > s.n
                ? `linear-gradient(90deg, ${T.green}, ${T.green})`
                : T.border,
              transition: T.transition,
              maxWidth: 60,
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Campo de Input ───────────────────────────────────────────────────────────
function Campo({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: T.textMd, marginBottom: 5, fontFamily: T.fontBody,
      }}>
        {label}
      </label>
      <input
        style={{
          width: '100%', padding: '10px 14px',
          background: T.bgAlt,
          border: `1.5px solid ${T.border}`,
          borderRadius: T.radiusSm,
          color: T.text, fontSize: 14, outline: 'none',
          transition: 'border-color 0.2s',
          fontFamily: T.fontBody,
        }}
        onFocus={e => e.target.style.borderColor = T.borderFocus}
        onBlur={e => e.target.style.borderColor = T.border}
        {...props}
      />
    </div>
  );
}

// ─── Mensagem de Erro ─────────────────────────────────────────────────────────
function MsgErro({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: T.redDim, border: `1px solid ${T.red}33`,
      borderRadius: T.radiusSm, padding: '10px 14px',
      color: T.red, fontSize: 13, marginTop: 12,
    }}>
      ⚠️ {msg}
    </div>
  );
}

// ─── Etapa 1: Empresa ─────────────────────────────────────────────────────────
function StepEmpresa({ onNext }) {
  const [form, setForm] = useState({ razao_social: '', nome_fantasia: '', cnpj: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErro('');
    try {
      const { data } = await api.post('/onboarding/empresa', {
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia.trim(),
        cnpj: form.cnpj.replace(/\D/g, ''),
      });
      onNext(data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
        <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 18, color: T.navy, margin: 0 }}>
          Dados da Empresa
        </h2>
        <p style={{ fontSize: 13, color: T.textDim, margin: '4px 0 0', fontFamily: T.fontBody }}>
          Cadastre a empresa que será monitorada
        </p>
      </div>

      <Campo
        label="Razão Social *"
        placeholder="Nome jurídico da empresa"
        value={form.razao_social}
        onChange={e => setForm({ ...form, razao_social: e.target.value })}
        required
      />
      <Campo
        label="Nome Fantasia"
        placeholder="Como a empresa é conhecida"
        value={form.nome_fantasia}
        onChange={e => setForm({ ...form, nome_fantasia: e.target.value })}
      />
      <Campo
        label="CNPJ *"
        placeholder="00.000.000/0000-00"
        value={form.cnpj}
        onChange={e => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })}
        maxLength={18}
        required
      />

      <MsgErro msg={erro} />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', marginTop: 20, padding: '13px',
          background: loading ? T.bgAlt : `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`,
          border: 'none', borderRadius: T.radius,
          color: loading ? T.textDim : '#fff',
          fontSize: 15, fontWeight: 700,
          fontFamily: T.fontDisplay, cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 16px rgba(15,45,82,0.25)',
          transition: T.transition,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />}
        {loading ? 'Salvando...' : 'Continuar →'}
      </button>
    </form>
  );
}

// ─── Etapa 2: Unidade ─────────────────────────────────────────────────────────
function StepUnidade({ empresa, onNext }) {
  const [form, setForm] = useState({ nome_unidade: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErro('');
    try {
      const { data } = await api.post('/onboarding/unidade', {
        empresa_id: empresa.id,
        nome_unidade: form.nome_unidade.trim(),
      });
      onNext(data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar unidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
        <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 18, color: T.navy, margin: 0 }}>
          Unidade de Monitoramento
        </h2>
        <p style={{ fontSize: 13, color: T.textDim, margin: '4px 0 0', fontFamily: T.fontBody }}>
          Empresa: <strong>{empresa.nome_fantasia || empresa.razao_social}</strong>
        </p>
      </div>

      <Campo
        label="Nome da Unidade *"
        placeholder="Ex: Filial Centro, Setor Vendas, Unidade SP..."
        value={form.nome_unidade}
        onChange={e => setForm({ ...form, nome_unidade: e.target.value })}
        required
      />

      <div style={{
        background: T.blueDim, border: `1px solid ${T.blueLight}44`,
        borderRadius: T.radiusSm, padding: '10px 14px',
        fontSize: 12, color: T.blue, fontFamily: T.fontBody, lineHeight: 1.5,
      }}>
        💡 A unidade representa o setor, filial ou área onde as metas serão monitoradas. Você poderá criar mais unidades depois.
      </div>

      <MsgErro msg={erro} />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', marginTop: 20, padding: '13px',
          background: loading ? T.bgAlt : `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`,
          border: 'none', borderRadius: T.radius,
          color: loading ? T.textDim : '#fff',
          fontSize: 15, fontWeight: 700,
          fontFamily: T.fontDisplay, cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 16px rgba(15,45,82,0.25)',
          transition: T.transition,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />}
        {loading ? 'Salvando...' : 'Concluir →'}
      </button>
    </form>
  );
}

// ─── Etapa 3: Conclusão ───────────────────────────────────────────────────────
function StepConclusao({ empresa, unidade }) {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        boxShadow: `0 8px 24px ${T.greenDim}`,
        fontSize: 32,
      }}>
        ✓
      </div>

      <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 20, color: T.navy, marginBottom: 8 }}>
        Configuração Concluída!
      </h2>
      <p style={{ fontSize: 13, color: T.textMd, lineHeight: 1.6, marginBottom: 24, fontFamily: T.fontBody }}>
        <strong>{empresa?.nome_fantasia || empresa?.razao_social}</strong> foi cadastrada com a unidade{' '}
        <strong>{unidade?.nome_unidade}</strong>. Você já pode criar suas primeiras metas.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => navigate('/nova-meta')}
          style={{
            padding: '13px',
            background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
            border: 'none', borderRadius: T.radius,
            color: '#fff', fontSize: 15, fontWeight: 700,
            fontFamily: T.fontDisplay, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
          }}
        >
          🎯 Criar Primeira Meta
        </button>
        <button
          onClick={() => navigate('/inicial')}
          style={{
            padding: '11px',
            background: T.bgAlt,
            border: `1.5px solid ${T.border}`,
            borderRadius: T.radius,
            color: T.textMd, fontSize: 14, fontWeight: 600,
            fontFamily: T.fontBody, cursor: 'pointer',
          }}
        >
          🏠 Ir para Página Inicial
        </button>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Onboarding() {
  const [step, setStep]       = useState(1);
  const [empresa, setEmpresa] = useState(null);
  const [unidade, setUnidade] = useState(null);

  return (
    <>
      <style>{globalCSS}</style>

      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', fontFamily: T.fontBody,
      }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img
              src="/Logo_MetasPro.jpg" alt="MetasPro"
              style={{ height: 60, width: 'auto', borderRadius: 10, marginBottom: 10 }}
              onError={e => e.target.style.display = 'none'}
            />
            <h1 style={{
              fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 26,
              color: T.navy, margin: 0, letterSpacing: '-0.02em',
            }}>
              Metas<span style={{ color: T.green }}>Pro</span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: T.textDim }}>
              Configure seu ambiente em 2 passos
            </p>
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* Card */}
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusXl,
            padding: '32px 28px',
            boxShadow: T.shadowMd,
            animation: 'fadeIn 0.35s ease',
          }}>
            {step === 1 && <StepEmpresa onNext={(emp) => { setEmpresa(emp); setStep(2); }} />}
            {step === 2 && <StepUnidade empresa={empresa} onNext={(uni) => { setUnidade(uni); setStep(3); }} />}
            {step === 3 && <StepConclusao empresa={empresa} unidade={unidade} />}
          </div>

          {/* Rodapé */}
          <p style={{ textAlign: 'center', fontSize: 11, color: T.textDim, marginTop: 20 }}>
            MetasPro © {new Date().getFullYear()} · Criando Metas · Gerenciando Resultados
          </p>
        </div>
      </div>
    </>
  );
}
