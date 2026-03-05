// src/pages/Dashboard.jsx
// Dashboard principal — lista metas com opções de visualizar e recalcular

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Paleta (alinhada ao GoalWizard) ─────────────────────────────────────────
const C = {
  bg:         '#060910',
  surface:    '#0d1117',
  card:       '#111827',
  cardHover:  '#161f2e',
  border:     '#1f2937',
  borderHi:   '#374151',
  blue:       '#2563eb',
  blueLight:  '#3b82f6',
  blueDim:    'rgba(37,99,235,0.12)',
  green:      '#16a34a',
  greenLight: '#22c55e',
  greenDim:   'rgba(22,197,94,0.10)',
  amber:      '#d97706',
  amberLight: '#fbbf24',
  amberDim:   'rgba(217,119,6,0.12)',
  red:        '#dc2626',
  redDim:     'rgba(220,38,38,0.10)',
  text:       '#f9fafb',
  textMd:     '#9ca3af',
  textDim:    '#4b5563',
};

// ─── Mapeamentos ──────────────────────────────────────────────────────────────
const PRESSAO_MAP = {
  '0.25': { label: 'Moderado',      color: C.green,     tag: '25%'  },
  '0.5':  { label: 'Intermediário', color: C.blueLight, tag: '50%'  },
  '0.50': { label: 'Intermediário', color: C.blueLight, tag: '50%'  },
  '0.75': { label: 'Desafiador',    color: C.amber,     tag: '75%'  },
  '1':    { label: 'Alavancado',    color: C.red,       tag: '100%' },
  '1.00': { label: 'Alavancado',    color: C.red,       tag: '100%' },
};

const DIRECAO_MAP = {
  AUMENTAR: { emoji: '📈', label: 'Aumentar', color: C.greenLight },
  REDUZIR:  { emoji: '📉', label: 'Reduzir',  color: C.blueLight  },
};

const PERIOD_MAP = {
  SEMANAL: 'Semanal', QUINZENAL: 'Quinzenal', MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral', TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral', ANUAL: 'Anual', PERSONALIZADA: 'Personalizada',
};

function getPressao(nivel) {
  const key = String(Number(nivel).toFixed(2));
  return PRESSAO_MAP[key] || PRESSAO_MAP[String(nivel)] || { label: '—', color: C.textDim, tag: '—' };
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Modal de Detalhes ────────────────────────────────────────────────────────
function MetaModal({ meta, onClose, onEdit }) {
  const pressao = getPressao(meta.nivel_pressao);
  const direcao = DIRECAO_MAP[meta.direcao] || {};

  // Fecha com ESC
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const rows = [
    { label: 'Nome da Meta',      value: meta.nome_meta },
    { label: 'Unidade',           value: meta.nome_unidade || '—' },
    { label: 'Direção',           value: `${direcao.emoji || ''} ${direcao.label || meta.direcao}` },
    { label: 'Periodicidade',     value: PERIOD_MAP[meta.periodicidade_resultado] || meta.periodicidade_resultado },
    { label: 'Nível de Pressão',  value: `${pressao.label} (${pressao.tag})` },
    { label: 'Apresentação',      value: meta.apresentacao === 'NUMERO' ? 'Número absoluto' : 'Percentual (%)' },
    { label: 'Abrangência',       value: meta.abrangencia === 'ESTRATEGICA' ? 'Estratégica' : 'Operacional' },
    { label: 'Criada em',         value: fmtDate(meta.criado_em) },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, animation: 'fadeOverlay 0.2s ease' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 520,
        background: C.card, border: `1px solid ${C.borderHi}`,
        borderRadius: 20, zIndex: 101,
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        animation: 'slideModal 0.25s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Detalhes da Meta</p>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>
              {meta.nome_meta}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, color: C.textMd, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ×
          </button>
        </div>

        {/* Cards de resultado */}
        <div style={{ padding: '20px 28px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            <MiniCard label="Média Limpa"  value={fmt(meta.media_calculada)} />
            <MiniCard label="Intervalo M"  value={fmt(meta.intervalo_m)} />
            <MiniCard label="META FINAL"   value={fmt(meta.valor_meta_final)} highlight color={pressao.color} />
          </div>
        </div>

        {/* Tabela de configuração */}
        <div style={{ margin: '0 28px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontSize: 12, color: C.textDim }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: 'right', maxWidth: '60%' }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Justificativa da IA */}
        {meta.justificativa_meta && (
          <div style={{ margin: '14px 28px 0', padding: '12px 16px', background: C.blueDim, border: `1px solid ${C.blue}33`, borderRadius: 10 }}>
            <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: C.blueLight }}>💡 Análise da IA</p>
            <p style={{ margin: 0, fontSize: 12, color: C.textMd, lineHeight: 1.6 }}>{meta.justificativa_meta}</p>
          </div>
        )}

        {/* Ações */}
        <div style={{ padding: '20px 28px 24px', display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMd, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Fechar
          </button>
          <button
            onClick={() => { onClose(); onEdit(meta.config_id); }}
            style={{ flex: 2, padding: '11px', background: `linear-gradient(135deg, ${C.amber}, #b45309)`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            ✏️ Ajustar e Recalcular
          </button>
        </div>
      </div>
    </>
  );
}

function MiniCard({ label, value, highlight, color }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, textAlign: 'center', background: highlight ? `${color}18` : C.surface, border: `1px solid ${highlight ? color + '44' : C.border}` }}>
      <p style={{ margin: '0 0 3px', fontSize: 9, color: highlight ? color : C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: highlight ? color : C.text, fontFamily: "'Fira Code', monospace" }}>{value}</p>
    </div>
  );
}

// ─── Card de Meta ─────────────────────────────────────────────────────────────
function MetaCard({ meta, onView, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const pressao = getPressao(meta.nivel_pressao);
  const direcao = DIRECAO_MAP[meta.direcao] || {};

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        border: `1px solid ${hovered ? C.borderHi : C.border}`,
        borderRadius: 16, padding: '20px 22px',
        transition: 'all 0.2s', cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
      }}
      onClick={() => onView(meta)}
    >
      {/* Cabeçalho do card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Sora', sans-serif", lineHeight: 1.4, flex: 1 }}>
          {meta.nome_meta}
        </h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: pressao.color, background: `${pressao.color}18`, border: `1px solid ${pressao.color}33`, padding: '2px 8px', borderRadius: 20, flexShrink: 0, fontFamily: "'Fira Code', monospace" }}>
          {pressao.tag}
        </span>
      </div>

      {/* Meta final — destaque */}
      <div style={{ marginBottom: 14, padding: '10px 14px', background: `${pressao.color}0e`, border: `1px solid ${pressao.color}22`, borderRadius: 10 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, color: pressao.color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Meta Final</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: pressao.color, fontFamily: "'Fira Code', monospace" }}>
          {fmt(meta.valor_meta_final)}
        </p>
      </div>

      {/* Chips de info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        <Chip>{direcao.emoji} {direcao.label || meta.direcao}</Chip>
        <Chip>{pressao.label}</Chip>
        <Chip>{PERIOD_MAP[meta.periodicidade_resultado] || meta.periodicidade_resultado}</Chip>
        {meta.nome_unidade && <Chip>🏭 {meta.nome_unidade}</Chip>}
      </div>

      {/* Média + data */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, color: C.textDim }}>
          Média limpa: <span style={{ color: C.textMd, fontFamily: "'Fira Code', monospace" }}>{fmt(meta.media_calculada)}</span>
        </span>
        <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(meta.criado_em)}</span>
      </div>

      {/* Botões de ação */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={e => { e.stopPropagation(); onView(meta); }}
          style={{ flex: 1, padding: '8px', background: C.blueDim, border: `1px solid ${C.blue}33`, borderRadius: 8, color: C.blueLight, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          👁 Visualizar
        </button>
        <button
          onClick={e => { e.stopPropagation(); onEdit(meta.config_id); }}
          style={{ flex: 1, padding: '8px', background: C.amberDim, border: `1px solid ${C.amber}33`, borderRadius: 8, color: C.amberLight, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          ✏️ Recalcular
        </button>
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span style={{ fontSize: 11, color: C.textMd, background: C.surface, border: `1px solid ${C.border}`, padding: '3px 8px', borderRadius: 20, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </span>
  );
}

// ─── Estado vazio ─────────────────────────────────────────────────────────────
function EmptyState({ onNew }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: C.text, fontFamily: "'Sora', sans-serif" }}>
        Nenhuma meta ainda
      </h3>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: C.textMd, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
        Crie sua primeira meta e deixe a IA calcular o nível de desafio ideal com base no seu histórico.
      </p>
      <button
        onClick={onNew}
        style={{ padding: '13px 32px', background: `linear-gradient(135deg, ${C.blue}, #1e40af)`, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif", boxShadow: '0 4px 20px rgba(37,99,235,0.35)' }}
      >
        + Criar primeira meta
      </button>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.blueLight, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>Carregando metas...</p>
    </div>
  );
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [metas, setMetas]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [empresa, setEmpresa]       = useState(null);
  const [selectedMeta, setSelected] = useState(null);
  const [filtro, setFiltro]         = useState('TODAS');

  useEffect(() => {
    // Carrega status + metas em paralelo
    api.get('/onboarding/status')
      .then(({ data }) => {
        if (data.empresa) setEmpresa(data.empresa);
        return api.get('/metas/lista');
      })
      .then(({ data }) => setMetas(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = (configId) => {
    navigate(`/nova-meta?edit=${configId}`);
  };

  const logout = () => {
    localStorage.removeItem('auth_tokens');
    navigate('/login');
  };

  // Filtros
  const FILTROS = [
    { value: 'TODAS',        label: 'Todas'         },
    { value: 'AUMENTAR',     label: '📈 Aumentar'   },
    { value: 'REDUZIR',      label: '📉 Reduzir'    },
    { value: 'MODERADO',     label: 'Moderado'      },
    { value: 'INTERMEDIARIO',label: 'Intermediário' },
    { value: 'DESAFIADOR',   label: 'Desafiador'    },
    { value: 'ALAVANCADO',   label: 'Alavancado'    },
  ];

  const pressaoLabelMap = { '0.25': 'MODERADO', '0.5': 'INTERMEDIARIO', '0.50': 'INTERMEDIARIO', '0.75': 'DESAFIADOR', '1': 'ALAVANCADO', '1.00': 'ALAVANCADO' };

  const metasFiltradas = metas.filter(m => {
    if (filtro === 'TODAS') return true;
    if (filtro === 'AUMENTAR' || filtro === 'REDUZIR') return m.direcao === filtro;
    const pLabel = pressaoLabelMap[String(Number(m.nivel_pressao).toFixed(2))] || pressaoLabelMap[String(m.nivel_pressao)];
    return pLabel === filtro;
  });

  // Stats
  const totalMetas     = metas.length;
  const metasAumentar  = metas.filter(m => m.direcao === 'AUMENTAR').length;
  const metasReduzir   = metas.filter(m => m.direcao === 'REDUZIR').length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&family=Fira+Code:wght@400;500;700&display=swap');
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes fadeIn       { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeOverlay  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideModal   { from { opacity:0; transform:translate(-50%,-48%); } to { opacity:1; transform:translate(-50%,-50%); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: C.text, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
              Metas<span style={{ color: C.blueLight }}>Pro</span>
            </span>
            {empresa && (
              <span style={{ fontSize: 12, color: C.textDim, paddingLeft: 16, borderLeft: `1px solid ${C.border}` }}>
                {empresa.nome_fantasia || empresa.razao_social}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => navigate('/nova-meta')}
              style={{ padding: '7px 18px', background: `linear-gradient(135deg, ${C.blue}, #1e40af)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif", boxShadow: '0 2px 12px rgba(37,99,235,0.3)' }}
            >
              + Nova Meta
            </button>
            <button
              onClick={logout}
              style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMd, fontSize: 12, cursor: 'pointer' }}
            >
              Sair
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

          {/* ── Header da página ───────────────────────────────────────────── */}
          <div style={{ marginBottom: 28, animation: 'fadeIn 0.4s ease' }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: C.text, fontFamily: "'Sora', sans-serif" }}>
              Minhas Metas
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: C.textMd }}>
              Gerencie, visualize e recalcule suas metas com inteligência artificial
            </p>
          </div>

          {/* ── Cards de estatísticas ──────────────────────────────────────── */}
          {!loading && metas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28, animation: 'fadeIn 0.4s ease 0.1s both' }}>
              <StatCard label="Total de Metas" value={totalMetas} icon="🎯" color={C.blueLight} />
              <StatCard label="Metas de Crescimento" value={metasAumentar} icon="📈" color={C.greenLight} />
              <StatCard label="Metas de Redução" value={metasReduzir} icon="📉" color={C.amberLight} />
            </div>
          )}

          {/* ── Filtros ────────────────────────────────────────────────────── */}
          {!loading && metas.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', animation: 'fadeIn 0.4s ease 0.15s both' }}>
              {FILTROS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFiltro(f.value)}
                  style={{ padding: '6px 14px', background: filtro === f.value ? C.blueDim : 'transparent', border: `1px solid ${filtro === f.value ? C.blue : C.border}`, borderRadius: 20, color: filtro === f.value ? C.blueLight : C.textMd, fontSize: 12, fontWeight: filtro === f.value ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {f.label}
                </button>
              ))}
              {filtro !== 'TODAS' && (
                <span style={{ fontSize: 12, color: C.textDim, alignSelf: 'center', marginLeft: 4 }}>
                  {metasFiltradas.length} resultado{metasFiltradas.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* ── Conteúdo principal ─────────────────────────────────────────── */}
          {loading ? (
            <Spinner />
          ) : metas.length === 0 ? (
            <EmptyState onNew={() => navigate('/nova-meta')} />
          ) : metasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: C.textDim }}>
              <p style={{ fontSize: 14 }}>Nenhuma meta encontrada para este filtro.</p>
              <button onClick={() => setFiltro('TODAS')} style={{ marginTop: 12, padding: '8px 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMd, cursor: 'pointer', fontSize: 13 }}>
                Ver todas
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, animation: 'fadeIn 0.4s ease 0.2s both' }}>
              {metasFiltradas.map((meta, i) => (
                <div key={meta.config_id} style={{ animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                  <MetaCard
                    meta={meta}
                    onView={setSelected}
                    onEdit={handleEdit}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalhes */}
      {selectedMeta && (
        <MetaModal
          meta={selectedMeta}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
        />
      )}
    </>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}14`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 900, color: color, fontFamily: "'Fira Code', monospace" }}>{value}</p>
        <p style={{ margin: 0, fontSize: 12, color: C.textMd }}>{label}</p>
      </div>
    </div>
  );
}
