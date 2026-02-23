import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'; // O segredo está neste caminho relativo

const PrivateRoute = ({ children }) => {
  const tokens = localStorage.getItem('auth_tokens');
  return tokens ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rota Pública */}
        <Route path="/login" element={<Login />} />
        
        {/* Rota Protegida */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <div className="min-h-screen bg-slate-50 p-10 flex flex-col items-center justify-center">
                <h1 className="text-4xl font-black text-slate-800">Metas<span className="text-blue-600">Pro</span></h1>
                <p className="text-slate-500 mt-4 text-xl italic font-medium">
                  "Sua bússola para o sucesso está sendo calibrada..."
                </p>
                <div className="mt-10 p-6 bg-white rounded-3xl shadow-xl border border-blue-100">
                   🚀 Dashboard Principal em Construção
                </div>
              </div>
            </PrivateRoute>
          } 
        />

        {/* Redirecionamento padrão */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}