// src/pages/Unidades.jsx
// Modulo completo de Gestao de Unidades de Monitoramento — MetasPro
// Acoes: Consultar, Incluir, Alterar, Excluir
// Molde identico ao Usuarios.jsx — mesma estrutura de componentes e UX

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

// ─── Campo de Formulario ─────────────────────────────────────────────────────
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
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: c.color, fontSize: 16,
      }}>x</button>
    </div>
  );
}

// ─── Modal de Detalhes da Unidade ─────────────────────────────────────────────
function ModalDetalhes({ unidade, onFechar, onEditar, carregando }) {
  if (!unidade) return null;

  const campos = [
    { label: 'ID',           valor: unidade.id },
    { label: 'Nome',         valor: unidade.nome_unidade },
    { label: 'Codigo',       valor: unidade.codigo_unidade || '—' },
    { label: 'Status',       valor: <StatusDot ativo={unidade.ativo} /> },
    { label: 'Empresa',      valor: unidade.empresa_nome || unidade.nome_fantasia || unidade.empresa_razao || '—' },
    { label: 'Usuarios',     valor: carregando
        ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Carregando...</span>
        : unidade.usuarios && unidade.usuarios.length > 0
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {unidade.usuarios.map(u => (
                <span key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: u.vinculo_ativo ? '#16a34a' : '#94a3b8',
                    display: 'inline-block',
                  }} />
                  {u.nome}
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>({u.papel})</span>
                </span>
              ))}
            </div>
          : <span style={{ fontSize: 12, color: '#94a3b8' }}>Nenhum usuario vinculado</span>
    },
    { label: 'Criado em', valor: unidade.criado_em ? new Date(unidade.criado_em).toLocaleString('pt-BR') : '—' },
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
            Detalhes da Unidade
          </h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>x</button>
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
          <button onClick={() => { onFechar(); onEditar(unidade); }} style={{
            flex: 2, padding: '10px 0', background: '#0f2d52',
            border: 'none', borderRadius: 8, color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>Editar esta Unidade</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Confirmacao de Exclusao ─────────────────────────────────────────
function ModalConfirmar({ unidade, onConfirmar, onCancelar, loading }) {
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
        <h3 style={{ fontFamily: T.fontDisplay, color: T.text, marginBottom: 8 }}>Desativar Unidade</h3>
        <p style={{ color: T.textMd, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Deseja desativar a unidade <strong>{unidade?.nome_unidade}</strong>?<br />
          <span style={{ fontSize: 12, color: T.textDim }}>
            O registro e preservado — apenas sera marcado como inativo.
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
            {loading ? <Spinner /> : '🗑️'} Confirmar Desativacao
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario Incluir ───────────────────────────────────────────────────────
function FormularioIncluir({ onSalvar, onCancelar, loading }) {
  const [form, setForm] = useState({ nome_unidade: '', codigo_unidade: '' });
  const [erros, setErros] = useState({});

  const set = (campo) => (e) => {
    setForm(f => ({ ...f, [campo]: e.target.value }));
    setErros(prev => ({ ...prev, [campo]: undefined }));
  };

  const validar = () => {
    const e = {};
    if (!form.nome_unidade.trim()) e.nome_unidade = 'Nome da unidade obrigatorio.';
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErros(e); return; }
    onSalvar({
      nome_unidade:    form.nome_unidade.trim(),
      codigo_unidade:  form.codigo_unidade.trim() || undefined,
    });
  };

  const ErrMsg = ({ campo }) => erros[campo]
    ? <span style={{ fontSize: 11, color: T.red, marginTop: 3, display: 'block' }}>{erros[campo]}</span>
    : null;

  return (
    <div style={{
      background: T.surface, borderRadius: T.radiusLg,
      border: `1px solid ${T.border}`, boxShadow: T.shadow,
      padding: 28, maxWidth: 520,
    }}>
      <h3 style={{
        fontFamily: T.fontDisplay, fontWeight: 700,
        fontSize: 18, color: T.navy, marginBottom: 22,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        Nova Unidade de Monitoramento
      </h3>

      <Campo label="Nome da Unidade" required
        dica="Nome completo da unidade. Ex.: Filial Centro, Loja Savassi, Setor Producao.">
        <Input
          value={form.nome_unidade}
          onChange={set('nome_unidade')}
          placeholder="Ex.: Filial Centro"
          required
          maxLength={255}
        />
        <ErrMsg campo="nome_unidade" />
      </Campo>

      <Campo label="Codigo da Unidade"
        dica="Codigo curto opcional. Se nao informado, sera gerado automaticamente (UN-01, UN-02...).">
        <Input
          value={form.codigo_unidade}
          onChange={set('codigo_unidade')}
          placeholder="Ex.: FIL-CENTRO (opcional)"
          maxLength={50}
        />
        <ErrMsg campo="codigo_unidade" />
      </Campo>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onCancelar} disabled={loading} style={{
          flex: 1, padding: '10px 0',
          background: T.surface, border: `1.5px solid ${T.border}`,
          borderRadius: T.radiusSm, color: T.textMd,
          fontSize: 13, cursor: 'pointer', fontFamily: T.fontBody,
        }}>Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} style={{
          flex: 2, padding: '10px 0',
          background: T.green, border: 'none',
          borderRadius: T.radiusSm, color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: T.fontBody,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? <Spinner /> : '✅'} Salvar Unidade
        </button>
      </div>
    </div>
  );
}

// ─── Formulario Alterar ───────────────────────────────────────────────────────
function FormularioAlterar({ unidadeInicial, onSalvar, onCancelar, loading }) {
  const [form, setForm] = useState({
    nome_unidade:   unidadeInicial?.nome_unidade   || '',
    codigo_unidade: unidadeInicial?.codigo_unidade || '',
    ativo:          unidadeInicial?.ativo !== false,
  });
  const [erros, setErros] = useState({});

  const set = (campo) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [campo]: val }));
    setErros(prev => ({ ...prev, [campo]: undefined }));
  };

  const validar = () => {
    const e = {};
    if (!form.nome_unidade.trim()) e.nome_unidade = 'Nome da unidade obrigatorio.';
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErros(e); return; }
    onSalvar({
      nome_unidade:   form.nome_unidade.trim(),
      codigo_unidade: form.codigo_unidade.trim() || undefined,
      ativo:          form.ativo,
    });
  };

  const ErrMsg = ({ campo }) => erros[campo]
    ? <span style={{ fontSize: 11, color: T.red, marginTop: 3, display: 'block' }}>{erros[campo]}</span>
    : null;

  return (
    <div style={{
      background: T.surface, borderRadius: T.radiusLg,
      border: `1px solid ${T.border}`, boxShadow: T.shadow,
      padding: 28, maxWidth: 520,
    }}>
      <h3 style={{
        fontFamily: T.fontDisplay, fontWeight: 700,
        fontSize: 18, color: T.navy, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        Alterar Unidade
      </h3>
      <p style={{ fontSize: 12, color: T.textDim, marginBottom: 22, fontFamily: T.fontBody }}>
        Editando: <strong style={{ color: T.navy }}>{unidadeInicial?.nome_unidade}</strong>
      </p>

      <Campo label="Nome da Unidade" required>
        <Input
          value={form.nome_unidade}
          onChange={set('nome_unidade')}
          placeholder="Nome da unidade"
          required
          maxLength={255}
        />
        <ErrMsg campo="nome_unidade" />
      </Campo>

      <Campo label="Codigo da Unidade"
        dica="Deixe em branco para manter o codigo atual.">
        <Input
          value={form.codigo_unidade}
          onChange={set('codigo_unidade')}
          placeholder="Codigo da unidade"
          maxLength={50}
        />
        <ErrMsg campo="codigo_unidade" />
      </Campo>

      <Campo label="Status">
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', fontFamily: T.fontBody, fontSize: 13,
          padding: '9px 14px', borderRadius: T.radiusSm,
          border: `1.5px solid ${T.border}`,
          background: form.ativo ? '#f0fdf4' : '#fff',
        }}>
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={set('ativo')}
            style={{ width: 15, height: 15, accentColor: T.green, cursor: 'pointer' }}
          />
          <span style={{ color: form.ativo ? T.green : T.textMd, fontWeight: form.ativo ? 600 : 400 }}>
            {form.ativo ? 'Unidade Ativa' : 'Unidade Inativa'}
          </span>
        </label>
      </Campo>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onCancelar} disabled={loading} style={{
          flex: 1, padding: '10px 0',
          background: T.surface, border: `1.5px solid ${T.border}`,
          borderRadius: T.radiusSm, color: T.textMd,
          fontSize: 13, cursor: 'pointer', fontFamily: T.fontBody,
        }}>Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} style={{
          flex: 2, padding: '10px 0',
          background: T.navy, border: 'none',
          borderRadius: T.radiusSm, color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: T.fontBody,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? <Spinner /> : '💾'} Salvar Alteracoes
        </button>
      </div>
    </div>
  );
}

// ─── Botao de Acao na Tabela ──────────────────────────────────────────────────
function BtnAcao({ icon, title, cor, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 9px',
        background: hover ? cor : 'transparent',
        border: `1.5px solid ${hover ? cor : T.border}`,
        borderRadius: T.radiusSm,
        cursor: 'pointer', fontSize: 13,
        transition: T.transition,
      }}
    >
      {icon}
    </button>
  );
}

// ─── Tabela de Consulta ───────────────────────────────────────────────────────
function TabelaUnidades({ unidades, onEditar, onExcluir, onVerDetalhes, busca, acao }) {
  const filtradas = unidades.filter(u =>
    `${u.nome_unidade} ${u.codigo_unidade || ''}`.toLowerCase().includes(busca.toLowerCase())
  );

  if (filtradas.length === 0) {
    return (
      <div style={{
        padding: '32px 24px', textAlign: 'center',
        color: T.textDim, fontFamily: T.fontBody, fontSize: 14,
      }}>
        {busca
          ? `Nenhuma unidade encontrada para "${busca}".`
          : 'Nenhuma unidade cadastrada para esta empresa.'}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: T.bgAlt }}>
            {['Nome da Unidade', 'Codigo', 'Usuarios', 'Status', 'Criado em', 'Acoes'].map(h => (
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
          {filtradas.map((u, i) => (
            <tr
              key={u.id}
              style={{ background: i % 2 === 0 ? T.surface : T.bgAlt, transition: T.transition }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? T.surface : T.bgAlt}
            >
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.text, fontWeight: 600 }}>
                <button
                  onClick={() => acao === 'excluir' ? onExcluir(u) : (onVerDetalhes && onVerDetalhes(u))}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: acao === 'excluir' ? T.red : T.navy,
                    fontWeight: 600, fontSize: 13,
                    fontFamily: T.fontBody, padding: 0,
                    textDecoration: 'underline dotted',
                    textDecorationColor: acao === 'excluir' ? T.red : T.border,
                  }}
                >
                  {u.nome_unidade}
                </button>
              </td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.textMd }}>
                {u.codigo_unidade
                  ? <span style={{
                      background: '#f0f7ff', border: '1px solid #bfdbfe',
                      borderRadius: 6, padding: '2px 9px',
                      fontSize: 12, fontWeight: 600, color: '#1d4ed8',
                    }}>{u.codigo_unidade}</span>
                  : <span style={{ color: T.textDim, fontSize: 12 }}>—</span>
                }
              </td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.textMd }}>
                {u.total_usuarios > 0
                  ? <span style={{
                      background: '#f0fdf4', border: '1px solid #86efac',
                      borderRadius: 6, padding: '2px 9px',
                      fontSize: 12, fontWeight: 600, color: '#15803d',
                    }}>{u.total_usuarios} usuario{u.total_usuarios !== 1 ? 's' : ''}</span>
                  : <span style={{ color: T.textDim, fontSize: 12 }}>Nenhum</span>
                }
              </td>
              <td style={{ padding: '11px 14px' }}><StatusDot ativo={u.ativo} /></td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 12, color: T.textDim, whiteSpace: 'nowrap' }}>
                {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—'}
              </td>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <BtnAcao icon="✏️" title="Alterar" cor={T.blue} onClick={() => onEditar(u)} />
                  <BtnAcao icon="🗑️" title="Desativar" cor={T.red} onClick={() => onExcluir(u)} />
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
export default function Unidades() {
  const [searchParams, setSearchParams] = useSearchParams();
  const acao = searchParams.get('acao') || 'consultar';

  const [unidades, setUnidades]                   = useState([]);
  const [carregando, setCarregando]               = useState(false);
  const [salvando, setSalvando]                   = useState(false);
  const [excluindo, setExcluindo]                 = useState(false);
  const [busca, setBusca]                         = useState('');
  const [unidadeEditando, setUnidadeEditando]     = useState(null);
  const [unidadeExcluindo, setUnidadeExcluindo]   = useState(null);
  const [unidadeDetalhes, setUnidadeDetalhes]     = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [toast, setToast]                         = useState(null);

  const showToast = (msg, tipo = 'sucesso') => setToast({ msg, tipo });

  const carregarUnidades = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/unidades');
      setUnidades(data.unidades || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao carregar unidades.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarUnidades(); }, [carregarUnidades]);

  const irPara = (novaAcao, unidade = null) => {
    setUnidadeEditando(unidade);
    setSearchParams({ acao: novaAcao });
  };

  const handleVerDetalhes = async (u) => {
    setUnidadeDetalhes(u);
    setCarregandoDetalhes(true);
    try {
      const { data } = await api.get(`/unidades/${u.id}`);
      setUnidadeDetalhes(data);
    } catch {
      // mantém dados parciais
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const handleIncluir = async (payload) => {
    setSalvando(true);
    try {
      await api.post('/unidades', payload);
      showToast('Unidade incluida com sucesso!');
      await carregarUnidades();
      irPara('consultar');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao incluir unidade.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const handleAlterar = async (payload) => {
    if (!unidadeEditando) return;
    setSalvando(true);
    try {
      await api.put(`/unidades/${unidadeEditando.id}`, payload);
      showToast('Unidade atualizada com sucesso!');
      await carregarUnidades();
      irPara('consultar');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar unidade.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!unidadeExcluindo) return;
    setExcluindo(true);
    try {
      await api.delete(`/unidades/${unidadeExcluindo.id}`);
      showToast('Unidade desativada com sucesso.');
      setUnidadeExcluindo(null);
      await carregarUnidades();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao desativar unidade.', 'erro');
    } finally {
      setExcluindo(false);
    }
  };

  const handleEditarDaTabela = (u) => {
    setUnidadeEditando(u);
    setSearchParams({ acao: 'alterar' });
  };

  // ─── Renderizacao por acao ────────────────────────────────────────────────
  const TabelaComBusca = () => (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textDim }}>🔍</span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou codigo..."
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
            ➕ Nova Unidade
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
          <TabelaUnidades
            unidades={unidades}
            busca={busca}
            acao={acao}
            onEditar={handleEditarDaTabela}
            onExcluir={u => setUnidadeExcluindo(u)}
            onVerDetalhes={handleVerDetalhes}
          />
        </div>
      )}
    </div>
  );

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
      if (!unidadeEditando) {
        return (
          <div>
            <p style={{
              background: T.blueDim, border: '1px solid #bfdbfe',
              borderRadius: T.radiusSm, padding: '10px 16px',
              fontSize: 13, color: T.blue, fontFamily: T.fontBody, marginBottom: 20,
            }}>
              🔍 Selecione uma unidade na lista para alterar.
            </p>
            <TabelaComBusca />
          </div>
        );
      }
      return (
        <FormularioAlterar
          unidadeInicial={unidadeEditando}
          onSalvar={handleAlterar}
          onCancelar={() => { setUnidadeEditando(null); irPara('consultar'); }}
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
            Selecione a unidade que deseja desativar. O registro e preservado no historico.
          </p>
          <TabelaComBusca />
        </div>
      );
    }

    // consultar (padrao)
    return <TabelaComBusca />;
  };

  // ─── Tabs de acao ──────────────────────────────────────────────────────────
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

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 200, flexShrink: 0 }}>
          <NavbarMetasPro />
        </div>

        {/* Area fixa: cabecalho + tabs */}
        <div style={{ background: T.bg, padding: '28px 24px 0', flexShrink: 0 }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>

            <div style={{ marginBottom: 24 }}>
              <h1 style={{
                fontFamily: T.fontDisplay, fontWeight: 900,
                fontSize: 26, color: T.navy, marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                Unidades de Monitoramento
              </h1>
              <p style={{ color: T.textMd, fontSize: 13 }}>
                Gerencie as unidades da sua empresa — inclua, altere, consulte e desative conforme necessario.
              </p>
            </div>

            {/* Tabs de acao */}
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
                    onClick={() => { setUnidadeEditando(null); setSearchParams({ acao: tab.key }); }}
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

          </div>
        </div>

        {/* Area rolavel: conteudo da acao */}
        <div style={{ flex: 1, overflowY: 'auto', background: T.bg, padding: '0 24px 28px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ animation: 'fadeIn 0.25s ease', paddingTop: 4 }}>
              {renderConteudo()}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      {unidadeDetalhes && (
        <ModalDetalhes
          unidade={unidadeDetalhes}
          carregando={carregandoDetalhes}
          onFechar={() => setUnidadeDetalhes(null)}
          onEditar={(u) => { setUnidadeDetalhes(null); handleEditarDaTabela(u); }}
        />
      )}

      {/* Modal de exclusao */}
      {unidadeExcluindo && (
        <ModalConfirmar
          unidade={unidadeExcluindo}
          onConfirmar={handleExcluir}
          onCancelar={() => setUnidadeExcluindo(null)}
          loading={excluindo}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </>
  );
}
