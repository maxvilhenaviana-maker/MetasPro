// src/contexts/SessionContext.jsx
// Contexto global de sessão — MetasPro
// Gerencia empresa ativa, papel e unidade de monitoramento do usuário logado.
// Deve envolver toda a aplicação em App.jsx.
//
// DECISÃO DE DESIGN:
// - O localStorage guarda empresa e papel para sobreviver a F5 sem pedir empresa novamente.
// - Unidade NUNCA é persistida nem restaurada — o usuário escolhe a cada sessão.
// - inicializarSessao() limpa tudo antes de iniciar — chamado no início de todo login.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SessionContext = createContext(null);
const SESSION_KEY = 'session_context';

function salvarSessao(dados) {
  try {
    // Nunca persiste unidade — é sempre escolhida na sessão
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      empresa: dados.empresa || null,
      papel:   dados.papel   || null,
    }));
  } catch {}
}

function carregarSessao() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function SessionProvider({ children }) {
  const [empresa, setEmpresaState]                    = useState(null);
  const [papel, setPapelState]                        = useState(null);
  const [unidade, setUnidadeState]                    = useState(null); // nunca vem do localStorage
  const [empresasDisponiveis, setEmpresasDisponiveis] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [carregando, setCarregando]                   = useState(false);

  // Restaura empresa/papel ao montar (suporta F5 sem regredir ao modal).
  // Unidade nunca é restaurada — banner sempre aparece até o usuário escolher.
  useEffect(() => {
    const salvo = carregarSessao();
    if (salvo?.empresa) setEmpresaState(salvo.empresa);
    if (salvo?.papel)   setPapelState(salvo.papel);
  }, []);

  // ── Limpar sessão (logout) ──────────────────────────────────────────────────
  const limparSessao = useCallback(() => {
    setEmpresaState(null);
    setPapelState(null);
    setUnidadeState(null);
    setEmpresasDisponiveis([]);
    setUnidadesDisponiveis([]);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  // ── Carregar unidades ───────────────────────────────────────────────────────
  const carregarUnidades = useCallback(async (empresaId) => {
    if (!empresaId) return [];
    try {
      // _t=timestamp evita cache do browser nesta rota crítica
      const { data } = await api.get(`/session/unidades?empresa_id=${empresaId}&_t=${Date.now()}`);
      const lista = data.unidades || [];
      setUnidadesDisponiveis(lista);
      return lista;
    } catch {
      setUnidadesDisponiveis([]);
      return [];
    }
  }, []);

  // ── Selecionar unidade ──────────────────────────────────────────────────────
  const selecionarUnidade = useCallback((unidadeSelecionada) => {
    setUnidadeState(unidadeSelecionada);
    // unidade não é persistida no localStorage (intencional)
  }, []);

  // ── Selecionar empresa ──────────────────────────────────────────────────────
  const selecionarEmpresa = useCallback(async ({ id, nome_fantasia, razao_social, cnpj, papel: papelRecebido }) => {
    const emp = { id, nome_fantasia, razao_social, cnpj };
    setEmpresaState(emp);
    setPapelState(papelRecebido);
    setUnidadeState(null);
    setUnidadesDisponiveis([]);
    salvarSessao({ empresa: emp, papel: papelRecebido });

    // Carrega unidades e auto-seleciona se for única
    const lista = await carregarUnidades(id);
    if (lista.length === 1) {
      selecionarUnidade(lista[0]);
    }
  }, [carregarUnidades, selecionarUnidade]);

  // ── Carregar empresas ───────────────────────────────────────────────────────
  const carregarEmpresas = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/session/empresas');
      const lista = data.empresas || [];
      setEmpresasDisponiveis(lista);
      return lista;
    } catch {
      setEmpresasDisponiveis([]);
      return [];
    } finally {
      setCarregando(false);
    }
  }, []);

  // ── Inicializar após login ──────────────────────────────────────────────────
  // Chamado pelo Login.jsx logo após salvar o token.
  // Limpa qualquer resquício de sessão anterior antes de iniciar.
  const inicializarSessao = useCallback(async () => {
    // Reset completo — garante estado limpo independente da sessão anterior
    setEmpresaState(null);
    setPapelState(null);
    setUnidadeState(null);
    setEmpresasDisponiveis([]);
    setUnidadesDisponiveis([]);
    localStorage.removeItem(SESSION_KEY);

    const lista = await carregarEmpresas();

    if (lista.length === 0) return { precisaOnboarding: true };

    if (lista.length === 1) {
      await selecionarEmpresa(lista[0]);
      return { precisaEscolherEmpresa: false };
    }

    // Múltiplas empresas → Login.jsx abre o modal de seleção
    return { precisaEscolherEmpresa: true, empresas: lista };
  }, [carregarEmpresas, selecionarEmpresa]);

  const value = {
    empresa,
    papel,
    unidade,
    empresasDisponiveis,
    unidadesDisponiveis,
    carregando,

    selecionarEmpresa,
    selecionarUnidade,
    carregarEmpresas,
    carregarUnidades,
    inicializarSessao,
    limparSessao,

    temEmpresa: !!empresa,
    temUnidade: !!unidade,
    isAdmin:    papel === 'ADMIN',
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession deve ser usado dentro de <SessionProvider>');
  return ctx;
}

export default SessionContext;
