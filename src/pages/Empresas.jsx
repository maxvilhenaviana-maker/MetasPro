// src/pages/Empresas.jsx
// Módulo completo de Gestão de Empresas — MetasPro
// Ações: Consultar, Incluir, Alterar, Excluir (soft delete)
// Padrão idêntico ao módulo de Usuários

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import NavbarMetasPro from '../components/NavbarMetasPro';
import { T } from '../theme';
import api from '../services/api';

// ─── Helpers visuais ──────────────────────────────────────────────────────────
const StatusDot = ({ ativo }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 12, color: ativo ? T.green : T.textDim,
    fontFamily: T.fontBody,
  }}>
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      background: ativo ? T.green : T.textDim,
      display: 'inline-block',
    }} />
    {ativo ? 'Ativa' : 'Inativa'}
  </span>
);

const Spinner = () => (
  <div style={{
    width: 20, height: 20,
    border: `2px solid ${T.border}`,
    borderTopColor: T.navy,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  }} />
);

// ─── Campo de Formulário ──────────────────────────────────────────────────────
function Campo({ label, required, children, dica }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', marginBottom: 5,
        fontSize: 12, fontWeight: 600,
        color: T.text, fontFamily: T.fontBody,
      }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      {children}
      {dica && (
        <span style={{ fontSize: 11, color: T.textDim, marginTop: 3, display: 'block' }}>
          {dica}
        </span>
      )}
    </div>
  );
}

const inputStyle = (focus) => ({
  width: '100%', padding: '9px 12px',
  border: `1.5px solid ${focus ? T.borderFocus : T.border}`,
  borderRadius: T.radiusSm,
  fontSize: 13, fontFamily: T.fontBody,
  color: T.text, background: T.surface,
  outline: 'none', transition: T.transition,
  boxSizing: 'border-box',
});

function Input({ value, onChange, type = 'text', placeholder, required, disabled, maxLength }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      maxLength={maxLength}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ ...inputStyle(focus), opacity: disabled ? 0.6 : 1 }}
    />
  );
}

// ─── Toast de feedback ────────────────────────────────────────────────────────
function Toast({ msg, tipo, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const cores = {
    sucesso: { bg: '#dcfce7', border: '#86efac', color: '#15803d', icon: '✅' },
    erro:    { bg: '#fee2e2', border: '#fca5a5', color: '#b91c1c', icon: '❌' },
    aviso:   { bg: '#fef9c3', border: '#fde047', color: '#92400e', icon: '⚠️' },
  };
  const c = cores[tipo] || cores.sucesso;
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: T.radius, padding: '12px 18px',
      boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 10,
      animation: 'fadeIn 0.2s ease', maxWidth: 340,
    }}>
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <span style={{ fontSize: 13, color: c.color, fontFamily: T.fontBody, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.color, fontSize: 16 }}>×</button>
    </div>
  );
}

// ─── Formatadores ─────────────────────────────────────────────────────────────
function formatarCNPJ(valor) {
  const digits = valor.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function validarCNPJ(cnpj) {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const calc = (d, len) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(d[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return calc(digits, 12) === parseInt(digits[12]) && calc(digits, 13) === parseInt(digits[13]);
}

// ─── Modal de Detalhes da Empresa ─────────────────────────────────────────────
function ModalDetalhes({ empresa, onFechar, onEditar, carregando }) {
  if (!empresa) return null;

  const campos = [
    { label: 'ID',           valor: empresa.id },
    { label: 'Razão Social', valor: empresa.razao_social || '—' },
    { label: 'Nome Fantasia',valor: empresa.nome_fantasia || '—' },
    { label: 'CNPJ',         valor: empresa.cnpj || '—' },
    { label: 'Status',       valor: <StatusDot ativo={empresa.ativo} /> },
    { label: 'Unidades',     valor: carregando
        ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Carregando...</span>
        : empresa.unidades && empresa.unidades.length > 0
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {empresa.unidades.map(u => (
                <span key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
                  {u.nome_unidade}
                  {u.codigo_unidade && <span style={{ color: '#94a3b8', fontSize: 11 }}>({u.codigo_unidade})</span>}
                </span>
              ))}
            </div>
          : <span style={{ fontSize: 12, color: '#94a3b8' }}>Nenhuma unidade cadastrada</span>
    },
    { label: 'Usuários',     valor: carregando
        ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Carregando...</span>
        : empresa.usuarios && empresa.usuarios.length > 0
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {empresa.usuarios.map(u => (
                <span key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.blue, display: 'inline-block' }} />
                  {u.nome} <span style={{ color: '#94a3b8', fontSize: 11 }}>({u.papel})</span>
                </span>
              ))}
            </div>
          : <span style={{ fontSize: 12, color: '#94a3b8' }}>Nenhum usuário vinculado</span>
    },
    { label: 'Criado em',    valor: empresa.criado_em ? new Date(empresa.criado_em).toLocaleString('pt-BR') : '—' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,45,82,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, animation: 'fadeIn 0.2s ease', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '28px 24px', width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#0f2d52', margin: 0 }}>
            🏢 Detalhes da Empresa
          </h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, overflowY: 'auto', flexGrow: 1 }}>
          {campos.map(({ label, valor }) => (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', gap: 3,
              padding: '9px 12px', background: '#f8fafc',
              borderRadius: 8, border: '1px solid #e2e8f0',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </span>
              <span style={{ fontSize: 13, color: '#0f2d52', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                {valor}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onFechar} style={{
            flex: 1, padding: '10px 0', background: '#f8fafc',
            border: '1.5px solid #e2e8f0', borderRadius: 8,
            color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>Fechar</button>
          <button onClick={() => { onFechar(); onEditar(empresa); }} style={{
            flex: 2, padding: '10px 0', background: '#0f2d52',
            border: 'none', borderRadius: 8, color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>✏️ Editar esta empresa</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Confirmação de Exclusão ─────────────────────────────────────────
function ModalConfirmar({ empresa, onConfirmar, onCancelar, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,45,82,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: T.surface, borderRadius: T.radiusLg,
        padding: '32px 28px', maxWidth: 400, width: '90%',
        boxShadow: T.shadowLg, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ fontFamily: T.fontDisplay, color: T.text, marginBottom: 8 }}>Excluir Empresa</h3>
        <p style={{ color: T.textMd, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Deseja desativar a empresa <strong>{empresa?.nome_fantasia || empresa?.razao_social}</strong>?<br />
          <span style={{ fontSize: 12, color: T.textDim }}>
            O registro é preservado — apenas o acesso será bloqueado.
          </span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancelar} disabled={loading} style={{
            padding: '9px 20px', background: T.surface,
            border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
            color: T.textMd, fontSize: 13, cursor: 'pointer', fontFamily: T.fontBody,
          }}>Cancelar</button>
          <button onClick={onConfirmar} disabled={loading} style={{
            padding: '9px 20px', background: T.red,
            border: 'none', borderRadius: T.radiusSm,
            color: '#fff', fontSize: 13, cursor: 'pointer',
            fontFamily: T.fontBody, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? <Spinner /> : '🗑️'} Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulário Incluir ───────────────────────────────────────────────────────
function FormularioIncluir({ onSalvar, onCancelar, loading }) {
  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
  });
  const [erros, setErros] = useState({});

  const set = (campo) => (e) => {
    let valor = e.target.value;
    if (campo === 'cnpj') valor = formatarCNPJ(valor);
    setForm(f => ({ ...f, [campo]: valor }));
    setErros(er => ({ ...er, [campo]: undefined }));
  };

  const validar = () => {
    const e = {};
    if (!form.razao_social.trim()) e.razao_social = 'Razão social obrigatória.';
    if (!form.cnpj.trim()) e.cnpj = 'CNPJ obrigatório.';
    else if (!validarCNPJ(form.cnpj)) e.cnpj = 'CNPJ inválido.';
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErros(e); return; }
    onSalvar({
      razao_social:  form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim() || form.razao_social.trim(),
      cnpj:          form.cnpj.replace(/\D/g, ''),
    });
  };

  const ErrMsg = ({ campo }) => erros[campo]
    ? <span style={{ fontSize: 11, color: T.red, marginTop: 3, display: 'block' }}>{erros[campo]}</span>
    : null;

  return (
    <div style={{
      background: T.surface, borderRadius: T.radiusLg,
      border: `1px solid ${T.border}`, boxShadow: T.shadow,
      padding: 28, maxWidth: 560,
    }}>
      <h3 style={{
        fontFamily: T.fontDisplay, fontWeight: 700,
        fontSize: 18, color: T.text, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        🏢 Nova Empresa
      </h3>

      <Campo label="Razão Social" required>
        <Input
          value={form.razao_social}
          onChange={set('razao_social')}
          placeholder="Razão Social Ltda."
          required
        />
        <ErrMsg campo="razao_social" />
      </Campo>

      <Campo label="Nome Fantasia" dica="Se não informado, será igual à Razão Social.">
        <Input
          value={form.nome_fantasia}
          onChange={set('nome_fantasia')}
          placeholder="Nome Fantasia (opcional)"
        />
      </Campo>

      <Campo label="CNPJ" required>
        <Input
          value={form.cnpj}
          onChange={set('cnpj')}
          placeholder="00.000.000/0000-00"
          required
          maxLength={18}
        />
        <ErrMsg campo="cnpj" />
      </Campo>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onCancelar} disabled={loading} style={{
          flex: 1, padding: '11px 0', background: T.surface,
          border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
          color: T.textMd, fontSize: 13, cursor: 'pointer', fontFamily: T.fontBody,
        }}>Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} style={{
          flex: 2, padding: '11px 0', background: T.green,
          border: 'none', borderRadius: T.radiusSm, color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: T.fontBody,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? <Spinner /> : '💾 Salvar Empresa'}
        </button>
      </div>
    </div>
  );
}

// ─── Formulário Alterar ───────────────────────────────────────────────────────
function FormularioAlterar({ empresaInicial, onSalvar, onCancelar, loading }) {
  const [form, setForm] = useState({
    razao_social:  empresaInicial?.razao_social  || '',
    nome_fantasia: empresaInicial?.nome_fantasia || '',
    cnpj:          empresaInicial?.cnpj
      ? formatarCNPJ(empresaInicial.cnpj)
      : '',
    ativo: typeof empresaInicial?.ativo === 'boolean' ? empresaInicial.ativo : true,
  });
  const [erros, setErros] = useState({});

  const set = (campo) => (e) => {
    let valor = campo === 'ativo' ? e.target.value === 'true' : e.target.value;
    if (campo === 'cnpj') valor = formatarCNPJ(e.target.value);
    setForm(f => ({ ...f, [campo]: valor }));
    setErros(er => ({ ...er, [campo]: undefined }));
  };

  const validar = () => {
    const e = {};
    if (!form.razao_social.trim()) e.razao_social = 'Razão social obrigatória.';
    if (!form.cnpj.trim()) e.cnpj = 'CNPJ obrigatório.';
    else if (!validarCNPJ(form.cnpj)) e.cnpj = 'CNPJ inválido.';
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErros(e); return; }
    onSalvar({
      razao_social:  form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim() || form.razao_social.trim(),
      cnpj:          form.cnpj.replace(/\D/g, ''),
      ativo:         form.ativo,
    });
  };

  const ErrMsg = ({ campo }) => erros[campo]
    ? <span style={{ fontSize: 11, color: T.red, marginTop: 3, display: 'block' }}>{erros[campo]}</span>
    : null;

  return (
    <div style={{
      background: T.surface, borderRadius: T.radiusLg,
      border: `1px solid ${T.border}`, boxShadow: T.shadow,
      padding: 28, maxWidth: 560,
    }}>
      <h3 style={{
        fontFamily: T.fontDisplay, fontWeight: 700,
        fontSize: 18, color: T.text, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        ✏️ Alterar Empresa
      </h3>

      <Campo label="Razão Social" required>
        <Input
          value={form.razao_social}
          onChange={set('razao_social')}
          placeholder="Razão Social Ltda."
          required
        />
        <ErrMsg campo="razao_social" />
      </Campo>

      <Campo label="Nome Fantasia">
        <Input
          value={form.nome_fantasia}
          onChange={set('nome_fantasia')}
          placeholder="Nome Fantasia (opcional)"
        />
      </Campo>

      <Campo label="CNPJ" required>
        <Input
          value={form.cnpj}
          onChange={set('cnpj')}
          placeholder="00.000.000/0000-00"
          required
          maxLength={18}
        />
        <ErrMsg campo="cnpj" />
      </Campo>

      <Campo label="Status">
        <select
          value={String(form.ativo)}
          onChange={set('ativo')}
          style={{
            width: '100%', padding: '9px 12px',
            border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
            fontSize: 13, fontFamily: T.fontBody, color: T.text,
            background: T.surface, outline: 'none', cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          <option value="true">Ativa</option>
          <option value="false">Inativa</option>
        </select>
      </Campo>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onCancelar} disabled={loading} style={{
          flex: 1, padding: '11px 0', background: T.surface,
          border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
          color: T.textMd, fontSize: 13, cursor: 'pointer', fontFamily: T.fontBody,
        }}>Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} style={{
          flex: 2, padding: '11px 0', background: T.navy,
          border: 'none', borderRadius: T.radiusSm, color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: T.fontBody,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? <Spinner /> : '💾 Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}

// ─── Tabela de Consulta ───────────────────────────────────────────────────────
function BtnAcao({ icon, title, cor, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 9px',
        background: hover ? cor : 'transparent',
        border: `1.5px solid ${hover ? cor : T.border}`,
        borderRadius: T.radiusSm,
        cursor: 'pointer', fontSize: 13,
        transition: T.transition,
      }}>
      {icon}
    </button>
  );
}

function TabelaEmpresas({ empresas, onEditar, onExcluir, onVerDetalhes, busca, acao }) {
  const filtradas = empresas.filter(e =>
    `${e.razao_social} ${e.nome_fantasia} ${e.cnpj}`.toLowerCase().includes(busca.toLowerCase())
  );

  if (filtradas.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: T.textDim, fontFamily: T.fontBody, fontSize: 14 }}>
        {busca ? `Nenhuma empresa encontrada para "${busca}".` : 'Nenhuma empresa cadastrada.'}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: T.bgAlt }}>
            {['Nome Fantasia', 'Razão Social', 'CNPJ', 'Status', 'Criado em', 'Ações'].map(h => (
              <th key={h} style={{
                padding: '10px 14px', textAlign: 'left',
                fontSize: 11, fontWeight: 700, color: T.textMd,
                fontFamily: T.fontBody, textTransform: 'uppercase',
                letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}`,
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtradas.map((emp, i) => (
            <tr key={emp.id}
              style={{ background: i % 2 === 0 ? T.surface : T.bgAlt, transition: T.transition }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? T.surface : T.bgAlt}
            >
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.text, fontWeight: 600 }}>
                <button
                  onClick={() => acao === 'excluir' ? onExcluir(emp) : (onVerDetalhes && onVerDetalhes(emp))}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: acao === 'excluir' ? T.red : T.navy, fontWeight: 600, fontSize: 13,
                    fontFamily: T.fontBody, padding: 0,
                    textDecoration: 'underline dotted',
                    textDecorationColor: acao === 'excluir' ? T.red : T.border,
                  }}
                >
                  {emp.nome_fantasia || emp.razao_social}
                </button>
              </td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.textMd }}>
                {emp.razao_social}
              </td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.textMd, whiteSpace: 'nowrap' }}>
                {formatarCNPJ(emp.cnpj || '')}
              </td>
              <td style={{ padding: '11px 14px' }}><StatusDot ativo={emp.ativo} /></td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 12, color: T.textDim, whiteSpace: 'nowrap' }}>
                {emp.criado_em ? new Date(emp.criado_em).toLocaleDateString('pt-BR') : '—'}
              </td>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <BtnAcao icon="✏️" title="Alterar" cor={T.blue} onClick={() => onEditar(emp)} />
                  <BtnAcao icon="🗑️" title="Excluir" cor={T.red}  onClick={() => onExcluir(emp)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Empresas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const acao = searchParams.get('acao') || 'consultar';

  const [empresas, setEmpresas]               = useState([]);
  const [carregando, setCarregando]           = useState(false);
  const [salvando, setSalvando]               = useState(false);
  const [excluindo, setExcluindo]             = useState(false);
  const [busca, setBusca]                     = useState('');
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [empresaExcluindo, setEmpresaExcluindo] = useState(null);
  const [empresaDetalhes, setEmpresaDetalhes]   = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [toast, setToast]                     = useState(null);

  const showToast = (msg, tipo = 'sucesso') => setToast({ msg, tipo });

  const carregarEmpresas = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/empresas');
      setEmpresas(data.empresas || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao carregar empresas.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarEmpresas(); }, [carregarEmpresas]);

  const irPara = (novaAcao, empresa = null) => {
    setEmpresaEditando(empresa);
    setSearchParams({ acao: novaAcao });
  };

  const handleVerDetalhes = async (emp) => {
    setEmpresaDetalhes(emp);
    setCarregandoDetalhes(true);
    try {
      const { data } = await api.get(`/empresas/${emp.id}`);
      setEmpresaDetalhes(data);
    } catch {
      // mantém dados parciais já carregados
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const handleIncluir = async (payload) => {
    setSalvando(true);
    try {
      await api.post('/empresas', payload);
      showToast('Empresa incluída com sucesso!');
      await carregarEmpresas();
      irPara('consultar');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao incluir empresa.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const handleAlterar = async (payload) => {
    if (!empresaEditando) return;
    setSalvando(true);
    try {
      await api.put(`/empresas/${empresaEditando.id}`, payload);
      showToast('Empresa atualizada com sucesso!');
      await carregarEmpresas();
      irPara('consultar');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar empresa.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!empresaExcluindo) return;
    setExcluindo(true);
    try {
      await api.delete(`/empresas/${empresaExcluindo.id}`);
      showToast('Empresa desativada com sucesso.');
      setEmpresaExcluindo(null);
      await carregarEmpresas();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir empresa.', 'erro');
    } finally {
      setExcluindo(false);
    }
  };

  const handleEditarDaTabela = (emp) => {
    setEmpresaEditando(emp);
    setSearchParams({ acao: 'alterar' });
  };

  // ─── Renderização por ação ────────────────────────────────────────────────
  const renderConteudo = () => {
    if (acao === 'incluir') {
      return (
        <FormularioIncluir
          onSalvar={handleIncluir}
          onCancelar={() => irPara('consultar')}
          loading={salvando}
        />
      );
    }

    if (acao === 'alterar') {
      if (!empresaEditando) {
        return (
          <div>
            <p style={{
              background: T.blueDim, border: '1px solid #bfdbfe',
              borderRadius: T.radiusSm, padding: '10px 16px',
              fontSize: 13, color: T.blue, fontFamily: T.fontBody, marginBottom: 20,
            }}>
              🔍 Selecione uma empresa na lista para alterar.
            </p>
            <TabelaComBusca />
          </div>
        );
      }
      return (
        <FormularioAlterar
          empresaInicial={empresaEditando}
          onSalvar={handleAlterar}
          onCancelar={() => { setEmpresaEditando(null); irPara('consultar'); }}
          loading={salvando}
        />
      );
    }

    if (acao === 'excluir') {
      return (
        <div>
          <p style={{
            background: '#fee2e2', border: '1px solid #fca5a5',
            borderRadius: T.radiusSm, padding: '10px 16px',
            fontSize: 13, color: '#b91c1c', fontFamily: T.fontBody, marginBottom: 20,
          }}>
            ⚠️ Selecione a empresa que deseja desativar. O registro é preservado no histórico.
          </p>
          <TabelaComBusca />
        </div>
      );
    }

    // consultar (padrão)
    return <TabelaComBusca />;
  };

  const TabelaComBusca = () => (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textDim }}>🔍</span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
              fontSize: 13, fontFamily: T.fontBody, color: T.text,
              background: T.surface, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        {acao === 'consultar' && (
          <button onClick={() => irPara('incluir')} style={{
            padding: '8px 18px', background: T.green,
            border: 'none', borderRadius: T.radiusSm,
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.fontBody,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ➕ Nova Empresa
          </button>
        )}
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>
      ) : (
        <div style={{
          background: T.surface, borderRadius: T.radiusLg,
          border: `1px solid ${T.border}`, boxShadow: T.shadow,
          overflow: 'hidden',
        }}>
          <TabelaEmpresas
            empresas={empresas}
            busca={busca}
            acao={acao}
            onEditar={handleEditarDaTabela}
            onExcluir={emp => setEmpresaExcluindo(emp)}
            onVerDetalhes={handleVerDetalhes}
          />
        </div>
      )}
    </div>
  );

  // ─── Tabs de ação ─────────────────────────────────────────────────────────
  const TABS = [
    { key: 'consultar', icon: '🔍', label: 'Consultar' },
    { key: 'incluir',   icon: '➕', label: 'Incluir'   },
    { key: 'alterar',   icon: '✏️',  label: 'Alterar'   },
    { key: 'excluir',   icon: '🗑️', label: 'Excluir'   },
  ];

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        .tabs-acoes { flex-direction: row; width: fit-content; }
        .tab-btn    { width: auto; justify-content: center; }
        @media (max-width: 480px) {
          .tabs-acoes { flex-direction: column !important; width: 100% !important; }
          .tab-btn    { width: 100% !important; justify-content: flex-start !important; }
        }
      `}</style>

      <NavbarMetasPro />

      <div style={{ minHeight: 'calc(100vh - 56px)', background: T.bg, padding: '28px 24px', fontFamily: T.fontBody }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Cabeçalho */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontFamily: T.fontDisplay, fontWeight: 900,
              fontSize: 26, color: T.navy, marginBottom: 4,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              🏢 Gestão de Empresas
            </h1>
            <p style={{ color: T.textMd, fontSize: 13 }}>
              Gerencie as empresas cadastradas — inclua, altere, consulte e desative registros.
            </p>
          </div>

          {/* Tabs de ação */}
          <div className="tabs-acoes" style={{
            display: 'flex', gap: 6, marginBottom: 24,
            background: T.surface, borderRadius: T.radius,
            border: `1px solid ${T.border}`, padding: 6,
          }}>
            {TABS.map(tab => {
              const ativo = acao === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setEmpresaEditando(null); setSearchParams({ acao: tab.key }); }}
                  className="tab-btn"
                  style={{
                    padding: '10px 16px',
                    background: ativo ? T.navy : 'transparent',
                    border: 'none', borderRadius: T.radiusSm,
                    color: ativo ? '#fff' : T.textMd,
                    fontSize: 13, fontWeight: ativo ? 700 : 500,
                    cursor: 'pointer', fontFamily: T.fontBody,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: T.transition,
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo da ação */}
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            {renderConteudo()}
          </div>

        </div>
      </div>

      {/* Modal de detalhes */}
      {empresaDetalhes && (
        <ModalDetalhes
          empresa={empresaDetalhes}
          carregando={carregandoDetalhes}
          onFechar={() => setEmpresaDetalhes(null)}
          onEditar={(emp) => { setEmpresaDetalhes(null); handleEditarDaTabela(emp); }}
        />
      )}

      {/* Modal de exclusão */}
      {empresaExcluindo && (
        <ModalConfirmar
          empresa={empresaExcluindo}
          onConfirmar={handleExcluir}
          onCancelar={() => setEmpresaExcluindo(null)}
          loading={excluindo}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </>
  );
}
