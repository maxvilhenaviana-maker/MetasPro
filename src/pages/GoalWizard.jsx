// src/pages/GoalWizard.jsx
// Wizard de Configuração de Meta — 6 etapas
// Novidades: modo edição (Recalcular) + compartilhamento via WhatsApp

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#060910',
  surface:   '#0d1117',
  card:      '#111827',
  border:    '#1f2937',
  borderHi:  '#374151',
  blue:      '#2563eb',
  blueLight: '#3b82f6',
  blueDim:   'rgba(37,99,235,0.12)',
  green:     '#16a34a',
  greenLight:'#22c55e',
  greenDim:  'rgba(22,197,94,0.10)',
  amber:     '#d97706',
  amberDim:  'rgba(217,119,6,0.12)',
  red:       '#dc2626',
  redDim:    'rgba(220,38,38,0.10)',
  whatsapp:  '#25d366',
  whatsappDim:'rgba(37,211,102,0.12)',
  text:      '#f9fafb',
  textMd:    '#9ca3af',
  textDim:   '#4b5563',
};

const STEPS = [
  { id: 1, label: 'Identificação', short: 'ID'   },
  { id: 2, label: 'Direção',       short: 'DIR'  },
  { id: 3, label: 'Periodicidade', short: 'PER'  },
  { id: 4, label: 'Pressão',       short: 'PRES' },
  { id: 5, label: 'Histórico',     short: 'HIST' },
  { id: 6, label: 'Revisão',       short: 'REV'  },
];

const PERIODICIDADES = [
  { value: 'SEMANAL',      label: 'Semanal',      desc: 'A cada 7 dias'        },
  { value: 'QUINZENAL',    label: 'Quinzenal',    desc: 'A cada 15 dias'       },
  { value: 'MENSAL',       label: 'Mensal',       desc: 'Uma vez por mês'      },
  { value: 'BIMESTRAL',    label: 'Bimestral',    desc: 'A cada 2 meses'       },
  { value: 'TRIMESTRAL',   label: 'Trimestral',   desc: 'A cada 3 meses'       },
  { value: 'SEMESTRAL',    label: 'Semestral',    desc: 'A cada 6 meses'       },
  { value: 'ANUAL',        label: 'Anual',        desc: 'Uma vez por ano'      },
  { value: 'PERSONALIZADA',label: 'Personalizada',desc: 'Defina o intervalo'   },
];

const PRESSOES = [
  { value: 'MODERADO',      pct: 0.25, label: 'Moderado',      tag: '25%',  desc: 'Meta atingível em 6 a 9 dos 12 períodos históricos.',        color: C.green,      dim: C.greenDim, icon: '▬▬░░' },
  { value: 'INTERMEDIARIO', pct: 0.50, label: 'Intermediário', tag: '50%',  desc: 'Meta atingível em 3 a 6 dos 12 períodos históricos.',        color: C.blueLight,  dim: C.blueDim,  icon: '▬▬▬░' },
  { value: 'DESAFIADOR',    pct: 0.75, label: 'Desafiador',    tag: '75%',  desc: 'Meta atingível em 1 a 3 dos 12 períodos históricos.',        color: C.amber,      dim: C.amberDim, icon: '▬▬▬▬' },
  { value: 'ALAVANCADO',    pct: 1.00, label: 'Alavancado',    tag: '100%', desc: 'Meta atingível apenas no ápice do histórico registrado.',    color: C.red,        dim: C.redDim,   icon: '████' },
];

// ─── Utilitários ──────────────────────────────────────────────────────────────
function getToken() {
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p.accessToken || p.token || null;
  } catch { return null; }
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function calcPreview(data, direcao, pressaoPct) {
  const nums = data.filter(v => v !== '' && !isNaN(Number(v))).map(Number);
  if (nums.length < 3) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  let intervalM, meta;
  if (direcao === 'AUMENTAR') { intervalM = Math.max(...nums) - mean; meta = mean + pressaoPct * intervalM; }
  else                        { intervalM = mean - Math.min(...nums); meta = mean - pressaoPct * intervalM; }
  return { mean, intervalM, meta, count: nums.length };
}

// ─── WhatsApp share ───────────────────────────────────────────────────────────
function buildWhatsAppText(result, nomeMeta) {
  const pressao = PRESSOES.find(p => p.value === result.nivelPressao);
  const direcaoEmoji = result.direcao === 'AUMENTAR' ? '📈' : '📉';

  let msg = `*MetasPro — Resultado de Meta* 🎯\n\n`;
  msg += `*Meta:* ${nomeMeta || 'Meta calculada'}\n`;
  msg += `*Direção:* ${direcaoEmoji} ${result.direcao === 'AUMENTAR' ? 'Aumentar' : 'Reduzir'}\n`;
  msg += `*Nível de Pressão:* ${pressao?.label} (${pressao?.tag})\n\n`;
  msg += `━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *Média Histórica Limpa:* ${fmt(result.mediaCalculada)}\n`;
  msg += `📐 *Intervalo M:* ${fmt(result.intervaloM)}\n`;
  msg += `🏆 *META SUGERIDA: ${fmt(result.metaFinal)}*\n`;
  msg += `━━━━━━━━━━━━━━━━\n\n`;

  if (result.outliersExcluidos?.length > 0) {
    msg += `🔍 *Outliers removidos pela IA:* ${result.outliersExcluidos.join(', ')}\n`;
    msg += `_${result.justificativaOutliers}_\n\n`;
  }

  if (result.justificativaMeta) {
    msg += `💡 *Análise da IA:*\n${result.justificativaMeta}\n\n`;
  }

  msg += `_Gerado pelo MetasPro • Criando Metas • Gerenciando Resultados_`;
  return msg;
}

function shareWhatsApp(result, nomeMeta) {
  const text = buildWhatsAppText(result, nomeMeta);
  const url  = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ current, isEdit }) {
  return (
    <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${C.border}`, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {isEdit ? 'Recalcular Meta' : 'Nova Meta'}
      </p>
      {isEdit && (
        <div style={{ marginBottom: 16, padding: '6px 10px', background: C.amberDim, border: `1px solid ${C.amber}44`, borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: C.amber, fontWeight: 600 }}>✏️ Modo edição</p>
        </div>
      )}
      {STEPS.map((s, i) => {
        const done   = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', position: 'relative' }}>
            {i < STEPS.length - 1 && (
              <div style={{ position: 'absolute', left: 15, top: 36, width: 2, height: 20, background: done ? C.green : C.border, transition: 'background 0.4s' }} />
            )}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800,
              background: done ? C.green : active ? C.blue : 'transparent',
              border: `2px solid ${done ? C.green : active ? C.blue : C.border}`,
              color: done || active ? '#fff' : C.textDim,
              transition: 'all 0.3s', fontFamily: "'Fira Code', monospace",
            }}>
              {done ? '✓' : s.id}
            </div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: active ? 700 : 500, color: done ? C.greenLight : active ? C.text : C.textDim, transition: 'color 0.3s' }}>
              {s.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── STEP 1: Identificação ────────────────────────────────────────────────────
function Step1({ data, onChange, unidades, loadingUnidades }) {
  return (
    <StepWrapper title="Identificação da Meta" subtitle="Nomeie e contextualize o indicador que será monitorado" icon="◎">
      <Field label="Nome da Meta *">
        <Input value={data.nome_meta} onChange={e => onChange('nome_meta', e.target.value)} placeholder="Descreva o indicador de forma clara e objetiva" />
      </Field>
      <Field label="Unidade Monitorada *">
        <Select value={data.unidade_id} onChange={e => onChange('unidade_id', e.target.value)} disabled={loadingUnidades}>
          <option value="">{loadingUnidades ? 'Carregando unidades...' : '— Selecione uma unidade —'}</option>
          {unidades.map(u => (
            <option key={u.id} value={u.id}>{u.nome_unidade}{u.codigo_unidade ? ` (${u.codigo_unidade})` : ''}</option>
          ))}
        </Select>
      </Field>
      <Field label="Descrição do Objetivo" hint="Contexto estratégico ou operacional (opcional)">
        <Textarea value={data.objetivo_descritivo} onChange={e => onChange('objetivo_descritivo', e.target.value)} placeholder="Ex: Aumentar a participação de mercado no segmento premium..." rows={3} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Abrangência">
          <Select value={data.abrangencia} onChange={e => onChange('abrangencia', e.target.value)}>
            <option value="ESTRATEGICA">Estratégica</option>
            <option value="OPERACIONAL">Operacional</option>
          </Select>
        </Field>
        <Field label="Apresentação">
          <Select value={data.apresentacao} onChange={e => onChange('apresentacao', e.target.value)}>
            <option value="NUMERO">Número absoluto</option>
            <option value="PERCENTUAL">Percentual (%)</option>
          </Select>
        </Field>
      </div>
    </StepWrapper>
  );
}

// ─── STEP 2: Direção ──────────────────────────────────────────────────────────
function Step2({ data, onChange }) {
  const opts = [
    { value: 'AUMENTAR', emoji: '📈', title: 'Aumentar', desc: 'O resultado deve crescer ao longo do tempo.', examples: 'Vendas, Receita, Produção, NPS, Clientes', color: C.green,     dim: C.greenDim  },
    { value: 'REDUZIR',  emoji: '📉', title: 'Reduzir',  desc: 'O resultado deve diminuir ao longo do tempo.', examples: 'Custos, Rejeições, Tempo de espera, Devoluções', color: C.blueLight, dim: C.blueDim   },
  ];
  return (
    <StepWrapper title="Direção da Meta" subtitle="Defina se o objetivo é crescer ou reduzir o indicador" icon="⇅">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
        {opts.map(opt => {
          const active = data.direcao === opt.value;
          return (
            <button key={opt.value} onClick={() => onChange('direcao', opt.value)} style={{ background: active ? opt.dim : 'transparent', border: `2px solid ${active ? opt.color : C.border}`, borderRadius: 14, padding: '20px 24px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              <span style={{ fontSize: 32, lineHeight: 1 }}>{opt.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: active ? opt.color : C.text, fontFamily: "'Sora', sans-serif" }}>{opt.title}</p>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: C.textMd }}>{opt.desc}</p>
                <p style={{ margin: 0, fontSize: 11, color: active ? opt.color : C.textDim }}>Exemplos: {opt.examples}</p>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${active ? opt.color : C.border}`, background: active ? opt.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </div>
            </button>
          );
        })}
      </div>
      {data.direcao && (
        <InfoBox color={data.direcao === 'AUMENTAR' ? C.green : C.blueLight}>
          A IA usará o <strong>{data.direcao === 'AUMENTAR' ? 'maior' : 'menor'}</strong> valor da amostra limpa para calcular o Intervalo M.
        </InfoBox>
      )}
    </StepWrapper>
  );
}

// ─── STEP 3: Periodicidade ────────────────────────────────────────────────────
function Step3({ data, onChange }) {
  return (
    <StepWrapper title="Periodicidade" subtitle="Com que frequência os resultados serão registrados?" icon="⟳">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        {PERIODICIDADES.map(p => {
          const active = data.periodicidade_resultado === p.value;
          return (
            <button key={p.value} onClick={() => onChange('periodicidade_resultado', p.value)} style={{ background: active ? C.blueDim : 'transparent', border: `1.5px solid ${active ? C.blue : C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: active ? C.blueLight : C.text, fontFamily: "'Sora', sans-serif" }}>{p.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{p.desc}</p>
            </button>
          );
        })}
      </div>
      {data.periodicidade_resultado === 'PERSONALIZADA' && (
        <div style={{ marginTop: 16 }}>
          <Field label="Descreva a periodicidade">
            <Input value={data.periodicidade_custom || ''} onChange={e => onChange('periodicidade_custom', e.target.value)} placeholder="Ex: A cada 45 dias, por safra, por campanha..." />
          </Field>
        </div>
      )}
      {data.periodicidade_resultado && (
        <InfoBox color={C.blueLight}>
          Resultados registrados <strong>{PERIODICIDADES.find(p => p.value === data.periodicidade_resultado)?.label?.toLowerCase()}</strong>.
        </InfoBox>
      )}
    </StepWrapper>
  );
}

// ─── STEP 4: Pressão ──────────────────────────────────────────────────────────
function Step4({ data, onChange }) {
  const selected = PRESSOES.find(p => p.value === data.nivel_pressao);
  return (
    <StepWrapper title="Nível de Pressão" subtitle="Define o grau de desafio da meta em relação ao histórico" icon="⚡">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {PRESSOES.map(p => {
          const active = data.nivel_pressao === p.value;
          return (
            <button key={p.value} onClick={() => onChange('nivel_pressao', p.value)} style={{ background: active ? p.dim : 'transparent', border: `1.5px solid ${active ? p.color : C.border}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.22s', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 13, letterSpacing: 2, color: active ? p.color : C.textDim, flexShrink: 0, width: 52 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: active ? p.color : C.text, fontFamily: "'Sora', sans-serif" }}>{p.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: active ? p.color : C.border, color: active ? '#fff' : C.textDim, padding: '2px 8px', borderRadius: 20, fontFamily: "'Fira Code', monospace" }}>{p.tag}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: C.textMd }}>{p.desc}</p>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${active ? p.color : C.border}`, background: active ? p.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: `linear-gradient(135deg, ${selected.dim}, transparent)`, border: `1px solid ${selected.color}22`, borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: selected.color, fontWeight: 600 }}>
            Fórmula: Meta = Média {data.direcao === 'REDUZIR' ? '−' : '+'} {selected.tag} × Intervalo M
          </p>
        </div>
      )}
    </StepWrapper>
  );
}

// ─── STEP 5: Histórico ────────────────────────────────────────────────────────
function Step5({ data, onChange }) {
  const vals       = data.historico;
  const periodLabel = PERIODICIDADES.find(p => p.value === data.periodicidade_resultado)?.label || 'Período';
  const pressao     = PRESSOES.find(p => p.value === data.nivel_pressao);
  const filled      = vals.filter(v => v !== '' && !isNaN(Number(v)));
  const preview     = calcPreview(vals, data.direcao, pressao?.pct || 0.25);

  const handleChange = (i, val) => {
    const next = [...vals]; next[i] = val; onChange('historico', next);
  };

  return (
    <StepWrapper title="Resultados Históricos" subtitle={`Insira os últimos resultados. Mínimo 6, ideal 12 períodos.`} icon="∿">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
        {vals.map((v, i) => {
          const hasVal = v !== '' && !isNaN(Number(v));
          return (
            <div key={i}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: hasVal ? C.blueLight : C.textDim, marginBottom: 4, letterSpacing: '0.06em', fontFamily: "'Fira Code', monospace" }}>
                {periodLabel.slice(0, 3).toUpperCase()} {i + 1}
              </label>
              <input
                type="number" value={v}
                onChange={e => handleChange(i, e.target.value)}
                placeholder="—"
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', background: hasVal ? 'rgba(37,99,235,0.08)' : C.surface, border: `1.5px solid ${hasVal ? C.blue : C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', transition: 'all 0.2s', fontFamily: "'Fira Code', monospace", textAlign: 'center' }}
                onFocus={e => e.target.style.borderColor = C.blueLight}
                onBlur={e => e.target.style.borderColor = hasVal ? C.blue : C.border}
              />
            </div>
          );
        })}
      </div>

      {/* Barra de progresso */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.4s', width: `${(filled.length / 12) * 100}%`, background: filled.length >= 6 ? C.green : C.amber }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: filled.length >= 6 ? C.greenLight : C.amber, fontFamily: "'Fira Code', monospace", flexShrink: 0 }}>
          {filled.length}/12
        </span>
      </div>

      {/* Preview */}
      {preview && (
        <div style={{ marginTop: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'rgba(37,99,235,0.08)', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.blueLight, letterSpacing: '0.08em' }}>⚡ PRÉ-VISUALIZAÇÃO (sem IA — dados brutos)</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <PreviewCell label="Média" value={fmt(preview.mean)} />
            <PreviewCell label="Intervalo M" value={fmt(preview.intervalM)} border />
            <PreviewCell label="Meta estimada" value={fmt(preview.meta)} highlight color={pressao?.color} />
          </div>
          <p style={{ margin: 0, padding: '8px 16px 10px', fontSize: 11, color: C.textDim }}>* A IA refinará este cálculo removendo outliers.</p>
        </div>
      )}
      {filled.length < 6 && filled.length > 0 && (
        <InfoBox color={C.amber}>Preencha pelo menos <strong>6 períodos</strong> para uma análise confiável.</InfoBox>
      )}
    </StepWrapper>
  );
}

// ─── STEP 6: Revisão ──────────────────────────────────────────────────────────
function Step6({ data, unidades, onSubmit, loading, error, isEdit }) {
  const pressao = PRESSOES.find(p => p.value === data.nivel_pressao);
  const per     = PERIODICIDADES.find(p => p.value === data.periodicidade_resultado);
  const unidade = unidades.find(u => u.id === data.unidade_id);
  const filled  = data.historico.filter(v => v !== '' && !isNaN(Number(v)));

  const rows = [
    { label: 'Nome da Meta',       value: data.nome_meta },
    { label: 'Unidade',            value: unidade?.nome_unidade || '—' },
    { label: 'Direção',            value: data.direcao === 'AUMENTAR' ? '📈 Aumentar' : '📉 Reduzir' },
    { label: 'Periodicidade',      value: per?.label || '—' },
    { label: 'Nível de Pressão',   value: `${pressao?.label} (${pressao?.tag})` },
    { label: 'Apresentação',       value: data.apresentacao === 'NUMERO' ? 'Número absoluto' : 'Percentual (%)' },
    { label: 'Abrangência',        value: data.abrangencia === 'ESTRATEGICA' ? 'Estratégica' : 'Operacional' },
    { label: 'Períodos históricos',value: `${filled.length} de 12 preenchidos` },
  ];

  return (
    <StepWrapper title="Revisão Final" subtitle="Confirme as configurações antes de enviar para análise" icon="◈">
      {isEdit && (
        <div style={{ padding: '10px 14px', background: C.amberDim, border: `1px solid ${C.amber}44`, borderRadius: 10, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 12, color: C.amber, fontWeight: 600 }}>
            ✏️ Você está <strong>recalculando</strong> esta meta. Um novo ciclo será criado com os dados atualizados.
          </p>
        </div>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ fontSize: 12, color: C.textDim }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: 'right', maxWidth: '55%' }}>{r.value}</span>
          </div>
        ))}
      </div>

      {data.objetivo_descritivo && (
        <div style={{ padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Objetivo</p>
          <p style={{ margin: 0, fontSize: 13, color: C.textMd, lineHeight: 1.5 }}>{data.objetivo_descritivo}</p>
        </div>
      )}

      <div style={{ padding: '12px 16px', background: 'rgba(22,163,74,0.08)', border: `1px solid rgba(22,163,74,0.2)`, borderRadius: 10 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.greenLight, lineHeight: 1.5 }}>
          🤖 A <strong>IA analisará</strong> os dados históricos, identificará outliers e sugerirá a meta final.
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 10, color: '#fca5a5', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={onSubmit} disabled={loading} style={{
        width: '100%', marginTop: 4, padding: '15px',
        background: loading ? C.border : `linear-gradient(135deg, ${C.green}, #15803d)`,
        border: 'none', borderRadius: 12, color: '#fff',
        fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: "'Sora', sans-serif",
        boxShadow: loading ? 'none' : '0 4px 24px rgba(22,163,74,0.3)',
        transition: 'all 0.25s',
      }}>
        {loading ? <><Spinner /> Analisando com IA...</> : isEdit ? '🔄 Recalcular Meta' : '🚀 Confirmar e Calcular Meta'}
      </button>
    </StepWrapper>
  );
}

// ─── Tela de Resultado ────────────────────────────────────────────────────────
function ResultScreen({ result, nomeMeta, onEdit, onNew, onDashboard }) {
  const pressao = PRESSOES.find(p => p.value === result.nivelPressao);
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    const text = buildWhatsAppText(result, nomeMeta);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ padding: '32px 36px', animation: 'fadeIn 0.5s ease' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', margin: '0 auto 16px', background: 'linear-gradient(135deg, #065f46, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, animation: 'pulseGreen 2s infinite' }}>✓</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: C.text, fontFamily: "'Sora', sans-serif" }}>
          Meta Calculada!
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: C.textMd }}>
          {nomeMeta && <span style={{ color: C.blueLight, fontWeight: 600 }}>{nomeMeta} · </span>}
          A IA analisou o histórico e definiu a meta ideal
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <ResultCard label="Média Limpa"  value={fmt(result.mediaCalculada)} />
        <ResultCard label="Intervalo M"  value={fmt(result.intervaloM)} />
        <ResultCard label="META FINAL"   value={fmt(result.metaFinal)} highlight color={pressao?.color} />
      </div>

      {/* Outliers */}
      {result.outliersExcluidos?.length > 0 && (
        <div style={{ padding: '14px 18px', marginBottom: 14, background: C.amberDim, border: `1px solid ${C.amber}33`, borderRadius: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: C.amber }}>🔍 Outliers removidos pela IA</p>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#fde68a', fontFamily: "'Fira Code', monospace" }}>{result.outliersExcluidos.join(' · ')}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#d97706', lineHeight: 1.5 }}>{result.justificativaOutliers}</p>
        </div>
      )}

      {/* Justificativa */}
      <div style={{ padding: '14px 18px', marginBottom: 20, background: C.blueDim, border: `1px solid ${C.blue}33`, borderRadius: 12 }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: C.blueLight }}>💡 Por que esta meta?</p>
        <p style={{ margin: 0, fontSize: 13, color: C.textMd, lineHeight: 1.6 }}>{result.justificativaMeta}</p>
      </div>

      {/* ── Ações principais ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {/* Recalcular / Editar */}
        <button onClick={onEdit} style={{
          flex: 1, padding: '13px 10px',
          background: C.amberDim, border: `1px solid ${C.amber}55`,
          borderRadius: 12, color: C.amber, fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Sora', sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.2s',
        }}>
          ✏️ Ajustar e Recalcular
        </button>

        {/* Dashboard */}
        <button onClick={onDashboard} style={{
          flex: 1, padding: '13px 10px',
          background: `linear-gradient(135deg, ${C.blue}, #1e40af)`,
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Sora', sans-serif",
          boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
        }}>
          Ver no Dashboard →
        </button>
      </div>

      {/* ── Compartilhamento WhatsApp ─────────────────────────────────────── */}
      <div style={{
        border: `1px solid ${C.whatsapp}33`,
        borderRadius: 14, overflow: 'hidden', marginBottom: 10,
      }}>
        {/* Header da seção */}
        <div style={{ padding: '10px 16px', background: C.whatsappDim, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📲</span>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.whatsapp }}>
            Compartilhar resultado
          </p>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
          {/* Enviar via WhatsApp */}
          <button
            onClick={() => shareWhatsApp(result, nomeMeta)}
            style={{
              flex: 2, padding: '12px 14px',
              background: C.whatsapp,
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: "'Sora', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Enviar pelo WhatsApp
          </button>

          {/* Copiar texto */}
          <button
            onClick={handleCopyText}
            style={{
              flex: 1, padding: '12px 10px',
              background: copied ? C.greenDim : 'transparent',
              border: `1px solid ${copied ? C.green : C.border}`,
              borderRadius: 10, color: copied ? C.greenLight : C.textMd,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            {copied ? '✓ Copiado' : '📋 Copiar'}
          </button>
        </div>

        {/* Preview do texto */}
        <div style={{ margin: '0 16px 14px', padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 80, overflow: 'hidden', position: 'relative' }}>
          <p style={{ margin: 0, fontSize: 10, color: C.textDim, lineHeight: 1.5, whiteSpace: 'pre-line', fontFamily: "'Fira Code', monospace" }}>
            {buildWhatsAppText(result, nomeMeta).slice(0, 160)}…
          </p>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: `linear-gradient(transparent, ${C.surface})` }} />
        </div>
      </div>

      {/* Nova meta */}
      <button onClick={onNew} style={{
        width: '100%', padding: '11px',
        background: 'transparent', border: `1px solid ${C.border}`,
        borderRadius: 12, color: C.textDim, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
      }}>
        + Criar nova meta
      </button>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function StepWrapper({ title, subtitle, icon, children }) {
  return (
    <div style={{ padding: '32px 36px', animation: 'fadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: C.blueDim, border: `1px solid ${C.blue}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: C.blueLight, fontFamily: "'Fira Code', monospace" }}>{icon}</div>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.text, fontFamily: "'Sora', sans-serif" }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.textMd }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
      {children}
      {hint && <p style={{ margin: '5px 0 0', fontSize: 11, color: C.textDim }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', background: focused ? 'rgba(37,99,235,0.06)' : C.surface, border: `1.5px solid ${focused ? C.blue : C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" }}
    />
  );
}

function Select({ value, onChange, children, disabled }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}
      style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, color: value ? C.text : C.textDim, fontSize: 14, outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
      {children}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', background: focused ? 'rgba(37,99,235,0.06)' : C.surface, border: `1.5px solid ${focused ? C.blue : C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', transition: 'all 0.2s', resize: 'vertical', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}
    />
  );
}

function InfoBox({ color, children }) {
  return (
    <div style={{ padding: '10px 14px', marginTop: 4, background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 10, fontSize: 12, color: C.textMd, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function PreviewCell({ label, value, highlight, color, border }) {
  return (
    <div style={{ padding: '12px 16px', textAlign: 'center', borderLeft: border ? `1px solid ${C.border}` : 'none', background: highlight ? `${color}14` : 'transparent' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: highlight ? color : C.text, fontFamily: "'Fira Code', monospace" }}>{value}</p>
    </div>
  );
}

function ResultCard({ label, value, highlight, color }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, textAlign: 'center', background: highlight ? `${color}18` : C.card, border: `1px solid ${highlight ? color + '44' : C.border}` }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, color: highlight ? color : C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: highlight ? color : C.text, fontFamily: "'Fira Code', monospace" }}>{value}</p>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

// ─── Estado inicial ───────────────────────────────────────────────────────────
const INITIAL = {
  nome_meta: '', unidade_id: '', objetivo_descritivo: '',
  abrangencia: 'OPERACIONAL', apresentacao: 'NUMERO',
  direcao: 'AUMENTAR', periodicidade_resultado: 'MENSAL',
  periodicidade_custom: '', nivel_pressao: 'MODERADO',
  historico: Array(12).fill(''),
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function GoalWizard() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  // Modo edição: ?edit=configId pré-preenche o wizard
  const editId = searchParams.get('edit') || null;

  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState(INITIAL);
  const [isEdit, setIsEdit]     = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [loadingUni, setLoadingUni] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null);
  const topRef = useRef(null);

  // Carrega unidades
  useEffect(() => {
    api.get('/onboarding/status')
      .then(({ data }) => {
        if (data.onboardingCompleto && data.empresa?.id) {
          return api.get(`/metas/unidades/${data.empresa.id}`);
        }
      })
      .then(res => { if (res?.data) setUnidades(res.data); })
      .catch(() => {})
      .finally(() => setLoadingUni(false));
  }, []);

  // Modo edição: carrega dados da meta existente
  useEffect(() => {
    if (!editId) return;
    setIsEdit(true);
    setLoadingEdit(true);
    api.get(`/metas/config/${editId}`)
      .then(({ data }) => {
        setForm({
          nome_meta:               data.nome_meta               || '',
          unidade_id:              data.unidade_id              || '',
          objetivo_descritivo:     data.objetivo_descritivo     || '',
          abrangencia:             data.abrangencia             || 'OPERACIONAL',
          apresentacao:            data.apresentacao            || 'NUMERO',
          direcao:                 data.direcao                 || 'AUMENTAR',
          periodicidade_resultado: data.periodicidade_resultado || 'MENSAL',
          periodicidade_custom:    '',
          nivel_pressao:           data.nivel_pressao_label     || 'MODERADO',
          historico:               data.historico?.length
            ? [...data.historico.map(String), ...Array(Math.max(0, 12 - data.historico.length)).fill('')]
            : Array(12).fill(''),
        });
      })
      .catch(() => {})
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  const canProceed = () => {
    if (step === 1) return form.nome_meta.trim() && form.unidade_id;
    if (step === 2) return !!form.direcao;
    if (step === 3) return !!form.periodicidade_resultado;
    if (step === 4) return !!form.nivel_pressao;
    if (step === 5) return form.historico.filter(v => v !== '' && !isNaN(Number(v))).length >= 6;
    return true;
  };

  const next = () => { if (canProceed()) { setStep(s => s + 1); scrollTop(); } };
  const back = () => { setStep(s => s - 1); scrollTop(); };

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const nums = form.historico.filter(v => v !== '' && !isNaN(Number(v))).map(Number);
      const { data } = await api.post('/metas/calcular', {
        nome_meta:               form.nome_meta,
        unidade_id:              form.unidade_id,
        objetivo_descritivo:     form.objetivo_descritivo,
        abrangencia:             form.abrangencia,
        apresentacao:            form.apresentacao,
        direcao:                 form.direcao,
        periodicidade_resultado: form.periodicidade_resultado,
        nivel_pressao:           form.nivel_pressao,
        historico:               nums,
        config_id_origem:        isEdit ? editId : undefined, // backend pode usar para atualizar
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // "Ajustar e Recalcular" — volta ao wizard mantendo dados preenchidos
  const handleEdit = () => {
    setResult(null);
    setStep(1);
    setIsEdit(true);
    scrollTop();
  };

  const handleNew = () => { setForm(INITIAL); setStep(1); setResult(null); setError(''); setIsEdit(false); };

  if (loadingEdit) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.blueLight, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: C.textDim, fontSize: 13, fontFamily: 'sans-serif', margin: 0 }}>Carregando meta...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&family=Fira+Code:wght@400;500;700&display=swap');
        @keyframes fadeIn    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin      { to { transform:rotate(360deg); } }
        @keyframes pulseGreen {
          0%,100% { box-shadow: 0 0 0 10px rgba(22,163,74,0.12); }
          50%     { box-shadow: 0 0 0 18px rgba(22,163,74,0.06); }
        }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${C.textDim}; }
        select option { background: ${C.card}; color: ${C.text}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      `}</style>

      <div ref={topRef} style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: C.text, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
              Metas<span style={{ color: C.blueLight }}>Pro</span>
            </span>
            {isEdit && (
              <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberDim, border: `1px solid ${C.amber}44`, padding: '2px 8px', borderRadius: 20 }}>
                MODO EDIÇÃO
              </span>
            )}
          </div>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 14px', color: C.textMd, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            ← Dashboard
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {!result && <Sidebar current={step} isEdit={isEdit} />}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {result ? (
              <ResultScreen
                result={result}
                nomeMeta={form.nome_meta}
                onEdit={handleEdit}
                onNew={handleNew}
                onDashboard={() => navigate('/dashboard')}
              />
            ) : (
              <>
                {step === 1 && <Step1 data={form} onChange={setField} unidades={unidades} loadingUnidades={loadingUni} />}
                {step === 2 && <Step2 data={form} onChange={setField} />}
                {step === 3 && <Step3 data={form} onChange={setField} />}
                {step === 4 && <Step4 data={form} onChange={setField} />}
                {step === 5 && <Step5 data={form} onChange={setField} />}
                {step === 6 && <Step6 data={form} unidades={unidades} onSubmit={handleSubmit} loading={loading} error={error} isEdit={isEdit} />}

                {/* Navegação */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 36px 32px', gap: 12 }}>
                  <button onClick={back} disabled={step === 1} style={{ padding: '11px 24px', background: 'transparent', border: `1px solid ${step === 1 ? C.border : C.borderHi}`, borderRadius: 10, color: step === 1 ? C.textDim : C.textMd, fontSize: 13, fontWeight: 600, cursor: step === 1 ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}>
                    ← Voltar
                  </button>
                  <span style={{ fontSize: 11, color: C.textDim, fontFamily: "'Fira Code', monospace" }}>{step} / {STEPS.length}</span>
                  {step < 6 && (
                    <button onClick={next} disabled={!canProceed()} style={{ padding: '11px 28px', background: canProceed() ? `linear-gradient(135deg, ${C.blue}, #1e40af)` : C.border, border: 'none', borderRadius: 10, color: canProceed() ? '#fff' : C.textDim, fontSize: 13, fontWeight: 700, cursor: canProceed() ? 'pointer' : 'not-allowed', fontFamily: "'Sora', sans-serif", transition: 'all 0.2s', boxShadow: canProceed() ? '0 4px 16px rgba(37,99,235,0.25)' : 'none' }}>
                      Continuar →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
