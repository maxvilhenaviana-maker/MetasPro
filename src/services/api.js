// src/services/api.js
// Corrigido para compatibilidade com a estrutura de token do index.js atual
// O index.js salva: { token, user } → lemos "token" diretamente

import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// ─── Interceptor de REQUEST: injeta o token ───────────────────────────────────
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Suporta ambos os formatos:
      // Formato antigo (index.js atual): { token, user }
      // Formato novo (futuro):           { accessToken, refreshToken }
      const bearerToken = parsed.accessToken || parsed.token;
      if (bearerToken) {
        config.headers.Authorization = `Bearer ${bearerToken}`;
      }
    }
  } catch {
    // Ignora erro de parse
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
