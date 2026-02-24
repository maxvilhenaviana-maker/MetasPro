import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GoalSandbox() {
  const [data, setData] = useState(Array(12).fill(''));
  const [objective, setObjective] = useState('AUMENTAR');
  const [pressure, setPressure] = useState('MODERADO');
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const calculate = () => {
    const vals = data.filter(v => v !== '' && !isNaN(v)).map(Number);
    if (vals.length === 0) return alert("Insira dados!");
    
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const factor = { 'MODERADO': 0.25, 'INTERMEDIARIO': 0.50, 'DESAFIADOR': 0.75, 'ALAVANCADO': 1.00 }[pressure];
    const diff = objective === 'AUMENTAR' ? (Math.max(...vals) - mean) : (mean - Math.min(...vals));
    const goal = objective === 'AUMENTAR' ? mean + (factor * diff) : mean - (factor * diff);

    setResult({ mean, goal });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl">
        <h2 className="text-2xl font-bold mb-6">🧪 Sandbox MetasPro</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <select className="p-3 bg-slate-100 rounded-xl" onChange={e => setObjective(e.target.value)}>
            <option value="AUMENTAR">Aumentar</option>
            <option value="REDUZIR">Reduzir</option>
          </select>
          <select className="p-3 bg-slate-100 rounded-xl" onChange={e => setPressure(e.target.value)}>
            <option value="MODERADO">Moderado</option>
            <option value="INTERMEDIARIO">Intermediário</option>
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {data.map((v, i) => (
            <input key={i} type="number" placeholder={`Mês ${i+1}`} className="p-2 border rounded-lg" onChange={e => {
              const n = [...data]; n[i] = e.target.value; setData(n);
            }} />
          ))}
        </div>
        <button onClick={calculate} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl">Calcular Meta</button>
        {result && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p>Média: {result.mean.toFixed(2)}</p>
            <p className="text-xl font-bold">Meta Proposta: {result.goal.toFixed(2)}</p>
          </div>
        )}
        <button onClick={() => navigate('/login')} className="mt-4 w-full text-slate-400">Voltar</button>
      </div>
    </div>
  );
}