// src/components/BannerSelecionarUnidade.jsx
// Banner exibido no topo das páginas quando o usuário ainda não selecionou
// a unidade de monitoramento ativa. Inclui modal de seleção inline.

import React, { useState } from 'react';
import { T } from '../theme';
import { useSession } from '../contexts/SessionContext';

export default function BannerSelecionarUnidade() {
  const { unidade, unidadesDisponiveis, selecionarUnidade, carregarUnidades, empresa } = useSession();
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Não exibe se já tem unidade selecionada
  if (unidade) return null;
  // Não exibe se não há empresa ainda
  if (!empresa) return null;

  const abrirModal = async () => {
    setCarregando(true);
    await carregarUnidades(empresa.id);
    setCarregando(false);
    setModalAberto(true);
  };

  const handleSelecionar = (u) => {
    selecionarUnidade(u);
    setModalAberto(false);
  };

  return (
    <>
      {/* ── Banner sticky ── */}
      <div style={{
        background: `linear-gradient(135deg, ${T.amber}, ${T.amberLight})`,
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏭</span>
          <div>
            <div style={{
              fontFamily: T.fontDisplay, fontWeight: 700,
              fontSize: 13, color: '#451a03',
            }}>
              Unidade de Monitoramento não selecionada
            </div>
            <div style={{ fontSize: 12, color: '#78350f' }}>
              Selecione a unidade para acessar metas, resultados e lançamentos.
            </div>
          </div>
        </div>

        <button
          onClick={abrirModal}
          disabled={carregando}
          style={{
            padding: '8px 18px',
            background: '#451a03',
            color: '#fef3c7',
            border: 'none',
            borderRadius: T.radiusSm,
            fontFamily: T.fontDisplay,
            fontWeight: 700, fontSize: 12,
            cursor: carregando ? 'not-allowed' : 'pointer',
            transition: T.transition,
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!carregando) e.currentTarget.style.background = '#78350f'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#451a03'; }}
        >
          {carregando
            ? <><Spinner /> Carregando...</>
            : <>🏭 Selecionar Unidade</>
          }
        </button>
      </div>

      {/* ── Modal de seleção ── */}
      {modalAberto && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,45,82,0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px',
          animation: 'fadeIn 0.2s ease',
        }}
          onClick={() => setModalAberto(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: T.surface,
              borderRadius: T.radiusXl,
              border: `1px solid ${T.border}`,
              boxShadow: T.shadowLg,
              width: '100%', maxWidth: 440,
              padding: '32px 28px',
              animation: 'fadeIn 0.25s ease',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: T.amberDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, margin: '0 auto 12px',
              }}>
                🏭
              </div>
              <h2 style={{
                fontFamily: T.fontDisplay, fontWeight: 800,
                fontSize: 18, color: T.navy, margin: '0 0 6px',
              }}>
                Selecione a Unidade
              </h2>
              <p style={{ fontSize: 13, color: T.textMd, margin: 0 }}>
                Em qual unidade você está atuando agora?
              </p>
            </div>

            {/* Lista de unidades */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unidadesDisponiveis.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '24px',
                  color: T.textDim, fontSize: 13,
                }}>
                  Nenhuma unidade disponível para esta empresa.
                </div>
              ) : (
                unidadesDisponiveis.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSelecionar(u)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: T.surface,
                      border: `1.5px solid ${T.border}`,
                      borderRadius: T.radius,
                      cursor: 'pointer',
                      transition: T.transition,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = T.amber;
                      e.currentTarget.style.background = T.amberDim;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = T.border;
                      e.currentTarget.style.background = T.surface;
                    }}
                  >
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: T.radiusSm,
                      background: T.amberDim,
                      border: `1px solid ${T.amberLight}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      🏭
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: T.fontDisplay, fontWeight: 700,
                        fontSize: 14, color: T.navy,
                      }}>
                        {u.nome_unidade}
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim }}>
                        {u.codigo_unidade}
                      </div>
                    </div>
                    <div style={{ color: T.textDim, fontSize: 16 }}>›</div>
                  </button>
                ))
              )}
            </div>

            {/* Botão fechar */}
            <button
              onClick={() => setModalAberto(false)}
              style={{
                width: '100%', marginTop: 16,
                padding: '10px',
                background: 'transparent',
                border: `1.5px solid ${T.border}`,
                borderRadius: T.radiusSm,
                color: T.textMd, fontSize: 13,
                cursor: 'pointer', transition: T.transition,
                fontFamily: T.fontBody,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHi; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
            >
              Depois
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 12, height: 12,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
