import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import GoalSandbox from './pages/GoalSandbox';

const PrivateRoute = ({ children }) => {
  const tokens = localStorage.getItem('auth_tokens');
  return tokens ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/sandbox" element={<GoalSandbox />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <div className="min-h-screen bg-slate-50 p-10 flex flex-col items-center justify-center text-center">
              {/* 2) Utilizar a imagem logo.jpg na página principal */}
              <img 
                src="/logo.jpg" 
                alt="Logo MetasPro" 
                className="w-32 h-32 mb-6 object-contain" 
              />

              <h1 className="text-4xl font-black text-slate-800">Metas<span className="text-blue-600">Pro</span></h1>
              <p className="text-slate-500 mt-4 text-xl">🚀 Dashboard Principal em Construção</p>

              {/* 1) Criar um link ou botão voltar na página principal para voltar a página de login */}
              <button 
                onClick={() => window.location.href = '/login'}
                className="mt-8 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
              >
                ← Voltar para Login
              </button>
            </div>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}