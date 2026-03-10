// src/pages/Inicial.jsx
// Tela Principal — MetasPro
// Design: clean, fundo branco, logomarca centralizada, menus suspensos responsivos
// Acessada imediatamente após o login

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, globalCSS } from '../theme';
import api from '../services/api';

// ─── Ícones SVG ───────────────────────────────────────────────────────────────
const ChevronDown = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

// ─── Estrutura de Menus ───────────────────────────────────────────────────────
const SUBACOES = [
  { label: 'Consultar', icon: '🔍' },
  { label: 'Incluir',   icon: '➕' },
  { label: 'Alterar',   icon: '✏️'  },
  { label: 'Excluir',   icon: '🗑️' },
];

const MENU_ESTRUTURA = [
  {
    id: 'inicio',
    label: 'Página Inicial',
    icon: '🏠',
    subs: [
      { id: 'usuarios',      label: 'Usuários',                 icon: '👤', path: '/usuarios'      },
      { id: 'empresas',      label: 'Empresas',                 icon: '🏢', path: '/empresas'      },
      { id: 'unidades',      label: 'Unidades de Monitoramento',icon: '🏭', path: '/unidades'      },
      { id: 'metas',         label: 'Metas',                    icon: '🎯', path: '/nova-meta'     },
      { id: 'historico',     label: 'Histórico',                icon: '📈', path: '/historico'     },
      { id: 'resultados',    label: 'Resultados',               icon: '📊', path: '/resultados'    },
      { id: 'justificativas',label: 'Justificativas',           icon: '📝', path: '/justificativas'},
      { id: 'termo',         label: 'Termo de Compromisso',     icon: '📄', path: '/termo'         },
    ],
  },
  {
    id: 'opcoes',
    label: 'Opções e Configurações',
    icon: '⚙️',
    subs: [
      { id: 'pacotes',    label: 'Pacotes de Assinatura', icon: '📦', path: '/pacotes',    noAcoes: true },
      { id: 'saldo',      label: 'Saldo',                 icon: '💰', path: '/saldo',      noAcoes: true },
      { id: 'financeiro', label: 'Financeiro',            icon: '💳', path: '/financeiro', noAcoes: true },
      { id: 'outros',     label: 'Outros',                icon: '🔧', path: '/outros',     noAcoes: true },
    ],
  },
  {
    id: 'sobre',
    label: 'Sobre',
    icon: 'ℹ️',
    subs: [
      { id: 'quem-somos', label: 'Quem Somos', icon: '🏅', path: '/quem-somos', noAcoes: true },
      { id: 'conceitos',  label: 'Conceitos',  icon: '💡', path: '/conceitos',  noAcoes: true },
      { id: 'contato',    label: 'Contato',    icon: '📞', path: '/contato',    noAcoes: true },
    ],
  },
];

// ─── Componente de Menu Suspenso ──────────────────────────────────────────────
function MenuDropdown({ item, isOpen, onToggle, onClose }) {
  const navigate = useNavigate();
  const [activeSub, setActiveSub] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) setActiveSub(null);
  }, [isOpen]);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, onClose]);

  const handleSubClick = (sub) => {
    if (sub.noAcoes) {
      navigate(sub.path);
      onClose();
      return;
    }
    setActiveSub(activeSub === sub.id ? null : sub.id);
  };

  const handleAcao = (sub, acao) => {
    // Roteamento com ação como query param
    navigate(`${sub.path}?acao=${acao.label.toLowerCase()}`);
    onClose();
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Botão do menu principal */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px',
          background: isOpen ? T.navy : 'transparent',
          color: isOpen ? '#fff' : T.navy,
          border: `1.5px solid ${isOpen ? T.navy : T.border}`,
          borderRadius: T.radiusSm,
          fontSize: 14, fontWeight: 600,
          fontFamily: T.fontDisplay,
          cursor: 'pointer',
          transition: T.transition,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = T.navyDim; e.currentTarget.style.borderColor = T.navy; } }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.border; } }}
      >
        <span>{item.icon}</span>
        <span>{item.label}</span>
        <span style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', color: isOpen ? '#fff' : T.textMd }}>
          <ChevronDown />
        </span>
      </button>

      {/* Painel suspenso */}
      {isOpen && (
        <div
          className="mp-slide-down"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            boxShadow: T.shadowLg,
            minWidth: 260,
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {/* Cabeçalho do painel */}
          <div style={{
            padding: '12px 16px',
            background: T.navy,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: T.fontDisplay,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {item.icon} {item.label}
          </div>

          {/* Itens do submenu */}
          <div style={{ padding: '8px' }}>
            {item.subs.map((sub) => (
              <div key={sub.id}>
                {/* Item principal */}
                <button
                  onClick={() => handleSubClick(sub)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px',
                    background: activeSub === sub.id ? T.navyDim : 'transparent',
                    border: 'none',
                    borderRadius: T.radiusSm,
                    color: T.text,
                    fontSize: 14, fontWeight: 500,
                    fontFamily: T.fontBody,
                    cursor: 'pointer',
                    transition: T.transition,
                  }}
                  onMouseEnter={e => { if (activeSub !== sub.id) e.currentTarget.style.background = T.bgAlt; }}
                  onMouseLeave={e => { if (activeSub !== sub.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{sub.icon}</span>
                    <span>{sub.label}</span>
                  </span>
                  {!sub.noAcoes && (
                    <span style={{ transition: 'transform 0.2s', transform: activeSub === sub.id ? 'rotate(180deg)' : 'none', color: T.textDim }}>
                      <ChevronDown />
                    </span>
                  )}
                </button>

                {/* Sub-ações (Consultar, Incluir, Alterar, Excluir) */}
                {activeSub === sub.id && !sub.noAcoes && (
                  <div className="mp-slide-down" style={{ padding: '4px 8px 8px 32px' }}>
                    {SUBACOES.map((acao) => (
                      <button
                        key={acao.label}
                        onClick={() => handleAcao(sub, acao)}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 10px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: T.radiusSm,
                          color: T.textMd,
                          fontSize: 13, fontWeight: 500,
                          fontFamily: T.fontBody,
                          cursor: 'pointer',
                          transition: T.transition,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.greenDim; e.currentTarget.style.color = T.green; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMd; }}
                      >
                        <span>{acao.icon}</span>
                        <span>{acao.label}</span>
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

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Inicial() {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState(null);
  const [mobileSubSub, setMobileSubSub] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_tokens');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.user) setUsuario(p.user);
      }
    } catch {}

    // Busca empresa se disponível
    api.get('/onboarding/status').then(({ data }) => {
      if (data?.empresa) setEmpresa(data.empresa);
    }).catch(() => {});
  }, []);

  const logout = () => {
    localStorage.removeItem('auth_tokens');
    navigate('/login');
  };

  const toggleMenu = (id) => setOpenMenu(prev => prev === id ? null : id);

  return (
    <>
      <style>{globalCSS}</style>

      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>

        {/* ── BARRA DE NAVEGAÇÃO ───────────────────────────────────────────── */}
        <nav style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          boxShadow: T.shadowNav,
          position: 'sticky', top: 0, zIndex: 100,
          padding: '0 24px',
        }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 64,
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="/Logo_MetasPro.jpg"
                alt="MetasPro"
                style={{ height: 38, width: 'auto', borderRadius: 6 }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 18, color: T.navy, lineHeight: 1 }}>
                  Metas<span style={{ color: T.green }}>Pro</span>
                </div>
                {empresa && (
                  <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontBody, lineHeight: 1.2, marginTop: 1 }}>
                    {empresa.nome_fantasia || empresa.razao_social}
                  </div>
                )}
              </div>
            </div>

            {/* Menus desktop */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              className="desktop-nav">
              {MENU_ESTRUTURA.map(item => (
                <MenuDropdown
                  key={item.id}
                  item={item}
                  isOpen={openMenu === item.id}
                  onToggle={() => toggleMenu(item.id)}
                  onClose={() => setOpenMenu(null)}
                />
              ))}
            </div>

            {/* Usuário + logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Botão hamburguer mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  display: 'none',
                  background: 'transparent',
                  border: `1.5px solid ${T.border}`,
                  borderRadius: T.radiusSm,
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: T.navy,
                }}
                id="hamburger-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  {mobileMenuOpen
                    ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                    : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                  }
                </svg>
              </button>

              {usuario && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: T.textMd, fontFamily: T.fontBody,
                }}>
                  <IconUser />
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {usuario.nome || usuario.name || usuario.email}
                  </span>
                </span>
              )}

              <button
                onClick={logout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  background: 'transparent',
                  border: `1.5px solid ${T.border}`,
                  borderRadius: T.radiusSm,
                  color: T.textMd, fontSize: 13,
                  cursor: 'pointer',
                  transition: T.transition,
                  fontFamily: T.fontBody,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.color = T.red; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMd; }}
              >
                <IconLogout />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </nav>

        {/* ── MENU MOBILE (drawer) ─────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div style={{
            background: T.surface,
            borderBottom: `1px solid ${T.border}`,
            boxShadow: T.shadowMd,
          }}>
            {MENU_ESTRUTURA.map(item => (
              <div key={item.id}>
                <button
                  onClick={() => setMobileSub(mobileSub === item.id ? null : item.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 24px',
                    background: mobileSub === item.id ? T.navyDim : 'transparent',
                    border: 'none',
                    borderTop: `1px solid ${T.border}`,
                    color: T.navy, fontSize: 15, fontWeight: 600,
                    fontFamily: T.fontDisplay,
                    cursor: 'pointer',
                  }}
                >
                  <span>{item.icon} {item.label}</span>
                  <span style={{ transform: mobileSub === item.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <ChevronDown size={16} />
                  </span>
                </button>
                {mobileSub === item.id && (
                  <div style={{ paddingLeft: 16 }}>
                    {item.subs.map(sub => (
                      <div key={sub.id}>
                        <button
                          onClick={() => {
                            if (sub.noAcoes) { navigate(sub.path); setMobileMenuOpen(false); return; }
                            setMobileSubSub(mobileSubSub === sub.id ? null : sub.id);
                          }}
                          style={{
                            width: '100%', textAlign: 'left',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '11px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderTop: `1px solid ${T.border}`,
                            color: T.textMd, fontSize: 14, fontWeight: 500,
                            fontFamily: T.fontBody,
                            cursor: 'pointer',
                          }}
                        >
                          <span>{sub.icon} {sub.label}</span>
                          {!sub.noAcoes && <ChevronDown size={13} />}
                        </button>
                        {mobileSubSub === sub.id && !sub.noAcoes && (
                          <div style={{ paddingLeft: 16 }}>
                            {SUBACOES.map(acao => (
                              <button
                                key={acao.label}
                                onClick={() => {
                                  navigate(`${sub.path}?acao=${acao.label.toLowerCase()}`);
                                  setMobileMenuOpen(false);
                                }}
                                style={{
                                  width: '100%', textAlign: 'left',
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '10px 24px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderTop: `1px solid ${T.border}`,
                                  color: T.green, fontSize: 13, fontWeight: 500,
                                  fontFamily: T.fontBody, cursor: 'pointer',
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

        {/* ── CONTEÚDO PRINCIPAL ───────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px',
        }}>
          <div className="mp-fade-in" style={{ textAlign: 'center', maxWidth: 560 }}>

            {/* Logomarca grande */}
            <div style={{ marginBottom: 32 }}>
              <img
                src="/Logo_MetasPro.jpg"
                alt="MetasPro"
                style={{
                  height: 'auto', width: '100%', maxWidth: 320,
                  borderRadius: 16,
                  boxShadow: T.shadowMd,
                }}
                onError={e => {
                  e.target.style.display = 'none';
                  document.getElementById('logo-fallback').style.display = 'block';
                }}
              />
              <div id="logo-fallback" style={{ display: 'none' }}>
                <h1 style={{
                  fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 52, color: T.navy,
                  letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  Metas<span style={{ color: T.green }}>Pro</span>
                </h1>
              </div>
            </div>

            <p style={{
              fontSize: 16, color: T.textMd, fontFamily: T.fontBody,
              lineHeight: 1.7, marginBottom: 40,
            }}>
              Criando Metas · Gerenciando Resultados
            </p>

            {/* Cards de acesso rápido */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12, marginBottom: 40,
            }}>
              {[
                { label: 'Minhas Metas',   icon: '🎯', path: '/nova-meta',  color: T.green   },
                { label: 'Dashboard',      icon: '📊', path: '/dashboard',  color: T.blue    },
                { label: 'Resultados',     icon: '📈', path: '/resultados?acao=consultar', color: T.amber },
                { label: 'Novo Sandbox',   icon: '🧪', path: '/sandbox',    color: T.navyLight },
              ].map(card => (
                <button
                  key={card.label}
                  onClick={() => navigate(card.path)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '20px 12px',
                    background: T.surface,
                    border: `1.5px solid ${T.border}`,
                    borderRadius: T.radiusLg,
                    cursor: 'pointer',
                    transition: T.transition,
                    boxShadow: T.shadow,
                    fontFamily: T.fontBody,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = card.color;
                    e.currentTarget.style.boxShadow = `0 4px 16px ${card.color}22`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.boxShadow = T.shadow;
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: 28 }}>{card.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{card.label}</span>
                </button>
              ))}
            </div>

            {/* Dica de uso */}
            <p style={{ fontSize: 12, color: T.textDim, fontFamily: T.fontBody }}>
              Use os menus acima para navegar · Versão PWA instalável
            </p>
          </div>
        </main>

        {/* ── RODAPÉ ──────────────────────────────────────────────────────── */}
        <footer style={{
          borderTop: `1px solid ${T.border}`,
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: 11,
          color: T.textDim,
          fontFamily: T.fontBody,
          background: T.surface,
        }}>
          MetasPro © {new Date().getFullYear()} · Criando Metas · Gerenciando Resultados
        </footer>
      </div>

      {/* Responsividade via style tag */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          #hamburger-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          #hamburger-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
