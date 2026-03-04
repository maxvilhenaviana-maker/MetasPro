import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PRESSURE_OPTIONS = [
  { value: 'MODERADO',      label: 'Moderado',      pct: '25%', desc: 'Atingível em 6 a 9 dos 12 períodos' },
  { value: 'INTERMEDIARIO', label: 'Intermediário',  pct: '50%', desc: 'Atingível em 3 a 6 dos 12 períodos' },
  { value: 'DESAFIADOR',    label: 'Desafiador',     pct: '75%', desc: 'Atingível em 1 a 3 dos 12 períodos' },
  { value: 'ALAVANCADO',    label: 'Alavancado',     pct: '100%',desc: 'Atingível apenas no ápice histórico' },
];

// ─── Formata número para exibição nos cards de resultado ─────────────────────
function formatResultValue(value) {
  const num = Number(value);
  if (isNaN(num)) return value;

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1_000_000_000) {
    return `${sign}${(absNum / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}B`;
  }
  if (absNum >= 1_000_000) {
    return `${sign}${(absNum / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}M`;
  }
  if (absNum >= 1_000) {
    return `${sign}${(absNum / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}K`;
  }
  return `${sign}${absNum.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
}

// ─── Escolhe tamanho de fonte conforme comprimento do valor digitado ──────────
function inputFontSize(value) {
  const len = String(value).replace('.', '').replace(',', '').replace('-', '').length;
  if (len >= 10) return '9px';
  if (len >= 8)  return '10px';
  if (len >= 6)  return '11px';
  return '13px';
}

// ─── Monta mensagem formatada para o WhatsApp ─────────────────────────────────
function buildWhatsAppMessage(result, objective, pressure) {
  const pressureLabel = {
    MODERADO:      'Moderado (25%)',
    INTERMEDIARIO: 'Intermediário (50%)',
    DESAFIADOR:    'Desafiador (75%)',
    ALAVANCADO:    'Alavancado (100%)',
  }[pressure] || pressure;

  const objectiveLabel = objective === 'AUMENTAR' ? '📈 Aumentar' : '📉 Reduzir';

  const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  let msg = '';
  msg += `🎯 *MetasPro — Resultado do Cálculo*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Objetivo:* ${objectiveLabel}\n`;
  msg += `*Nível de pressão:* ${pressureLabel}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *Média histórica limpa:* ${fmt(result.mediaCalculada)}\n`;
  msg += `📐 *Intervalo M:* ${fmt(result.intervaloM)}\n`;
  msg += `✅ *Meta sugerida:* *${fmt(result.metaFinal)}*\n`;

  if (result.outliersExcluidos?.length > 0) {
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🔍 *Outliers excluídos:* ${result.outliersExcluidos.map(fmt).join(', ')}\n`;
    msg += `_${result.justificativaOutliers}_\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💡 *Análise:*\n${result.justificativaMeta}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Calculado pelo MetasPro — metaspro.com.br_`;

  return encodeURIComponent(msg);
}

export default function GoalSandbox() {
  const navigate = useNavigate();
  const resultRef = useRef(null);

  const [data, setData]           = useState(Array(12).fill(''));
  const [objective, setObjective] = useState('AUMENTAR');
  const [pressure, setPressure]   = useState('MODERADO');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');

  const handleDataChange = (index, value) => {
    const next = [...data];
    next[index] = value;
    setData(next);
  };

  const filledValues = data.filter(v => v !== '' && !isNaN(v) && v !== null);

  const handleCalculate = async () => {
    setError('');
    setResult(null);

    const nums = data.map(v => (v === '' ? null : Number(v)));
    const valid = nums.filter(v => v !== null && !isNaN(v));

    if (valid.length < 6) {
      setError('Preencha pelo menos 6 períodos para uma análise confiável.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sandbox-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicalData: nums.filter(v => v !== null),
          objective,
          pressureLevel: pressure,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error || 'Erro ao calcular. Tente novamente.');
      } else {
        setResult(json);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch (err) {
      setError('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const msg = buildWhatsAppMessage(result, objective, pressure);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-4 md:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">
            Metas<span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            🧪 Sandbox — experimente o cálculo inteligente de metas, sem cadastro
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 space-y-8">

          {/* Botão Voltar */}
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
          >
            ← Voltar
          </button>

          {/* Objetivo */}
          <section>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
              1. Objetivo da Meta
            </h2>
            <div className="flex gap-3">
              {['AUMENTAR', 'REDUZIR'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setObjective(opt)}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all border
                    ${objective === opt
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >
                  {opt === 'AUMENTAR' ? '📈 Aumentar resultados' : '📉 Reduzir resultados'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">
              {objective === 'AUMENTAR'
                ? 'Ex.: volume de vendas, receita, produção'
                : 'Ex.: custo de aquisição, taxa de rejeição, devoluções'}
            </p>
          </section>

          {/* Nível de Pressão */}
          <section>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
              2. Nível de Pressão
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {PRESSURE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPressure(opt.value)}
                  className={`p-4 rounded-2xl text-left transition-all border
                    ${pressure === opt.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">{opt.label}</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full
                      ${pressure === opt.value ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                      {opt.pct}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${pressure === opt.value ? 'text-blue-100' : 'text-slate-400'}`}>
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Dados históricos */}
          <section>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
              3. Resultados Históricos
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Insira os últimos resultados (mínimo 6, ideal 12). Deixe em branco os períodos sem dado.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {data.map((v, i) => (
                <div key={i} className="relative">
                  <span className="absolute left-2 top-1 text-[9px] text-slate-400 pointer-events-none leading-none">
                    P{i + 1}
                  </span>
                  <input
                    type="number"
                    value={v}
                    onChange={e => handleDataChange(i, e.target.value)}
                    placeholder="—"
                    style={{ fontSize: inputFontSize(v) }}
                    className="w-full pt-4 pb-1 px-2 bg-slate-50 border border-slate-200 rounded-xl
                               text-right focus:outline-none focus:border-blue-400 transition-all
                               [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                               [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {filledValues.length} de 12 períodos preenchidos
            </p>
          </section>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-3">
              ⚠️ {error}
            </div>
          )}

          {/* Botão calcular */}
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg transition-all text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analisando com IA...
              </span>
            ) : '🚀 Calcular Meta com IA'}
          </button>

          {/* Resultado */}
          {result && (
            <div ref={resultRef} className="space-y-5 pt-2 border-t border-slate-100">

              {/* Outliers */}
              {result.outliersExcluidos?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <h3 className="font-bold text-amber-800 mb-2 text-sm">
                    🔍 Outliers identificados pela IA
                  </h3>
                  <p className="text-amber-700 text-sm mb-3">
                    Valores excluídos da média:{' '}
                    <span className="font-mono font-bold">
                      {result.outliersExcluidos
                        .map(v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 }))
                        .join(' · ')}
                    </span>
                  </p>
                  <p className="text-amber-600 text-xs leading-relaxed">
                    {result.justificativaOutliers}
                  </p>
                </div>
              )}

              {/* Números principais */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Média limpa',   value: result.mediaCalculada, bg: 'bg-slate-50', text: 'text-slate-800' },
                  { label: 'Intervalo M',   value: result.intervaloM,     bg: 'bg-slate-50', text: 'text-slate-800' },
                  { label: 'Meta sugerida', value: result.metaFinal,      bg: 'bg-blue-600', text: 'text-white', sub: 'text-blue-100' },
                ].map(({ label, value, bg, text, sub }) => (
                  <div key={label} className={`${bg} rounded-2xl p-4 text-center shadow-sm`}
                       title={Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}>
                    <p className={`text-xs mb-1 ${sub || 'text-slate-400'}`}>{label}</p>
                    <p className={`font-extrabold ${text} leading-tight`}
                       style={{ fontSize: formatResultValue(value).length > 7 ? '14px' : '20px' }}>
                      {formatResultValue(value)}
                    </p>
                    {formatResultValue(value) !== Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) && (
                      <p className={`text-[9px] mt-0.5 ${sub || 'text-slate-400'} opacity-70 font-mono`}>
                        {Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Justificativa da meta */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <h3 className="font-bold text-blue-800 mb-2 text-sm">
                  💡 Por que esta meta foi sugerida?
                </h3>
                <p className="text-blue-700 text-sm leading-relaxed">
                  {result.justificativaMeta}
                </p>
              </div>

              {/* ── Botão WhatsApp ── */}
              <button
                onClick={handleWhatsApp}
                className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all flex items-center justify-center gap-3"
                style={{ backgroundColor: '#25D366' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1ebe5d'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25D366'}
              >
                {/* Ícone WhatsApp SVG oficial */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartilhar resultado via WhatsApp
              </button>

              {/* CTA para criar conta */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-center text-white">
                <p className="font-bold text-lg mb-1">Gostou? Crie sua conta.</p>
                <p className="text-blue-100 text-sm mb-4">
                  Com conta você salva metas, registra resultados e acompanha seu desempenho em dashboards.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="bg-white text-blue-700 font-bold px-8 py-3 rounded-xl shadow hover:bg-blue-50 transition-all"
                >
                  Criar conta →
                </button>
              </div>

            </div>
          )}

        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          <button onClick={() => navigate('/login')} className="underline hover:text-slate-600">
            Já tenho conta — entrar
          </button>
        </p>
      </div>
    </div>
  );
}