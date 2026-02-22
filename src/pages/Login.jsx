import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('auth_tokens', JSON.stringify(data));
      navigate('/dashboard');
    } catch (err) {
      alert('Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-12">
          
          {/* Logo real carregada da pasta public */}
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src="/logo.jpg" 
              alt="MetasPro Logo" 
              className="h-24 w-auto object-contain"
              onError={(e) => e.target.style.display = 'none'} // Esconde se a imagem falhar
            />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Metas<span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">A excelência na gestão de resultados</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input 
              type="email" 
              placeholder="E-mail corporativo" 
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-700"
              required
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Senha" 
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-700"
              required
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-slate-400 tracking-widest">ou acesse com</span>
          </div>
        </div>

        <button 
          type="button"
          className="w-full py-4 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-600 hover:bg-slate-50 transition-all"
        >
          {/* Link direto para o ícone do Google */}
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            className="h-6 w-6" 
            alt="Google" 
          />
          Google Workspace
        </button>
      </div>
    </div>
  );
}
