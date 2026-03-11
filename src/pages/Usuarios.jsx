// src/pages/Usuarios.jsx
// Módulo completo de Gestão de Usuários — MetasPro
// Ações: Consultar, Incluir, Alterar, Excluir
// Acessa: GET/POST/PUT/DELETE /api/usuarios (ADMIN only)

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import NavbarMetasPro from '../components/NavbarMetasPro';
import { T } from '../theme';
import api from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const PAPEIS = [
  { value: 'ADMIN',                  label: 'Administrador' },
  { value: 'DESIGNADO_CONFIGURADOR', label: 'Configurador' },
  { value: 'DESIGNADO_LANCADOR',     label: 'Lançador' },
];

const PAPEL_BADGE = {
  ADMIN:                  { bg: '#dbeafe', color: '#1d4ed8', label: 'Admin' },
  DESIGNADO_CONFIGURADOR: { bg: '#dcfce7', color: '#15803d', label: 'Configurador' },
  DESIGNADO_LANCADOR:     { bg: '#fef9c3', color: '#92400e', label: 'Lançador' },
};

// ─── Helpers visuais ──────────────────────────────────────────────────────────
const Badge = ({ papel }) => {
  const cfg = PAPEL_BADGE[papel] || { bg: '#f1f5f9', color: '#475569', label: papel };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, padding: '2px 10px',
      fontSize: 11, fontWeight: 700, fontFamily: T.fontBody,
      whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
};

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
    {ativo ? 'Ativo' : 'Inativo'}
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
function Campo({ label, required, children }) {
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
});

function Input({ value, onChange, type = 'text', placeholder, required, disabled }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ ...inputStyle(focus), opacity: disabled ? 0.6 : 1 }}
    />
  );
}

function Select({ value, onChange, children, disabled }) {
  const [focus, setFocus] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ ...inputStyle(focus), cursor: 'pointer', opacity: disabled ? 0.6 : 1 }}
    >
      {children}
    </select>
  );
}

// ─── Toast de feedback ────────────────────────────────────────────────────────
function Toast({ msg, tipo, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
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

// ─── Modal de Detalhes do Usuário ────────────────────────────────────────────
function ModalDetalhes({ usuario, onFechar, onEditar, carregando }) {
  if (!usuario) return null;
  const campos = [
    { label: 'ID',           valor: usuario.id },
    { label: 'Nome',         valor: usuario.nome },
    { label: 'E-mail',       valor: usuario.email },
    { label: 'Papel',        valor: <Badge papel={usuario.papel} /> },
    { label: 'Status',       valor: <StatusDot ativo={usuario.ativo} /> },
    { label: 'Cadastro',     valor: usuario.created_at ? new Date(usuario.created_at).toLocaleString('pt-BR') : '—' },
    { label: 'Login Google', valor: usuario.google_id ? '✅ Vinculado' : '— Não vinculado' },
  ];
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,45,82,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, animation: 'fadeIn 0.2s ease', padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '28px 24px', width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#0f2d52', margin: 0 }}>
            👤 Detalhes do Usuário
          </h3>
          <button onClick={onFechar} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: '#94a3b8', lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {campos.map(({ label, valor }) => (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', gap: 3,
              padding: '10px 14px',
              background: '#f8fafc', borderRadius: 8,
              border: '1px solid #e2e8f0',
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

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onFechar} style={{
            flex: 1, padding: '10px 0',
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
            borderRadius: 8, color: '#64748b', fontSize: 13,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            Fechar
          </button>
          <button onClick={() => { onFechar(); onEditar(usuario); }} style={{
            flex: 2, padding: '10px 0',
            background: '#0f2d52', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            ✏️ Editar este usuário
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Confirmação de Exclusão ─────────────────────────────────────────
function ModalConfirmar({ usuario, onConfirmar, onCancelar, loading }) {
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
        <h3 style={{ fontFamily: T.fontDisplay, color: T.text, marginBottom: 8 }}>
          Excluir Usuário
        </h3>
        <p style={{ color: T.textMd, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Deseja desativar o usuário <strong>{usuario?.nome}</strong>?<br />
          <span style={{ fontSize: 12, color: T.textDim }}>
            O registro é preservado — apenas o acesso será bloqueado.
          </span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancelar}
            disabled={loading}
            style={{
              padding: '9px 20px', background: T.surface,
              border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
              color: T.textMd, fontSize: 13, cursor: 'pointer',
              fontFamily: T.fontBody,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={loading}
            style={{
              padding: '9px 20px', background: T.red,
              border: 'none', borderRadius: T.radiusSm,
              color: '#fff', fontSize: 13, cursor: 'pointer',
              fontFamily: T.fontBody, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Spinner /> : '🗑️'} Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulário Incluir / Alterar ─────────────────────────────────────────────
function FormularioUsuario({ modo, usuarioInicial, onSalvar, onCancelar, loading }) {
  const [form, setForm] = useState({
    nome: usuarioInicial?.nome || '',
    email: usuarioInicial?.email || '',
    senha: '',
    confirmarSenha: '',
    papel: usuarioInicial?.papel || 'DESIGNADO_LANCADOR',
    ativo: usuarioInicial?.ativo !== false,
  });
  const [erros, setErros] = useState({});

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome obrigatório.';
    if (!form.email.trim()) e.email = 'E-mail obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido.';
    if (modo === 'incluir') {
      if (!form.senha) e.senha = 'Senha obrigatória.';
      else if (form.senha.length < 6) e.senha = 'Mínimo 6 caracteres.';
    }
    if (form.senha && form.senha !== form.confirmarSenha) e.confirmarSenha = 'Senhas não coincidem.';
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErros(e); return; }

    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      papel: form.papel,
    };
    if (modo === 'incluir') payload.senha = form.senha;
    if (modo === 'alterar') {
      payload.ativo = form.ativo;
      if (form.senha) payload.novaSenha = form.senha;
    }
    onSalvar(payload);
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
        fontSize: 18, color: T.text, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {modo === 'incluir' ? '➕ Novo Usuário' : '✏️ Editar Usuário'}
      </h3>

      <Campo label="Nome completo" required>
        <Input value={form.nome} onChange={set('nome')} placeholder="Ex: João Silva" />
        <ErrMsg campo="nome" />
      </Campo>

      <Campo label="E-mail" required>
        <Input value={form.email} onChange={set('email')} type="email"
          placeholder="usuario@empresa.com"
          disabled={modo === 'alterar'}
        />
        <ErrMsg campo="email" />
      </Campo>

      <Campo label={modo === 'incluir' ? 'Senha' : 'Nova senha (opcional)'} required={modo === 'incluir'}>
        <Input value={form.senha} onChange={set('senha')} type="password"
          placeholder={modo === 'incluir' ? 'Mínimo 6 caracteres' : 'Deixe em branco para não alterar'}
        />
        <ErrMsg campo="senha" />
      </Campo>

      {(modo === 'incluir' || form.senha) && (
        <Campo label="Confirmar senha" required={modo === 'incluir'}>
          <Input value={form.confirmarSenha} onChange={set('confirmarSenha')} type="password"
            placeholder="Repita a senha"
          />
          <ErrMsg campo="confirmarSenha" />
        </Campo>
      )}

      <Campo label="Papel / Permissão" required>
        <Select value={form.papel} onChange={set('papel')}>
          {PAPEIS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
      </Campo>

      {modo === 'alterar' && (
        <Campo label="Status">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm(f => ({ ...f, ativo: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13, color: T.textMd, fontFamily: T.fontBody }}>
              Usuário ativo
            </span>
          </label>
        </Campo>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          onClick={onCancelar}
          disabled={loading}
          style={{
            flex: 1, padding: '10px 0',
            background: T.surface, border: `1.5px solid ${T.border}`,
            borderRadius: T.radiusSm, color: T.textMd,
            fontSize: 13, cursor: 'pointer', fontFamily: T.fontBody,
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            flex: 2, padding: '10px 0',
            background: T.navy, border: 'none',
            borderRadius: T.radiusSm, color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: T.fontBody,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <Spinner /> : (modo === 'incluir' ? '➕ Incluir Usuário' : '💾 Salvar Alterações')}
        </button>
      </div>
    </div>
  );
}

// ─── Tabela de Consulta ───────────────────────────────────────────────────────
function TabelaUsuarios({ usuarios, onEditar, onExcluir, busca }) {
  const filtrados = usuarios.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    (PAPEL_BADGE[u.papel]?.label || u.papel || '').toLowerCase().includes(busca.toLowerCase())
  );

  if (filtrados.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '48px 24px',
        color: T.textDim, fontSize: 14, fontFamily: T.fontBody,
      }}>
        {busca ? `Nenhum usuário encontrado para "${busca}"` : 'Nenhum usuário cadastrado ainda.'}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: T.bgAlt }}>
            {['Nome', 'E-mail', 'Papel', 'Status', 'Desde', 'Ações'].map(h => (
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
          {filtrados.map((u, i) => (
            <tr
              key={u.id}
              style={{
                background: i % 2 === 0 ? T.surface : T.bgAlt,
                transition: T.transition,
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? T.surface : T.bgAlt}
            >
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.text, fontWeight: 600 }}>
                <button
                  onClick={() => onVerDetalhes && onVerDetalhes(u)}
                  title="Ver detalhes"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.navy, fontWeight: 600, fontSize: 13,
                    fontFamily: T.fontBody, padding: 0, textDecoration: 'underline dotted',
                    textDecorationColor: T.border,
                  }}
                >
                  {u.nome}
                </button>
              </td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 13, color: T.textMd }}>
                {u.email}
              </td>
              <td style={{ padding: '11px 14px' }}>
                <Badge papel={u.papel} />
              </td>
              <td style={{ padding: '11px 14px' }}>
                <StatusDot ativo={u.ativo} />
              </td>
              <td style={{ padding: '11px 14px', fontFamily: T.fontBody, fontSize: 12, color: T.textDim, whiteSpace: 'nowrap' }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
              </td>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <BtnAcao icon="✏️" title="Alterar" cor={T.blue} onClick={() => onEditar(u)} />
                  <BtnAcao icon="🗑️" title="Excluir" cor={T.red}  onClick={() => onExcluir(u)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Usuarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const acao = searchParams.get('acao') || 'consultar';
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [busca, setBusca] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState(null);
  const [usuarioDetalhes, setUsuarioDetalhes] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [toast, setToast] = useState(null);

  const handleVerDetalhes = async (u) => {
    setUsuarioDetalhes(u); // abre modal imediatamente com dados parciais
    setCarregandoDetalhes(true);
    try {
      const { data } = await api.get(`/usuarios/${u.id}`);
      setUsuarioDetalhes(data); // atualiza com dados completos da API
    } catch {
      // mantém dados parciais se falhar
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const showToast = (msg, tipo = 'sucesso') => setToast({ msg, tipo });

  // Carrega lista de usuários
  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data.usuarios || []);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao carregar usuários.';
      showToast(msg, 'erro');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  // Navega para ação via URL
  const irPara = (novaAcao, usuario = null) => {
    setUsuarioEditando(usuario);
    setSearchParams({ acao: novaAcao });
  };

  // Inclui
  const handleIncluir = async (payload) => {
    setSalvando(true);
    try {
      await api.post('/usuarios', payload);
      showToast('Usuário incluído com sucesso!');
      await carregarUsuarios();
      irPara('consultar');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao incluir usuário.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Altera
  const handleAlterar = async (payload) => {
    if (!usuarioEditando) return;
    setSalvando(true);
    try {
      await api.put(`/usuarios/${usuarioEditando.id}`, payload);
      showToast('Usuário atualizado com sucesso!');
      await carregarUsuarios();
      irPara('consultar');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar usuário.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // Confirma exclusão
  const handleExcluir = async () => {
    if (!usuarioExcluindo) return;
    setExcluindo(true);
    try {
      await api.delete(`/usuarios/${usuarioExcluindo.id}`);
      showToast('Usuário desativado com sucesso.');
      setUsuarioExcluindo(null);
      await carregarUsuarios();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir usuário.', 'erro');
    } finally {
      setExcluindo(false);
    }
  };

  // Abre form de alteração via tabela
  const handleEditarDaTabela = (u) => {
    setUsuarioEditando(u);
    setSearchParams({ acao: 'alterar' });
  };

  // ─── Renderização por ação ────────────────────────────────────────────────
  const renderConteudo = () => {
    if (acao === 'incluir') {
      return (
        <FormularioUsuario
          modo="incluir"
          onSalvar={handleIncluir}
          onCancelar={() => irPara('consultar')}
          loading={salvando}
        />
      );
    }

    if (acao === 'alterar') {
      if (!usuarioEditando) {
        // Modo seleção: mostra tabela para escolher quem editar
        return (
          <div>
            <p style={{
              background: T.blueDim, border: `1px solid #bfdbfe`,
              borderRadius: T.radiusSm, padding: '10px 16px',
              fontSize: 13, color: T.blue, fontFamily: T.fontBody, marginBottom: 20,
            }}>
              🔍 Selecione um usuário na lista para alterar.
            </p>
            <TabelaComBusca />
          </div>
        );
      }
      return (
        <FormularioUsuario
          modo="alterar"
          usuarioInicial={usuarioEditando}
          onSalvar={handleAlterar}
          onCancelar={() => { setUsuarioEditando(null); irPara('consultar'); }}
          loading={salvando}
        />
      );
    }

    if (acao === 'excluir') {
      return (
        <div>
          <p style={{
            background: '#fee2e2', border: `1px solid #fca5a5`,
            borderRadius: T.radiusSm, padding: '10px 16px',
            fontSize: 13, color: '#b91c1c', fontFamily: T.fontBody, marginBottom: 20,
          }}>
            ⚠️ Selecione o usuário que deseja desativar. O registro é preservado no histórico.
          </p>
          <TabelaComBusca />
        </div>
      );
    }

    // consultar (padrão)
    return <TabelaComBusca />;
  };

  // Tabela com busca (reutilizável nos modos)
  const TabelaComBusca = () => (
    <div>
      {/* Barra de busca + botão incluir */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textDim }}>🔍</span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou papel..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
              fontSize: 13, fontFamily: T.fontBody, color: T.text,
              background: T.surface, outline: 'none',
            }}
          />
        </div>
        {acao === 'consultar' && (
          <button
            onClick={() => irPara('incluir')}
            style={{
              padding: '8px 18px', background: T.green,
              border: 'none', borderRadius: T.radiusSm,
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: T.fontBody,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ➕ Novo Usuário
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
          <TabelaUsuarios
            usuarios={usuarios}
            busca={busca}
            onEditar={acao === 'alterar' ? handleEditarDaTabela : handleEditarDaTabela}
            onExcluir={u => setUsuarioExcluindo(u)}
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        .tabs-acoes { flex-direction: row; width: fit-content; }
        .tab-btn { width: auto; justify-content: center; }
        @media (max-width: 480px) {
          .tabs-acoes { flex-direction: column !important; width: 100% !important; }
          .tab-btn { width: 100% !important; justify-content: flex-start !important; }
        }
      `}</style>

      <NavbarMetasPro />

      <div style={{
        minHeight: 'calc(100vh - 56px)',
        background: T.bg,
        padding: '28px 24px',
        fontFamily: T.fontBody,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Cabeçalho */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontFamily: T.fontDisplay, fontWeight: 900,
              fontSize: 26, color: T.navy, marginBottom: 4,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              👤 Gestão de Usuários
            </h1>
            <p style={{ color: T.textMd, fontSize: 13 }}>
              Gerencie os usuários da sua empresa — inclua, altere, consulte e desative acessos.
            </p>
          </div>

          {/* Tabs de ação — responsivo */}
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
                  onClick={() => {
                    setUsuarioEditando(null);
                    setSearchParams({ acao: tab.key });
                  }}
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

          {/* Rodapé info */}
          <div style={{
            marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            {PAPEIS.map(p => (
              <div key={p.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge papel={p.value} />
                <span style={{ fontSize: 11, color: T.textDim }}>
                  {p.value === 'ADMIN' && '— acesso total'}
                  {p.value === 'DESIGNADO_CONFIGURADOR' && '— configura metas'}
                  {p.value === 'DESIGNADO_LANCADOR' && '— lança resultados'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      {usuarioDetalhes && (
        <ModalDetalhes
          usuario={usuarioDetalhes}
          carregando={carregandoDetalhes}
          onFechar={() => setUsuarioDetalhes(null)}
          onEditar={(u) => { setUsuarioDetalhes(null); handleEditarDaTabela(u); }}
        />
      )}

      {/* Modal de exclusão */}
      {usuarioExcluindo && (
        <ModalConfirmar
          usuario={usuarioExcluindo}
          onConfirmar={handleExcluir}
          onCancelar={() => setUsuarioExcluindo(null)}
          loading={excluindo}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />
      )}
    </>
  );
}
