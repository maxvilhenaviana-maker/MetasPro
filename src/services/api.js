// src/services/api.js
// Corrigido para compatibilidade com a estrutura de token do index.js atual
// O index.js salva: { token, user } → lemos "token" diretamente
// Envia X-Empresa-Id em toda requisição autenticada para suporte multi-tenant.

import axios from 'axios';

const SESSION_KEY = 'session_context';

const api = axios.create({
  baseURL: '/api'
});

// ─── Interceptor de REQUEST: injeta token e empresa ativa ─────────────────────
api.interceptors.request.use((config) => {
  try {
    // ── Token JWT ──────────────────────────────────────────────────────────────
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      const bearerToken = parsed.accessToken || parsed.token;
      if (bearerToken) {
        config.headers.Authorization = `Bearer ${bearerToken}`;
      }
    }

    // ── Empresa ativa (multi-tenant) ───────────────────────────────────────────
    // Lê do SessionContext salvo no localStorage e injeta como header.
    // O backend usa este header para todas as queries multi-tenant,
    // validando que o usuário logado realmente tem vínculo com ela.
    const rawSession = localStorage.getItem(SESSION_KEY);
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session?.empresa?.id) {
        config.headers['X-Empresa-Id'] = session.empresa.id;
      }
    }
  } catch {
    // Ignora erro de parse — a requisição segue sem o header
  }
  return config;
});

// ─── Interceptor de RESPONSE: trata 401 ──────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const raw = localStorage.getItem('auth_tokens');
        if (!raw) throw new Error('Sem tokens salvos');

        const parsed = JSON.parse(raw);
        const refreshToken = parsed.refreshToken;

        // Só tenta refresh se houver refreshToken (novo formato)
        if (!refreshToken) throw new Error('Sem refresh token');

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        const newAuth = { ...parsed, accessToken: data.accessToken };
        localStorage.setItem('auth_tokens', JSON.stringify(newAuth));

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);

      } catch {
        localStorage.removeItem('auth_tokens');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
