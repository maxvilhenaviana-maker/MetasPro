// src/contexts/SessionContext.jsx
// Contexto global de sessão — MetasPro
// Gerencia empresa ativa, papel e unidade de monitoramento do usuário logado.
// Deve envolver toda a aplicação em App.jsx.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ─── Contexto ─────────────────────────────────────────────────────────────────
const SessionContext = createContext(null);

// ─── Chaves do localStorage ───────────────────────────────────────────────────
const SESSION_KEY = 'session_context';

function salvarSessao(dados) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(dados));
  } catch {}
}

function carregarSessao() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SessionProvider({ children }) {
  // Estado central
  const [empresa, setEmpresaState] = useState(null);       // { id, nome_fantasia, razao_social, cnpj }
  const [papel, setPapelState] = useState(null);           // 'ADMIN' | 'DESIGNADO_CONFIGURADOR' | 'DESIGNADO_LANCADOR'
  const [unidade, setUnidadeState] = useState(null);       // { id, nome_unidade, codigo_unidade } | null
  const [empresasDisponiveis, setEmpresasDisponiveis] = useState([]); // lista para modal
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]); // lista para modal
  const [carregando, setCarregando] = useState(false);

  // Inicializa a partir do localStorage (sobrevive a F5)
  useEffect(() => {
    const salvo = carregarSessao();
    if (salvo) {
      if (salvo.empresa) setEmpresaState(salvo.empresa);
      if (salvo.papel)   setPapelState(salvo.papel);
      if (salvo.unidade) setUnidadeState(salvo.unidade);
    }
  }, []);

  // ── Selecionar empresa ──────────────────────────────────────────────────────
  const selecionarEmpresa = useCallback(async ({ id, nome_fantasia, razao_social, cnpj, papel: papelRecebido }) => {
    const emp = { id, nome_fantasia, razao_social, cnpj };
    setEmpresaState(emp);
    setPapelState(papelRecebido);
    setUnidadeState(null); // limpa unidade ao trocar empresa

    const sessao = { empresa: emp, papel: papelRecebido, unidade: null };
    salvarSessao(sessao);

    // Carrega unidades desta empresa
    await carregarUnidades(id);
  }, []);

  // ── Selecionar unidade ──────────────────────────────────────────────────────
  const selecionarUnidade = useCallback((unidadeSelecionada) => {
    setUnidadeState(unidadeSelecionada);
    const salvo = carregarSessao() || {};
    salvarSessao({ ...salvo, unidade: unidadeSelecionada });
  }, []);

  // ── Carregar empresas disponíveis para o usuário ────────────────────────────
  const carregarEmpresas = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/session/empresas');
      setEmpresasDisponiveis(data.empresas || []);
      return data.empresas || [];
    } catch {
      setEmpresasDisponiveis([]);
      return [];
    } finally {
      setCarregando(false);
    }
  }, []);

  // ── Carregar unidades da empresa selecionada ────────────────────────────────
  const carregarUnidades = useCallback(async (empresaId) => {
    if (!empresaId) return [];
    try {
      const { data } = await api.get(`/session/unidades?empresa_id=${empresaId}`);
      const lista = data.unidades || [];
      setUnidadesDisponiveis(lista);

      // Se houver apenas 1 unidade, seleciona automaticamente
      if (lista.length === 1) {
        selecionarUnidade(lista[0]);
      }
      return lista;
    } catch {
      setUnidadesDisponiveis([]);
      return [];
    }
  }, [selecionarUnidade]);

  // ── Limpar sessão (logout) ──────────────────────────────────────────────────
  const limparSessao = useCallback(() => {
    setEmpresaState(null);
    setPapelState(null);
    setUnidadeState(null);
    setEmpresasDisponiveis([]);
    setUnidadesDisponiveis([]);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  // ── Inicializar após login ──────────────────────────────────────────────────
  // Chamado pelo Login.jsx após autenticação bem-sucedida
  const inicializarSessao = useCallback(async () => {
    const lista = await carregarEmpresas();

    if (lista.length === 0) return { precisaOnboarding: true };

    if (lista.length === 1) {
      // Seleciona automaticamente
      await selecionarEmpresa(lista[0]);
      return { precisaEscolherEmpresa: false };
    }

    // Múltiplas empresas: o Login.jsx vai abrir o modal
    return { precisaEscolherEmpresa: true, empresas: lista };
  }, [carregarEmpresas, selecionarEmpresa]);

  const value = {
    // Estado
    empresa,
    papel,
    unidade,
    empresasDisponiveis,
    unidadesDisponiveis,
    carregando,

    // Ações
    selecionarEmpresa,
    selecionarUnidade,
    carregarEmpresas,
    carregarUnidades,
    inicializarSessao,
    limparSessao,

    // Helpers
    temEmpresa:  !!empresa,
    temUnidade:  !!unidade,
    isAdmin:     papel === 'ADMIN',
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// ─── Hook de acesso ao contexto ───────────────────────────────────────────────
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession deve ser usado dentro de <SessionProvider>');
  return ctx;
}

export default SessionContext;
