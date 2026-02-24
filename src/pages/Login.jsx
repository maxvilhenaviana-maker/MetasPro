import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const { data } = await api.post(endpoint, formData);
      localStorage.setItem('auth_token', data.token);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro na autenticação');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8 flex flex-col items-center">
          {/* Logo com tratamento de erro básico */}
          <img 
            src="/logo192.jpg" 
            alt="Logo MetasPro" 
            className="w-24 h-24 mb-4 rounded-2xl shadow-md object-cover"
            onError={(e) => e.target.style.display = 'none'} 
          />
          <h1 className="text-3xl font-extrabold text-slate-900">
            Metas<span className="text-blue-600">Pro</span>
          </h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-blue-600 font-semibold">
            {isRegistering ? 'Já tem conta? Login' : 'Não tem conta? Registre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}
