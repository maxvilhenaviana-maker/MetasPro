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
              <h1 className="text-4xl font-black text-slate-800">Metas<span className="text-blue-600">Pro</span></h1>
              <p className="text-slate-500 mt-4 text-xl">🚀 Dashboard Principal em Construção</p>
            </div>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}