// src/components/NavbarMetasPro.jsx
// Navbar reutilizável — aparece em TODAS as telas internas
// Design: clean, fundo branco, azul marinho + verde MetasPro
// Inclui menus suspensos completos e responsividade mobile

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { T } from '../theme';

// ─── Ícones SVG ───────────────────────────────────────────────────────────────
const ChevronDown = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Estrutura de Menus (idêntica à Inicial.jsx) ──────────────────────────────
const SUBACOES = [
  { label: 'Consultar', icon: '🔍' },
  { label: 'Incluir',   icon: '➕' },
  { label: 'Alterar',   icon: '✏️'  },
  { label: 'Excluir',   icon: '🗑️' },
];

const MENU_ESTRUTURA = [
  {
    id: 'inicio', label: 'Página Inicial', icon: '🏠',
    subs: [
      { id: 'usuarios',      label: 'Usuários',                  icon: '👤', path: '/usuarios'       },
      { id: 'empresas',      label: 'Empresas',                  icon: '🏢', path: '/empresas'       },
      { id: 'unidades',      label: 'Unidades de Monitoramento', icon: '🏭', path: '/unidades'       },
      { id: 'metas',         label: 'Metas',                     icon: '🎯', path: '/nova-meta'      },
      { id: 'historico',     label: 'Histórico',                 icon: '📈', path: '/historico'      },
      { id: 'resultados',    label: 'Resultados',                icon: '📊', path: '/resultados'     },
      { id: 'justificativas',label: 'Justificativas',            icon: '📝', path: '/justificativas' },
      { id: 'termo',         label: 'Termo de Compromisso',      icon: '📄', path: '/termo'          },
    ],
  },
  {
    id: 'opcoes', label: 'Opções e Configurações', icon: '⚙️',
    subs: [
      { id: 'pacotes',    label: 'Pacotes de Assinatura', icon: '📦', path: '/pacotes',    noAcoes: true },
      { id: 'saldo',      label: 'Saldo',                 icon: '💰', path: '/saldo',      noAcoes: true },
      { id: 'financeiro', label: 'Financeiro',            icon: '💳', path: '/financeiro', noAcoes: true },
      { id: 'outros',     label: 'Outras Config.',        icon: '🔧', path: '/outros',     noAcoes: true },
    ],
  },
  {
    id: 'sobre', label: 'Sobre', icon: 'ℹ️',
    subs: [
      { id: 'quem-somos', label: 'Quem Somos', icon: '🏅', path: '/quem-somos', noAcoes: true },
      { id: 'conceitos',  label: 'Conceitos',  icon: '💡', path: '/conceitos',  noAcoes: true },
      { id: 'contato',    label: 'Contato',    icon: '📞', path: '/contato',    noAcoes: true },
    ],
  },
];

// ─── Menu Dropdown ────────────────────────────────────────────────────────────
function Dropdown({ item, isOpen, onToggle, onClose }) {
  const navigate = useNavigate();
  const [activeSub, setActiveSub] = useState(null);
  const ref = useRef(null);

  useEffect(() => { if (!isOpen) setActiveSub(null); }, [isOpen]);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    if (isOpen) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 13px',
          background: isOpen ? T.navy : 'transparent',
          color: isOpen ? '#fff' : T.navy,
          border: `1.5px solid ${isOpen ? T.navy : T.border}`,
          borderRadius: T.radiusSm,
          fontSize: 13, fontWeight: 600, fontFamily: T.fontDisplay,
          cursor: 'pointer', transition: T.transition, whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = T.navyDim; e.currentTarget.style.borderColor = T.navy; } }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.border; } }}
      >
        <span>{item.icon}</span>
        <span>{item.label}</span>
        <span style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', opacity: 0.7 }}>
          <ChevronDown />
        </span>
      </button>

      {isOpen && (
        <div className="mp-slide-down" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: T.radiusLg, boxShadow: T.shadowLg,
          minWidth: 240, zIndex: 300, overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px', background: T.navy,
            color: '#fff', fontSize: 11, fontWeight: 700,
            fontFamily: T.fontDisplay, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {item.icon} {item.label}
          </div>

          <div style={{ padding: '6px' }}>
            {item.subs.map(sub => (
              <div key={sub.id}>
                <button
                  onClick={() => {
                    if (sub.noAcoes) { navigate(sub.path); onClose(); return; }
                    setActiveSub(activeSub === sub.id ? null : sub.id);
                  }}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: activeSub === sub.id ? T.navyDim : 'transparent',
                    border: 'none', borderRadius: T.radiusSm,
                    color: T.text, fontSize: 13, fontWeight: 500, fontFamily: T.fontBody,
                    cursor: 'pointer', transition: T.transition,
                  }}
                  onMouseEnter={e => { if (activeSub !== sub.id) e.currentTarget.style.background = T.bgAlt; }}
                  onMouseLeave={e => { if (activeSub !== sub.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{sub.icon}</span><span>{sub.label}</span>
                  </span>
                  {!sub.noAcoes && (
                    <span style={{ transition: 'transform 0.2s', transform: activeSub === sub.id ? 'rotate(180deg)' : 'none', opacity: 0.5 }}>
                      <ChevronDown />
                    </span>
                  )}
                </button>

                {activeSub === sub.id && !sub.noAcoes && (
                  <div className="mp-slide-down" style={{ padding: '2px 6px 6px 28px' }}>
                    {SUBACOES.map(acao => (
                      <button
                        key={acao.label}
                        onClick={() => { navigate(`${sub.path}?acao=${acao.label.toLowerCase()}`); onClose(); }}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px',
                          background: 'transparent', border: 'none',
                          borderRadius: T.radiusSm,
                          color: T.textMd, fontSize: 12, fontWeight: 500, fontFamily: T.fontBody,
                          cursor: 'pointer', transition: T.transition,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.greenDim; e.currentTarget.style.color = T.green; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMd; }}
                      >
                        <span>{acao.icon}</span><span>{acao.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Navbar Principal ─────────────────────────────────────────────────────────
export default function NavbarMetasPro({ empresa }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState(null);
  const [mobileSubSub, setMobileSubSub] = useState(null);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_tokens');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.user) setUsuario(p.user);
      }
    } catch {}
  }, []);

  const logout = () => {
    localStorage.removeItem('auth_tokens');
    navigate('/login');
  };

  return (
    <>
      <nav style={{
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        boxShadow: T.shadowNav,
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 20px',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60, gap: 12,
        }}>
          {/* Logo / voltar ao Inicial */}
          <button
            onClick={() => navigate('/inicial')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '4px 0', flexShrink: 0,
            }}
          >
            <img
              src="/Logo_MetasPro.jpg" alt="MetasPro"
              style={{ height: 32, width: 'auto', borderRadius: 6 }}
              onError={e => e.target.style.display = 'none'}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 16, color: T.navy, lineHeight: 1 }}>
                Metas<span style={{ color: T.green }}>Pro</span>
              </div>
              {empresa && (
                <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontBody, lineHeight: 1.2 }}>
                  {empresa.nome_fantasia || empresa.razao_social}
                </div>
              )}
            </div>
          </button>

          {/* Menus desktop */}
          <div
            id="desktop-nav-menus"
            style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, justifyContent: 'center' }}
          >
            {MENU_ESTRUTURA.map(item => (
              <Dropdown
                key={item.id}
                item={item}
                isOpen={openMenu === item.id}
                onToggle={() => setOpenMenu(prev => prev === item.id ? null : item.id)}
                onClose={() => setOpenMenu(null)}
              />
            ))}
          </div>

          {/* Usuário + Logout + Hamburguer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Usuário desktop */}
            {usuario && (
              <span
                id="usuario-label"
                style={{ fontSize: 12, color: T.textMd, fontFamily: T.fontBody, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {usuario.nome || usuario.name || usuario.email}
              </span>
            )}

            <button
              onClick={logout}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px',
                background: 'transparent',
                border: `1.5px solid ${T.border}`,
                borderRadius: T.radiusSm,
                color: T.textMd, fontSize: 12, cursor: 'pointer',
                transition: T.transition, fontFamily: T.fontBody,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.color = T.red; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMd; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span id="sair-label">Sair</span>
            </button>

            {/* Hamburguer */}
            <button
              id="hamburger-mp"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'transparent', border: `1.5px solid ${T.border}`,
                borderRadius: T.radiusSm, padding: '6px',
                cursor: 'pointer', color: T.navy, alignItems: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                {mobileOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Menu mobile */}
      {mobileOpen && (
        <div style={{
          background: T.surface, borderBottom: `1px solid ${T.border}`,
          boxShadow: T.shadowMd,
        }}>
          {MENU_ESTRUTURA.map(item => (
            <div key={item.id}>
              <button
                onClick={() => setMobileSub(mobileSub === item.id ? null : item.id)}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 20px',
                  background: mobileSub === item.id ? T.navyDim : 'transparent',
                  border: 'none', borderTop: `1px solid ${T.border}`,
                  color: T.navy, fontSize: 14, fontWeight: 600, fontFamily: T.fontDisplay,
                  cursor: 'pointer',
                }}
              >
                <span>{item.icon} {item.label}</span>
                <span style={{ transform: mobileSub === item.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <ChevronDown size={15} />
                </span>
              </button>

              {mobileSub === item.id && (
                <div style={{ paddingLeft: 12 }}>
                  {item.subs.map(sub => (
                    <div key={sub.id}>
                      <button
                        onClick={() => {
                          if (sub.noAcoes) { navigate(sub.path); setMobileOpen(false); return; }
                          setMobileSubSub(mobileSubSub === sub.id ? null : sub.id);
                        }}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 20px',
                          background: 'transparent', border: 'none',
                          borderTop: `1px solid ${T.border}`,
                          color: T.textMd, fontSize: 13, fontWeight: 500, fontFamily: T.fontBody,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{sub.icon} {sub.label}</span>
                        {!sub.noAcoes && <ChevronDown size={13} />}
                      </button>

                      {mobileSubSub === sub.id && !sub.noAcoes && (
                        <div style={{ paddingLeft: 12 }}>
                          {SUBACOES.map(acao => (
                            <button
                              key={acao.label}
                              onClick={() => { navigate(`${sub.path}?acao=${acao.label.toLowerCase()}`); setMobileOpen(false); }}
                              style={{
                                width: '100%', textAlign: 'left',
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '9px 20px',
                                background: 'transparent', border: 'none',
                                borderTop: `1px solid ${T.border}`,
                                color: T.green, fontSize: 13, fontWeight: 500, fontFamily: T.fontBody,
                                cursor: 'pointer',
                              }}
                            >
                              {acao.icon} {acao.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Responsividade */}
      <style>{`
        @media (max-width: 768px) {
          #desktop-nav-menus { display: none !important; }
          #hamburger-mp { display: flex !important; }
          #usuario-label { display: none !important; }
          #sair-label { display: none; }
        }
        @media (min-width: 769px) {
          #hamburger-mp { display: none !important; }
        }
      `}</style>
    </>
  );
}
