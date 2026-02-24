import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  // Função de Autenticação Tradicional (Email/Senha)
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const { data } = await api.post(endpoint, formData);
      // Salva os tokens completos conforme seu padrão original
      localStorage.setItem('auth_tokens', JSON.stringify(data));
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro na autenticação.');
    }
  };

  // Função de Autenticação com Google
  const onSuccessGoogle = async (response) => {
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      localStorage.setItem('auth_tokens', JSON.stringify(data));
      navigate('/dashboard');
    } catch (err) {
      alert('Erro no Google Login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-slate-100">
        
        {/* Cabeçalho com o Ícone Integrado */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="/logo192.jpg" 
            alt="MetasPro Logo" 
            className="w-20 h-20 mb-4 rounded-2xl shadow-md object-cover"
            onError={(e) => e.target.style.display = 'none'} // Evita tela branca se a imagem sumir
          />
          <h1 className="text-3xl font-extrabold text-slate-900">
            Metas<span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-500">
            {isRegistering ? 'Crie sua conta' : 'Acesse o sistema'}
          </p>
        </div>

        {/* Formulário de Login/Registro */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <input 
              type="text" 
              placeholder="Nome" 
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" 
              required 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          )}
          <input 
            type="email" 
            placeholder="E-mail" 
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" 
            required 
            onChange={e => setFormData({...formData, email: e.target.value})} 
          />
          <input 
            type="password" 
            placeholder="Senha" 
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" 
            required 
            onChange={e => setFormData({...formData, password: e.target.value})} 
          />
          <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all text-lg">
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        {/* Alternar entre Login e Registro */}
        <div className="mt-6 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-blue-600 font-semibold hover:underline">
            {isRegistering ? 'Já tem conta? Login' : 'Não tem conta? Registre-se'}
          </button>
        </div>

        {/* Divisor Visual */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-xs text-slate-400 uppercase tracking-widest">
            <span className="bg-white px-3">Ou continue com</span>
          </div>
        </div>

        {/* Opções Extras: Google e Sandbox */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-center">
            <GoogleLogin 
              onSuccess={onSuccessGoogle} 
              onError={() => alert('Erro Google')} 
              theme="outline" 
              shape="pill" 
              width="100%"
            />
          </div>
          <button 
            type="button"
            onClick={() => navigate('/sandbox')} 
            className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            🧪 Testar Sandbox (Sem Login)
          </button>
        </div>
      </div>
    </div>
  );
}
