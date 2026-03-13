// src/components/ModalSelecionarEmpresa.jsx
// Modal obrigatório — exibido no login quando o usuário pertence a múltiplas empresas.
// Não pode ser fechado sem fazer uma escolha.

import React from 'react';
import { T, globalCSS } from '../theme';

// Ícone de empresa por papel
const PAPEL_INFO = {
  ADMIN: { label: 'Administrador', cor: T.navy, bg: T.navyDim, icone: '🛡️' },
  DESIGNADO_CONFIGURADOR: { label: 'Configurador', cor: T.blue, bg: T.blueDim, icone: '⚙️' },
  DESIGNADO_LANCADOR: { label: 'Lançador', cor: T.green, bg: T.greenDim, icone: '📊' },
};

export default function ModalSelecionarEmpresa({ empresas = [], onSelecionar, carregando }) {
  return (
    <>
      <style>{globalCSS}</style>

      {/* Overlay — sem clique para fechar */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,45,82,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn 0.25s ease',
      }}>
        <div style={{
          background: T.surface,
          borderRadius: T.radiusXl,
          border: `1px solid ${T.border}`,
          boxShadow: T.shadowLg,
          width: '100%',
          maxWidth: 480,
          padding: '36px 32px',
          animation: 'fadeIn 0.3s ease',
        }}>
          {/* Cabeçalho */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: T.navyDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, margin: '0 auto 14px',
            }}>
              🏢
            </div>
            <h2 style={{
              fontFamily: T.fontDisplay, fontWeight: 800,
              fontSize: 20, color: T.navy, margin: '0 0 8px',
            }}>
              Selecione a Empresa
            </h2>
            <p style={{ fontSize: 13, color: T.textMd, margin: 0, lineHeight: 1.6 }}>
              Seu acesso está vinculado a mais de uma empresa.<br />
              Escolha em qual você deseja atuar nesta sessão.
            </p>
          </div>

          {/* Lista de empresas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {empresas.map((emp) => {
              const pInfo = PAPEL_INFO[emp.papel] || PAPEL_INFO.DESIGNADO_LANCADOR;
              return (
                <button
                  key={emp.id}
                  onClick={() => !carregando && onSelecionar(emp)}
                  disabled={carregando}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    background: T.surface,
                    border: `1.5px solid ${T.border}`,
                    borderRadius: T.radius,
                    cursor: carregando ? 'not-allowed' : 'pointer',
                    transition: T.transition,
                    textAlign: 'left',
                    opacity: carregando ? 0.7 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!carregando) {
                      e.currentTarget.style.borderColor = T.navy;
                      e.currentTarget.style.background = T.navyDim;
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.background = T.surface;
                  }}
                >
                  {/* Avatar empresa */}
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: T.radiusSm,
                    background: T.bgAlt,
                    border: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    🏢
                  </div>

                  {/* Info empresa */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.fontDisplay, fontWeight: 700,
                      fontSize: 14, color: T.navy,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {emp.nome_fantasia || emp.razao_social}
                    </div>
                    {emp.nome_fantasia && emp.razao_social && emp.nome_fantasia !== emp.razao_social && (
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>
                        {emp.razao_social}
                      </div>
                    )}
                  </div>

                  {/* Badge papel */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px',
                    background: pInfo.bg,
                    borderRadius: 20,
                    fontSize: 11, fontWeight: 700,
                    color: pInfo.cor,
                    flexShrink: 0,
                  }}>
                    <span>{pInfo.icone}</span>
                    <span>{pInfo.label}</span>
                  </div>

                  {/* Seta */}
                  <div style={{ color: T.textDim, fontSize: 16, flexShrink: 0 }}>›</div>
                </button>
              );
            })}
          </div>

          {/* Rodapé informativo */}
          <p style={{
            textAlign: 'center', fontSize: 11,
            color: T.textDim, marginTop: 20, marginBottom: 0,
            lineHeight: 1.6,
          }}>
            Você poderá trocar de empresa a qualquer momento<br />fazendo logout e entrando novamente.
          </p>
        </div>
      </div>
    </>
  );
}
