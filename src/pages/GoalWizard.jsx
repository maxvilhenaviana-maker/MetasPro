// src/pages/GoalWizard.jsx
// Wizard de Configuração de Meta — 6 etapas
// Design: LIGHT — fundo branco, azul marinho + verde MetasPro
// ATUALIZADO: identidade visual padronizada. Lógica de cálculo preservada.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { T, globalCSS } from '../theme';
import NavbarMetasPro from '../components/NavbarMetasPro';

// ─── Constantes ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Identificação', short: 'ID'   },
  { id: 2, label: 'Direção',       short: 'DIR'  },
  { id: 3, label: 'Periodicidade', short: 'PER'  },
  { id: 4, label: 'Pressão',       short: 'PRES' },
  { id: 5, label: 'Histórico',     short: 'HIST' },
  { id: 6, label: 'Revisão',       short: 'REV'  },
];

const PERIODICIDADES = [
  { value: 'SEMANAL',       label: 'Semanal',       desc: 'A cada 7 dias'        },
  { value: 'QUINZENAL',     label: 'Quinzenal',     desc: 'A cada 15 dias'       },
  { value: 'MENSAL',        label: 'Mensal',        desc: 'Uma vez por mês'      },
  { value: 'BIMESTRAL',     label: 'Bimestral',     desc: 'A cada 2 meses'       },
  { value: 'TRIMESTRAL',    label: 'Trimestral',    desc: 'A cada 3 meses'       },
  { value: 'SEMESTRAL',     label: 'Semestral',     desc: 'A cada 6 meses'       },
  { value: 'ANUAL',         label: 'Anual',         desc: 'Uma vez por ano'      },
  { value: 'PERSONALIZADA', label: 'Personalizada', desc: 'Defina o intervalo'   },
];

const PRESSOES = [
  { value: 'MODERADO',      pct: 0.25, label: 'Moderado',      tag: '25%', color: T.green,  dim: T.greenDim  },
  { value: 'INTERMEDIARIO', pct: 0.50, label: 'Intermediário', tag: '50%', color: T.blue,   dim: T.blueDim   },
  { value: 'DESAFIADOR',    pct: 0.75, label: 'Desafiador',    tag: '75%', color: T.amber,  dim: T.amberDim  },
  { value: 'ALAVANCADO',    pct: 1.00, label: 'Alavancado',    tag: '100%',color: T.red,    dim: T.redDim    },
];

const INITIAL = {
  unidade_id: '', nome_meta: '', objetivo_descritivo: '',
  direcao: '', periodicidade: '', nivel_pressao: '', historico: '',
  peso: '',
};

// ─── Indicador de Etapas ──────────────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: T.surface, borderBottom: `1px solid ${T.border}`,
      padding: '12px 20px', overflowX: 'auto', gap: 0,
    }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: current === s.id
                ? `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`
                : current > s.id ? T.green : T.bgAlt,
              color: current >= s.id ? '#fff' : T.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, fontFamily: T.fontDisplay,
              border: `2px solid ${current >= s.id ? 'transparent' : T.border}`,
              transition: T.transition, flexShrink: 0,
            }}>
              {current > s.id ? '✓' : s.id}
            </div>
            <span style={{
              fontSize: 12, fontWeight: current === s.id ? 700 : 500,
              color: current === s.id ? T.navy : current > s.id ? T.green : T.textDim,
              fontFamily: T.fontDisplay,
              display: window.innerWidth < 500 ? 'none' : 'inline',
            }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, minWidth: 16, maxWidth: 40, margin: '0 4px',
              background: current > s.id ? T.green : T.border,
              transition: T.transition,
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Card de opção selecionável ───────────────────────────────────────────────
function OptionCard({ label, desc, selected, onClick, color, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '14px 16px',
        background: selected ? (color ? color + '14' : T.navyDim) : T.bgAlt,
        border: `2px solid ${selected ? (color || T.navy) : T.border}`,
        borderRadius: T.radius, cursor: 'pointer',
        transition: T.transition,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = T.borderHi; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = T.border; }}
    >
      <div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 14, color: selected ? (color || T.navy) : T.text }}>
          {label}
        </div>
        {desc && <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.fontBody, marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {badge && (
          <span style={{
            padding: '2px 8px', borderRadius: 999,
            background: selected ? (color || T.navy) : T.border,
            color: selected ? '#fff' : T.textDim,
            fontSize: 11, fontWeight: 700, fontFamily: T.fontDisplay,
          }}>
            {badge}
          </span>
        )}
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: `2px solid ${selected ? (color || T.navy) : T.borderHi}`,
          background: selected ? (color || T.navy) : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
        </div>
      </div>
    </button>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function GoalWizard() {
  const navigate     = useNavigate();
  const topRef       = useRef(null);
  const [searchParams] = useSearchParams();
  const editId       = searchParams.get('edit');

  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState(INITIAL);
  const [unidades, setUnidades]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState(null);
  const [empresa, setEmpresa]     = useState(null);
  const [isEdit, setIsEdit]       = useState(false);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Carrega empresa, unidades e meta em edição
  useEffect(() => {
    const init = async () => {
      try {
        const statusRes = await api.get('/onboarding/status').catch(() => ({ data: {} }));
        if (statusRes.data?.empresa) {
          setEmpresa(statusRes.data.empresa);
          const unidsRes = await api.get(`/metas/unidades/${statusRes.data.empresa.id}`);
          setUnidades(unidsRes.data || []);
        }
        if (editId) {
          const metaRes = await api.get(`/metas/${editId}`);
          const m = metaRes.data;
          setForm({
            unidade_id:           m.unidade_id        || '',
            nome_meta:            m.nome_meta         || '',
            objetivo_descritivo:  m.objetivo_descritivo || '',
            direcao:              m.direcao           || '',
            periodicidade:        m.periodicidade     || '',
            nivel_pressao:        m.nivel_pressao ? String(m.nivel_pressao) : '',
            historico:            (m.historico || []).join(', '),
            peso:                 m.peso != null ? String(m.peso) : '',
          });
          setIsEdit(true);
        }
      } catch (err) {
        if (err.response?.status === 401) { localStorage.removeItem('auth_tokens'); navigate('/login'); }
      } finally {
        setLoadingEdit(false);
      }
    };
    init();
  }, [editId, navigate]);

  // Validação por etapa
  const canProceed = () => {
    if (step === 1) return form.unidade_id && form.nome_meta.trim();
    if (step === 2) return form.direcao;
    if (step === 3) return form.periodicidade;
    if (step === 4) return form.nivel_pressao;
    if (step === 5) {
      const nums = form.historico.split(/[\s,;]+/).filter(v => v !== '').map(Number);
      return nums.length >= 3 && nums.every(n => !isNaN(n));
    }
    return true;
  };

  const next = () => { if (canProceed() && step < 6) { setStep(s => s + 1); scrollTop(); } };
  const prev = () => { if (step > 1) { setStep(s => s - 1); scrollTop(); } };

  const pressaoMap = { MODERADO: 0.25, INTERMEDIARIO: 0.50, DESAFIADOR: 0.75, ALAVANCADO: 1.00 };

  const handleCalcular = async () => {
    setLoading(true); setError('');
    try {
      const historico = form.historico.split(/[\s,;]+/).filter(v => v !== '').map(Number);
      const { data } = await api.post('/metas/calcular', {
        unidade_id:          form.unidade_id,
        nome_meta:           form.nome_meta.trim(),
        objetivo_descritivo: form.objetivo_descritivo.trim(),
        direcao:             form.direcao,
        periodicidade:       form.periodicidade,
        nivel_pressao:       pressaoMap[form.nivel_pressao],
        historico,
        peso:                form.peso !== '' ? Number(form.peso) : null,
        editId: editId || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => { setResult(null); setStep(1); setIsEdit(true); scrollTop(); };
  const handleNew  = () => { setForm(INITIAL); setStep(1); setResult(null); setError(''); setIsEdit(false); };

  if (loadingEdit) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontBody }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${T.border}`, borderTopColor: T.navy, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: T.textDim, fontSize: 13 }}>Carregando meta...</p>
        </div>
      </div>
    );
  }

  // ── Tela de Resultado ──────────────────────────────────────────────────────
  if (result) {
    const pressaoLabel = PRESSOES.find(p => p.value === form.nivel_pressao)?.label || form.nivel_pressao;
    return (
      <>
        <style>{globalCSS}</style>
        <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontBody }}>
          <NavbarMetasPro empresa={empresa} />
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>

            {/* Resultado */}
            <div style={{
              background: T.surface, borderRadius: T.radiusXl,
              border: `2px solid ${T.green}`,
              boxShadow: `0 8px 32px ${T.greenDim}`,
              padding: '32px 28px', textAlign: 'center', marginBottom: 20,
              animation: 'fadeIn 0.4s ease',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 16px',
                boxShadow: `0 8px 24px ${T.greenDim}`,
              }}>
                🎯
              </div>
              <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 22, color: T.navy, marginBottom: 4 }}>
                Meta Calculada!
              </h2>
              <p style={{ fontSize: 13, color: T.textDim, marginBottom: 24, fontFamily: T.fontBody }}>
                {isEdit ? 'Meta recalculada com sucesso' : 'Meta criada com sucesso'}
              </p>

              {/* Meta final em destaque */}
              <div style={{
                background: `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`,
                borderRadius: T.radiusLg, padding: '20px',
                marginBottom: 20, color: '#fff',
              }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontFamily: T.fontBody, marginBottom: 4 }}>META OFICIAL</div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 40 }}>
                  {Number(result.metaFinal).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Detalhes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Média Histórica',    value: Number(result.mediaCalculada).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) },
                  { label: 'Intervalo M',         value: Number(result.intervaloM).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) },
                  { label: 'Nível de Pressão',    value: pressaoLabel },
                  { label: 'Direção',             value: result.direcao || form.direcao },
                ].map(item => (
                  <div key={item.label} style={{
                    background: T.bgAlt, borderRadius: T.radiusSm,
                    padding: '12px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontBody, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, fontFamily: T.fontDisplay }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Justificativas IA */}
              {result.justificativaMeta && (
                <div style={{
                  background: T.blueDim, border: `1px solid ${T.blueLight}44`,
                  borderRadius: T.radiusSm, padding: '12px 14px',
                  fontSize: 13, color: T.navy, textAlign: 'left',
                  fontFamily: T.fontBody, lineHeight: 1.6, marginBottom: 16,
                }}>
                  <strong>💡 IA:</strong> {result.justificativaMeta}
                </div>
              )}

              {result.outliersExcluidos?.length > 0 && (
                <div style={{
                  background: T.amberDim, border: `1px solid ${T.amber}44`,
                  borderRadius: T.radiusSm, padding: '10px 14px',
                  fontSize: 12, color: T.amber, textAlign: 'left',
                  fontFamily: T.fontBody, marginBottom: 16,
                }}>
                  ⚠️ Outliers removidos: {result.outliersExcluidos.join(', ')}
                </div>
              )}
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  flex: 1, padding: '12px',
                  background: `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`,
                  border: 'none', borderRadius: T.radius,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  fontFamily: T.fontDisplay, cursor: 'pointer',
                }}
              >
                📊 Ver Dashboard
              </button>
              <button
                onClick={handleEdit}
                style={{
                  flex: 1, padding: '12px',
                  background: T.bgAlt, border: `1.5px solid ${T.border}`,
                  borderRadius: T.radius,
                  color: T.textMd, fontSize: 14, fontWeight: 600,
                  fontFamily: T.fontBody, cursor: 'pointer',
                }}
              >
                ✏️ Ajustar e Recalcular
              </button>
              <button
                onClick={handleNew}
                style={{
                  flex: 1, padding: '12px',
                  background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
                  border: 'none', borderRadius: T.radius,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  fontFamily: T.fontDisplay, cursor: 'pointer',
                }}
              >
                🎯 Nova Meta
              </button>
            </div>

            {/* Compartilhar WhatsApp */}
            {result.metaFinal && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`🎯 *Meta MetasPro*\n\n*${form.nome_meta}*\n\nMeta: ${Number(result.metaFinal).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}\nMédia: ${Number(result.mediaCalculada).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}\nPressão: ${pressaoLabel}\n\nGerado pelo MetasPro`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 12, padding: '11px',
                  background: T.whatsappDim, border: `1.5px solid ${T.whatsapp}44`,
                  borderRadius: T.radius,
                  color: T.whatsapp, fontSize: 14, fontWeight: 600,
                  fontFamily: T.fontBody, textDecoration: 'none',
                  transition: T.transition,
                }}
              >
                📱 Compartilhar pelo WhatsApp
              </a>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalCSS}</style>
      <div ref={topRef} style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontBody, display: 'flex', flexDirection: 'column' }}>

        <NavbarMetasPro empresa={empresa} />
        <StepBar current={step} />

        <div style={{ flex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: '28px 20px' }}>
          <div style={{
            background: T.surface, borderRadius: T.radiusXl,
            border: `1px solid ${T.border}`, boxShadow: T.shadowMd,
            padding: '28px 28px', animation: 'fadeIn 0.3s ease',
          }}>

            {/* Título da etapa */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 20, color: T.navy, margin: 0 }}>
                {STEPS[step - 1].label}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: T.textDim, fontFamily: T.fontBody }}>
                Etapa {step} de {STEPS.length}
              </p>
            </div>

            {/* ── ETAPA 1: Identificação ───────────────────────────────────── */}
            {step === 1 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Unidade de Monitoramento *</label>
                  <select
                    value={form.unidade_id}
                    onChange={e => setForm({ ...form, unidade_id: e.target.value })}
                    style={inputSt}
                    onFocus={e => e.target.style.borderColor = T.borderFocus}
                    onBlur={e => e.target.style.borderColor = T.border}
                  >
                    <option value="">Selecione a unidade</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nome_unidade}</option>
                    ))}
                  </select>
                  {unidades.length === 0 && (
                    <p style={{ fontSize: 12, color: T.amber, marginTop: 4, fontFamily: T.fontBody }}>
                      ⚠️ Nenhuma unidade encontrada. <button onClick={() => navigate('/onboarding')} style={{ color: T.blue, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Criar unidade</button>
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Nome da Meta *</label>
                  <input
                    type="text"
                    placeholder="Ex: Vendas Mensais, NPS, Inadimplência..."
                    value={form.nome_meta}
                    onChange={e => setForm({ ...form, nome_meta: e.target.value })}
                    style={inputSt}
                    onFocus={e => e.target.style.borderColor = T.borderFocus}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>

                <div>
                  <label style={labelSt}>Objetivo Descritivo</label>
                  <textarea
                    placeholder="Descreva o objetivo desta meta..."
                    value={form.objetivo_descritivo}
                    onChange={e => setForm({ ...form, objetivo_descritivo: e.target.value })}
                    rows={3}
                    style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }}
                    onFocus={e => e.target.style.borderColor = T.borderFocus}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={labelSt}>
                    Peso no Portfólio (%)
                    <span style={{ fontWeight: 400, color: T.textDim, marginLeft: 6 }}>opcional</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Ex: 30 — indica 30% do portfólio de metas"
                    value={form.peso}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) {
                        setForm({ ...form, peso: v });
                      }
                    }}
                    style={inputSt}
                    onFocus={e => e.target.style.borderColor = T.borderFocus}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                  <p style={{ fontSize: 11, color: T.textDim, marginTop: 4, fontFamily: T.fontBody }}>
                    Define a importância relativa desta meta no conjunto de metas da unidade. A soma dos pesos deve totalizar 100%.
                  </p>
                </div>
              </div>
            )}

            {/* ── ETAPA 2: Direção ─────────────────────────────────────────── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <OptionCard
                  label="📈 Aumentar"
                  desc="Objetivo de crescimento — vendas, produtividade, satisfação..."
                  selected={form.direcao === 'AUMENTAR'}
                  onClick={() => setForm({ ...form, direcao: 'AUMENTAR' })}
                  color={T.green}
                />
                <OptionCard
                  label="📉 Reduzir"
                  desc="Objetivo de diminuição — inadimplência, retrabalho, erros..."
                  selected={form.direcao === 'REDUZIR'}
                  onClick={() => setForm({ ...form, direcao: 'REDUZIR' })}
                  color={T.red}
                />
              </div>
            )}

            {/* ── ETAPA 3: Periodicidade ───────────────────────────────────── */}
            {step === 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {PERIODICIDADES.map(p => (
                  <OptionCard
                    key={p.value}
                    label={p.label}
                    desc={p.desc}
                    selected={form.periodicidade === p.value}
                    onClick={() => setForm({ ...form, periodicidade: p.value })}
                  />
                ))}
              </div>
            )}

            {/* ── ETAPA 4: Pressão ─────────────────────────────────────────── */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PRESSOES.map(p => (
                  <OptionCard
                    key={p.value}
                    label={p.label}
                    desc={`Meta atingível em ${p.value === 'MODERADO' ? '6 a 9' : p.value === 'INTERMEDIARIO' ? '3 a 6' : p.value === 'DESAFIADOR' ? '1 a 3' : '0 a 1'} dos 12 períodos históricos`}
                    selected={form.nivel_pressao === p.value}
                    onClick={() => setForm({ ...form, nivel_pressao: p.value })}
                    color={p.color}
                    badge={p.tag}
                  />
                ))}
              </div>
            )}

            {/* ── ETAPA 5: Histórico ───────────────────────────────────────── */}
            {step === 5 && (
              <div>
                <p style={{ fontSize: 13, color: T.textMd, fontFamily: T.fontBody, marginBottom: 16, lineHeight: 1.6 }}>
                  Insira os valores históricos do indicador separados por vírgula, espaço ou ponto-e-vírgula.
                  Mínimo de 3 períodos, ideal 12.
                </p>
                <textarea
                  placeholder="Ex: 120, 135, 128, 142, 139, 151, 145, 160, 138, 155, 162, 170"
                  value={form.historico}
                  onChange={e => setForm({ ...form, historico: e.target.value })}
                  rows={5}
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.6, fontFamily: T.fontMono, fontSize: 13 }}
                  onFocus={e => e.target.style.borderColor = T.borderFocus}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
                {form.historico && (() => {
                  const nums = form.historico.split(/[\s,;]+/).filter(v => v !== '').map(Number);
                  const valid = nums.filter(n => !isNaN(n));
                  return (
                    <p style={{ fontSize: 12, color: valid.length >= 3 ? T.green : T.amber, marginTop: 6, fontFamily: T.fontBody }}>
                      {valid.length >= 3 ? `✓ ${valid.length} valores válidos` : `⚠️ ${valid.length} valores — mínimo 3`}
                    </p>
                  );
                })()}
              </div>
            )}

            {/* ── ETAPA 6: Revisão ─────────────────────────────────────────── */}
            {step === 6 && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {[
                    { label: 'Meta',          value: form.nome_meta         },
                    { label: 'Direção',        value: form.direcao           },
                    { label: 'Periodicidade',  value: form.periodicidade     },
                    { label: 'Nível Pressão',  value: form.nivel_pressao     },
                    { label: 'Peso (%)',       value: form.peso !== '' ? `${form.peso}%` : '—' },
                    { label: 'Histórico',      value: form.historico ? `${form.historico.split(/[\s,;]+/).filter(v=>v!=='').length} valores` : '—' },
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '10px 14px', background: T.bgAlt,
                      borderRadius: T.radiusSm, gap: 12,
                    }}>
                      <span style={{ fontSize: 13, color: T.textMd, fontFamily: T.fontBody }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.navy, fontFamily: T.fontDisplay, textAlign: 'right' }}>{item.value || '—'}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div style={{
                    background: T.redDim, border: `1px solid ${T.red}33`,
                    borderRadius: T.radiusSm, padding: '10px 14px',
                    color: T.red, fontSize: 13, marginBottom: 16, fontFamily: T.fontBody,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <button
                  onClick={handleCalcular}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px',
                    background: loading ? T.bgAlt : `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
                    border: 'none', borderRadius: T.radius,
                    color: loading ? T.textDim : '#fff',
                    fontSize: 16, fontWeight: 700,
                    fontFamily: T.fontDisplay, cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(22,163,74,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: T.transition,
                  }}
                >
                  {loading && <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />}
                  {loading ? 'Processando com IA...' : '🎯 Calcular Meta com IA'}
                </button>
              </div>
            )}

            {/* ── Navegação entre etapas ────────────────────────────────────── */}
            {step < 6 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.border}`,
              }}>
                <button
                  onClick={prev}
                  disabled={step === 1}
                  style={{
                    padding: '9px 20px',
                    background: 'transparent',
                    border: `1.5px solid ${step === 1 ? T.border : T.borderHi}`,
                    borderRadius: T.radiusSm,
                    color: step === 1 ? T.textDim : T.textMd,
                    fontSize: 13, fontWeight: 600,
                    fontFamily: T.fontBody,
                    cursor: step === 1 ? 'not-allowed' : 'pointer',
                    transition: T.transition,
                  }}
                >
                  ← Voltar
                </button>

                <span style={{ fontSize: 12, color: T.textDim, fontFamily: T.fontBody }}>
                  {step} / {STEPS.length}
                </span>

                <button
                  onClick={next}
                  disabled={!canProceed()}
                  style={{
                    padding: '9px 24px',
                    background: canProceed()
                      ? `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`
                      : T.bgAlt,
                    border: 'none',
                    borderRadius: T.radiusSm,
                    color: canProceed() ? '#fff' : T.textDim,
                    fontSize: 13, fontWeight: 700,
                    fontFamily: T.fontDisplay,
                    cursor: canProceed() ? 'pointer' : 'not-allowed',
                    boxShadow: canProceed() ? '0 4px 14px rgba(15,45,82,0.2)' : 'none',
                    transition: T.transition,
                  }}
                >
                  Continuar →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────
const labelSt = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#475569', marginBottom: 5,
  fontFamily: "'DM Sans', sans-serif",
};

const inputSt = {
  width: '100%', padding: '10px 14px',
  background: '#f8fafc',
  border: '1.5px solid #e2e8f0',
  borderRadius: '8px',
  color: '#0f2d52', fontSize: 14,
  outline: 'none', transition: 'border-color 0.2s',
  fontFamily: "'DM Sans', sans-serif",
};
