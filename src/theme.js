// src/theme.js
// Design System Centralizado — MetasPro
// Paleta: Branco/Cinza claro + Azul Marinho + Verde MetasPro
// Use este arquivo em TODOS os componentes para garantir identidade visual unificada

export const T = {
  // ── Cores de fundo ──────────────────────────────────────────────────────────
  bg:          '#f8fafc',        // fundo principal (quase branco)
  bgAlt:       '#f1f5f9',        // fundo alternado (cards, linhas pares)
  surface:     '#ffffff',        // cards, modais, painéis
  surfaceHover:'#f0f7ff',        // hover de cards

  // ── Cores primárias ─────────────────────────────────────────────────────────
  navy:        '#0f2d52',        // azul marinho principal
  navyLight:   '#1a4a7a',        // azul marinho claro
  navyDim:     'rgba(15,45,82,0.08)',

  blue:        '#1d6fb8',        // azul médio (links, botões secundários)
  blueLight:   '#3b8fd4',
  blueDim:     'rgba(29,111,184,0.10)',

  green:       '#16a34a',        // verde MetasPro principal
  greenLight:  '#22c55e',
  greenDark:   '#15803d',
  greenDim:    'rgba(22,163,74,0.10)',

  // ── Cores de apoio ───────────────────────────────────────────────────────────
  amber:       '#d97706',
  amberLight:  '#fbbf24',
  amberDim:    'rgba(217,119,6,0.10)',

  red:         '#dc2626',
  redLight:    '#ef4444',
  redDim:      'rgba(220,38,38,0.08)',

  whatsapp:    '#25d366',
  whatsappDim: 'rgba(37,211,102,0.10)',

  // ── Tipografia ───────────────────────────────────────────────────────────────
  text:        '#0f2d52',        // texto principal (azul marinho)
  textMd:      '#475569',        // texto médio
  textDim:     '#94a3b8',        // texto apagado
  textLight:   '#cbd5e1',        // texto muito claro

  // ── Bordas ───────────────────────────────────────────────────────────────────
  border:      '#e2e8f0',        // borda padrão
  borderHi:    '#cbd5e1',        // borda realçada
  borderFocus: '#1d6fb8',        // borda em foco

  // ── Sombras ──────────────────────────────────────────────────────────────────
  shadow:      '0 1px 4px rgba(15,45,82,0.08), 0 4px 16px rgba(15,45,82,0.06)',
  shadowMd:    '0 4px 16px rgba(15,45,82,0.12), 0 8px 32px rgba(15,45,82,0.08)',
  shadowLg:    '0 8px 32px rgba(15,45,82,0.16), 0 16px 48px rgba(15,45,82,0.10)',
  shadowNav:   '0 2px 16px rgba(15,45,82,0.12)',

  // ── Raios de borda ───────────────────────────────────────────────────────────
  radius:      '12px',
  radiusSm:    '8px',
  radiusLg:    '16px',
  radiusXl:    '20px',

  // ── Fontes ───────────────────────────────────────────────────────────────────
  fontDisplay: "'Sora', sans-serif",
  fontBody:    "'DM Sans', sans-serif",
  fontMono:    "'Fira Code', monospace",

  // ── Transição padrão ─────────────────────────────────────────────────────────
  transition:  'all 0.2s ease',
};

// ── CSS Global (importar no index.css ou via <style> inline) ──────────────────
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Fira+Code:wght@400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: #f8fafc;
    color: #0f2d52;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  input, select, textarea, button { font-family: inherit; }
  input::placeholder, textarea::placeholder { color: #94a3b8; }

  a { color: #1d6fb8; text-decoration: none; }
  a:hover { text-decoration: underline; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }

  .mp-fade-in { animation: fadeIn 0.35s ease forwards; }
  .mp-slide-down { animation: slideDown 0.2s ease forwards; }
`;

export default T;