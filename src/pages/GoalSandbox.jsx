import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PRESSURE_OPTIONS = [
  { value: 'MODERADO',      label: 'Moderado',     pct: '25%',  desc: 'Atingível em 6 a 9 dos 12 períodos' },
  { value: 'INTERMEDIARIO', label: 'Intermediário', pct: '50%',  desc: 'Atingível em 3 a 6 dos 12 períodos' },
  { value: 'DESAFIADOR',    label: 'Desafiador',    pct: '75%',  desc: 'Atingível em 1 a 3 dos 12 períodos' },
  { value: 'ALAVANCADO',    label: 'Alavancado',    pct: '100%', desc: 'Atingível apenas no ápice histórico' },
];

function formatNum(val) {
  return Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export default function GoalSandbox() {
  const navigate = useNavigate();

  const [inputs, setInputs]       = useState(Array(12).fill(''));
  const [objective, setObjective] = useState('AUMENTAR');
  const [pressure, setPressure]   = useState('MODERADO');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');

  function handleInputChange(index, value) {
    const next = [...inputs];
    next[index] = value;
    setInputs(next);
  }

  const filledCount = inputs.filter(v => v !== '' && !isNaN(v)).length;

  async function handleCalculate() {
    setErrorMsg('');
    setResult(null);

    const nums = inputs
      .filter(v => v !== '' && !isNaN(v))
      .map(Number);

    if (nums.length < 6) {
      setErrorMsg('Preencha pelo menos 6 períodos para uma análise confiável.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sandbox-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historicalData: nums, objective, pressureLevel: pressure }),
      });
      const json = await response.json();
      if (!response.ok) {
        setErrorMsg(json.error || 'Erro ao calcular. Tente novamente.');
      } else {
        setResult(json);
      }
    } catch {
      setErrorMsg('Falha de conexão com o servidor. Tente novamente.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f1f5f9,#eff6ff)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>
            Metas<span style={{ color: '#2563eb' }}>Pro</span>
          </h1>
          <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 14 }}>
            🧪 Sandbox — experimente o cálculo inteligente de metas, sem cadastro
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', padding: 32 }}>

          {/* ── 1. Objetivo ── */}
          <div style={{ marginBottom: 28 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              1. Objetivo da Meta
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['AUMENTAR', 'REDUZIR'].map(opt => {
                const active = objective === opt;
                return (
                  <button key={opt} onClick={() => setObjective(opt)} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                    cursor: 'pointer', border: `2px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                    background: active ? '#2563eb' : '#f8fafc', color: active ? '#fff' : '#475569',
                  }}>
                    {opt === 'AUMENTAR' ? '📈 Aumentar' : '📉 Reduzir'}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
              {objective === 'AUMENTAR' ? 'Ex.: volume de vendas, receita, produção' : 'Ex.: custo de aquisição, taxa de rejeição, devoluções'}
            </p>
          </div>

          {/* ── 2. Pressão ── */}
          <div style={{ marginBottom: 28 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              2. Nível de Pressão
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PRESSURE_OPTIONS.map(opt => {
                const active = pressure === opt.value;
                return (
                  <button key={opt.value} onClick={() => setPressure(opt.value)} style={{
                    padding: '14px 12px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                    border: `2px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                    background: active ? '#2563eb' : '#f8fafc', color: active ? '#fff' : '#334155',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{opt.label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: active ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: active ? '#fff' : '#475569',
                      }}>{opt.pct}</span>
                    </div>
                    <p style={{ fontSize: 11, margin: 0, color: active ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. Histórico ── */}
          <div style={{ marginBottom: 28 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
              3. Resultados Históricos
            </span>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
              Insira os últimos resultados (mínimo 6, ideal 12). Deixe em branco os períodos sem dado.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {inputs.map((v, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8', pointerEvents: 'none' }}>
                    P{i + 1}
                  </span>
                  <input
                    type="number"
                    value={v}
                    placeholder="—"
                    onChange={e => handleInputChange(i, e.target.value)}
                    style={{ width: '100%', paddingLeft: 28, paddingRight: 6, paddingTop: 10, paddingBottom: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{filledCount} de 12 períodos preenchidos</p>
          </div>

          {/* ── Erro ── */}
          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ── Botão ── */}
          <button onClick={handleCalculate} disabled={loading} style={{
            width: '100%', padding: 16, background: loading ? '#93c5fd' : '#2563eb',
            color: '#fff', fontWeight: 700, fontSize: 16, borderRadius: 14, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
          }}>
            {loading ? '⏳ Analisando com IA...' : '🚀 Calcular Meta com IA'}
          </button>

          {/* ── Resultado ── */}
          {result && (
            <div style={{ marginTop: 28, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>

              {/* Outliers */}
              {result.outliersExcluidos?.length > 0 ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: 18, marginBottom: 16 }}>
                  <p style={{ fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 6 }}>🔍 Outliers identificados pela IA</p>
                  <p style={{ color: '#78350f', fontSize: 13, marginBottom: 8 }}>
                    Valores excluídos: <strong style={{ fontFamily: 'monospace' }}>{result.outliersExcluidos.join(' · ')}</strong>
                  </p>
                  <p style={{ color: '#92400e', fontSize: 12, lineHeight: 1.6, margin: 0 }}>{result.justificativaOutliers}</p>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: 14, marginBottom: 16 }}>
                  <p style={{ color: '#166534', fontSize: 13, margin: 0 }}>✅ Nenhum outlier identificado — todos os valores foram considerados.</p>
                </div>
              )}

              {/* Cards de números */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Média limpa',   val: result.mediaCalculada, blue: false },
                  { label: 'Intervalo M',   val: result.intervaloM,     blue: false },
                  { label: 'Meta sugerida', val: result.metaFinal,      blue: true  },
                ].map(item => (
                  <div key={item.label} style={{ background: item.blue ? '#2563eb' : '#f8fafc', borderRadius: 16, padding: '16px 8px', textAlign: 'center', boxShadow: item.blue ? '0 4px 16px rgba(37,99,235,0.3)' : 'none' }}>
                    <p style={{ fontSize: 11, color: item.blue ? '#bfdbfe' : '#94a3b8', margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: item.blue ? '#fff' : '#0f172a', margin: 0 }}>{formatNum(item.val)}</p>
                  </div>
                ))}
              </div>

              {/* Justificativa */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: 18, marginBottom: 20 }}>
                <p style={{ fontWeight: 700, color: '#1e40af', fontSize: 13, marginBottom: 6 }}>💡 Por que esta meta foi sugerida?</p>
                <p style={{ color: '#1d4ed8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{result.justificativaMeta}</p>
              </div>

              {/* CTA */}
              <div style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 18, padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: 17, color: '#fff', margin: '0 0 6px' }}>Gostou? Crie sua conta gratuitamente.</p>
                <p style={{ color: '#bfdbfe', fontSize: 13, margin: '0 0 18px' }}>Com conta você salva metas, registra resultados e acompanha seu desempenho em dashboards.</p>
                <button onClick={() => navigate('/login')} style={{ background: '#fff', color: '#2563eb', fontWeight: 700, padding: '12px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15 }}>
                  Criar conta grátis →
                </button>
              </div>

            </div>
          )}

        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
            Já tenho conta — entrar
          </button>
        </p>

      </div>
    </div>
  );
}