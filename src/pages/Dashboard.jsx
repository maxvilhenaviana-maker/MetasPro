// src/pages/Dashboard.jsx
// Dashboard principal — lista metas, navegação pela Navbar MetasPro
// Design: LIGHT — fundo branco, azul marinho + verde MetasPro
// ATUALIZADO: identidade visual padronizada com Login e Inicial

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { T, globalCSS } from '../theme';
import NavbarMetasPro from '../components/NavbarMetasPro';

// ─── Mapeamentos ──────────────────────────────────────────────────────────────
const PRESSAO_MAP = {
  '0.25': { label: 'Moderado',      color: T.green  },
  '0.50': { label: 'Intermediário', color: T.blue   },
  '0.75': { label: 'Desafiador',    color: T.amber  },
  '1.00': { label: 'Alavancado',    color: T.red    },
};

function getPressaoInfo(val) {
  const key = Number(val).toFixed(2);
  return PRESSAO_MAP[key] || { label: 'N/A', color: T.textDim };
}

function BadgeDirecao({ direcao }) {
  const up = direcao === 'AUMENTAR';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px',
      background: up ? T.greenDim : T.redDim,
      color: up ? T.green : T.red,
      borderRadius: 999, fontSize: 12, fontWeight: 700,
      fontFamily: T.fontDisplay,
    }}>
      {up ? '📈' : '📉'} {up ? 'Aumentar' : 'Reduzir'}
    </span>
  );
}

// ─── Card de Meta ─────────────────────────────────────────────────────────────
function MetaCard({ meta, onRecalcular }) {
  const pressao = getPressaoInfo(meta.nivel_pressao);
  return (
    <div style={{
      background: T.surface,
      border: `1.5px solid ${T.border}`,
      borderRadius: T.radiusLg,
      padding: '20px 22px',
      boxShadow: T.shadow,
      transition: T.transition,
      animation: 'fadeIn 0.3s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadowMd; e.currentTarget.style.borderColor = T.borderHi; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.borderColor = T.border; }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div>
          <h3 style={{
            fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 15,
            color: T.navy, margin: 0, lineHeight: 1.3,
          }}>
            {meta.nome_meta}
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: T.textDim, fontFamily: T.fontBody }}>
            {meta.nome_unidade || meta.unidade_id}
          </p>
        </div>
        <BadgeDirecao direcao={meta.direcao} />
      </div>

      {/* Valores */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10, marginBottom: 14,
      }}>
        {[
          { label: 'Meta',    value: meta.meta_final    != null ? Number(meta.meta_final).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—' },
          { label: 'Média',   value: meta.media_calculada != null ? Number(meta.media_calculada).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—' },
          { label: 'Pressão', value: pressao.label, color: pressao.color },
        ].map(item => (
          <div key={item.label} style={{
            background: T.bgAlt, borderRadius: T.radiusSm,
            padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.fontBody, marginBottom: 2 }}>
              {item.label}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: item.color || T.navy,
              fontFamily: T.fontDisplay,
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onRecalcular(meta.id)}
          style={{
            flex: 1, padding: '8px 0',
            background: `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`,
            border: 'none', borderRadius: T.radiusSm,
            color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: T.fontDisplay, cursor: 'pointer',
            transition: T.transition,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          ✏️ Recalcular
        </button>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [metas, setMetas]         = useState([]);
  const [empresa, setEmpresa]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState('TODAS');
  const [busca, setBusca]         = useState('');
  const [erro, setErro]           = useState('');

  useEffect(() => {
    const carregar = async () => {
      try {
        const [metasRes, statusRes] = await Promise.all([
          api.get('/metas'),
          api.get('/onboarding/status').catch(() => ({ data: {} })),
        ]);
        setMetas(Array.isArray(metasRes.data) ? metasRes.data : (metasRes.data.metas || []));
        if (statusRes.data?.empresa) setEmpresa(statusRes.data.empresa);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('auth_tokens');
          navigate('/login');
        } else {
          setErro('Erro ao carregar metas. Tente novamente.');
        }
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [navigate]);

  const FILTROS = [
    { value: 'TODAS',         label: 'Todas'         },
    { value: 'AUMENTAR',      label: '📈 Aumentar'   },
    { value: 'REDUZIR',       label: '📉 Reduzir'    },
    { value: 'MODERADO',      label: 'Moderado'      },
    { value: 'INTERMEDIARIO', label: 'Intermediário' },
    { value: 'DESAFIADOR',    label: 'Desafiador'    },
    { value: 'ALAVANCADO',    label: 'Alavancado'    },
  ];

  const pressaoLabelMap = {
    '0.25': 'MODERADO', '0.5': 'INTERMEDIARIO', '0.50': 'INTERMEDIARIO',
    '0.75': 'DESAFIADOR', '1': 'ALAVANCADO', '1.00': 'ALAVANCADO',
  };

  const metasFiltradas = metas
    .filter(m => {
      if (filtro === 'TODAS') return true;
      if (filtro === 'AUMENTAR' || filtro === 'REDUZIR') return m.direcao === filtro;
      const pLabel = pressaoLabelMap[String(Number(m.nivel_pressao).toFixed(2))] || pressaoLabelMap[String(m.nivel_pressao)];
      return pLabel === filtro;
    })
    .filter(m => !busca || m.nome_meta?.toLowerCase().includes(busca.toLowerCase()));

  return (
    <>
      <style>{globalCSS}</style>

      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontBody }}>

        {/* Navbar */}
        <NavbarMetasPro empresa={empresa} paginaAtiva="dashboard" />

        {/* Conteúdo */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>

          {/* Cabeçalho da página */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 24, flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <h1 style={{
                fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 24,
                color: T.navy, margin: 0,
              }}>
                📊 Dashboard de Metas
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: T.textDim }}>
                {metas.length} {metas.length === 1 ? 'meta cadastrada' : 'metas cadastradas'}
              </p>
            </div>
            <button
              onClick={() => navigate('/nova-meta')}
              style={{
                padding: '10px 22px',
                background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
                border: 'none', borderRadius: T.radius,
                color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: T.fontDisplay, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
                transition: T.transition,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              🎯 + Nova Meta
            </button>
          </div>

          {/* Stats rápidos */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12, marginBottom: 24,
          }}>
            {[
              { label: 'Total de Metas',  value: metas.length,                            color: T.navy,  icon: '🎯' },
              { label: 'Aumentar',        value: metas.filter(m => m.direcao==='AUMENTAR').length, color: T.green, icon: '📈' },
              { label: 'Reduzir',         value: metas.filter(m => m.direcao==='REDUZIR').length,  color: T.red,   icon: '📉' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: T.surface, borderRadius: T.radius,
                border: `1.5px solid ${T.border}`,
                padding: '16px 18px',
                boxShadow: T.shadow,
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 28, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.fontBody }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Filtros + busca */}
          <div style={{
            background: T.surface, borderRadius: T.radius,
            border: `1px solid ${T.border}`,
            padding: '14px 16px', marginBottom: 20,
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <input
              type="text"
              placeholder="🔍 Buscar meta..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                flex: '1 1 200px', padding: '8px 12px',
                background: T.bgAlt, border: `1.5px solid ${T.border}`,
                borderRadius: T.radiusSm, color: T.text, fontSize: 13,
                outline: 'none', fontFamily: T.fontBody,
              }}
              onFocus={e => e.target.style.borderColor = T.borderFocus}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTROS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFiltro(f.value)}
                  style={{
                    padding: '6px 12px',
                    background: filtro === f.value ? T.navy : T.bgAlt,
                    border: `1.5px solid ${filtro === f.value ? T.navy : T.border}`,
                    borderRadius: 999,
                    color: filtro === f.value ? '#fff' : T.textMd,
                    fontSize: 12, fontWeight: 600,
                    fontFamily: T.fontBody, cursor: 'pointer',
                    transition: T.transition,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div style={{
              background: T.redDim, border: `1px solid ${T.red}33`,
              borderRadius: T.radius, padding: '12px 16px',
              color: T.red, fontSize: 13, marginBottom: 20,
            }}>
              ⚠️ {erro}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                width: 36, height: 36,
                border: `3px solid ${T.border}`, borderTopColor: T.navy,
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: T.textDim, fontSize: 13 }}>Carregando metas...</p>
            </div>
          )}

          {/* Lista de metas */}
          {!loading && (
            <>
              {metasFiltradas.length === 0 ? (
                <div style={{
                  background: T.surface, borderRadius: T.radiusLg,
                  border: `1px solid ${T.border}`,
                  padding: '60px 24px', textAlign: 'center',
                  boxShadow: T.shadow,
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                  <h3 style={{ fontFamily: T.fontDisplay, color: T.navy, marginBottom: 8 }}>
                    {busca || filtro !== 'TODAS' ? 'Nenhuma meta encontrada' : 'Nenhuma meta cadastrada ainda'}
                  </h3>
                  <p style={{ color: T.textDim, fontSize: 13, marginBottom: 24 }}>
                    {busca || filtro !== 'TODAS'
                      ? 'Tente ajustar os filtros de busca.'
                      : 'Crie sua primeira meta para começar a gerenciar resultados.'}
                  </p>
                  {!busca && filtro === 'TODAS' && (
                    <button
                      onClick={() => navigate('/nova-meta')}
                      style={{
                        padding: '10px 24px',
                        background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
                        border: 'none', borderRadius: T.radius,
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        fontFamily: T.fontDisplay, cursor: 'pointer',
                      }}
                    >
                      + Criar Primeira Meta
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 16,
                }}>
                  {metasFiltradas.map(meta => (
                    <MetaCard
                      key={meta.id}
                      meta={meta}
                      onRecalcular={(id) => navigate(`/nova-meta?edit=${id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
