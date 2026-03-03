// api/sandbox-calculate.js
// Rota serverless Vercel — Cálculo de meta com análise de outliers via OpenAI
// Arquivo: /api/sandbox-calculate.js

const PRESSURE_LEVELS = {
  MODERADO:      0.25,
  INTERMEDIARIO: 0.50,
  DESAFIADOR:    0.75,
  ALAVANCADO:    1.00,
};

// ─── Motor determinístico (nunca delega à IA) ────────────────────────────────

function calcMean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateGoal(cleanedData, objective, pressurePct) {
  const mean = calcMean(cleanedData);
  let intervalM, finalGoal;

  if (objective === 'AUMENTAR') {
    const maxVal = Math.max(...cleanedData);
    intervalM  = maxVal - mean;
    finalGoal  = mean + pressurePct * intervalM;
  } else {
    const minVal = Math.min(...cleanedData);
    intervalM  = mean - minVal;
    finalGoal  = mean - pressurePct * intervalM;
  }

  return { mean, intervalM, finalGoal };
}

// ─── Chamada OpenAI ────────────────────────────────────────────────────────────

async function callOpenAI(historicalData, objective, pressureLabel) {
  const pressurePct = PRESSURE_LEVELS[pressureLabel];

  const systemPrompt = `
Você é um analista corporativo especialista em governança de metas e estatística aplicada.
Responda EXCLUSIVAMENTE em JSON válido, sem texto extra, sem markdown.
`.trim();

  const userPrompt = `
Analise a série histórica de resultados abaixo para uma meta cujo objetivo é ${objective} os resultados.

Dados históricos: ${JSON.stringify(historicalData)}

Faça:
1) Identifique outliers estatísticos que contaminem a média (use critério IQR ou desvio padrão conforme mais adequado). Inclua o raciocínio.
2) Calcule a média da amostra limpa (sem outliers).
3) Explique em linguagem clara, voltada ao gestor, por que cada outlier foi excluído.
4) Gere uma justificativa para a meta que será calculada, considerando nível de pressão "${pressureLabel}" (${pressurePct * 100}% do intervalo entre a média e o extremo da amostra limpa).

Responda APENAS com este JSON:
{
  "outliers": [lista de valores numéricos excluídos, ou array vazio],
  "cleanedData": [array numérico sem os outliers],
  "justificativaOutliers": "Texto explicando os outliers excluídos (ou 'Nenhum outlier identificado na amostra.').",
  "justificativaMeta": "Texto de 2 a 4 frases explicando ao gestor por que esta meta é adequada, qual esforço ela representa e quantas vezes historicamente seria atingida com este nível de pressão."
}
`.trim();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  const aiRaw = await response.json();
  const content = aiRaw.choices?.[0]?.message?.content || '{}';

  // Limpa eventuais blocos de código que o modelo possa retornar
  const cleaned = content.replace(/```json|```/gi, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Falha ao interpretar resposta JSON da IA.');
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { historicalData, objective, pressureLevel } = req.body || {};

  // Validações
  if (!historicalData || !Array.isArray(historicalData) || historicalData.length < 6) {
    return res.status(400).json({ error: 'Informe pelo menos 6 resultados históricos.' });
  }

  const validNumbers = historicalData.filter(v => typeof v === 'number' && !isNaN(v));
  if (validNumbers.length < 6) {
    return res.status(400).json({ error: 'São necessários ao menos 6 valores numéricos válidos.' });
  }

  const objectiveUpper = (objective || '').toUpperCase();
  if (!['AUMENTAR', 'REDUZIR'].includes(objectiveUpper)) {
    return res.status(400).json({ error: 'Objetivo deve ser AUMENTAR ou REDUZIR.' });
  }

  const pressureUpper = (pressureLevel || '').toUpperCase();
  if (!PRESSURE_LEVELS[pressureUpper]) {
    return res.status(400).json({ error: 'Nível de pressão inválido.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Chave OpenAI não configurada no servidor.' });
  }

  try {
    // 1️⃣  IA — identifica outliers e gera justificativas
    const aiResult = await callOpenAI(validNumbers, objectiveUpper, pressureUpper);

    // Garante que cleanedData tem valores válidos; fallback: usa dados originais
    const cleanedData =
      Array.isArray(aiResult.cleanedData) && aiResult.cleanedData.length >= 1
        ? aiResult.cleanedData.map(Number).filter(v => !isNaN(v))
        : validNumbers;

    // 2️⃣  Motor determinístico — todo cálculo matemático fora da IA
    const pressurePct = PRESSURE_LEVELS[pressureUpper];
    const { mean, intervalM, finalGoal } = calculateGoal(cleanedData, objectiveUpper, pressurePct);

    // 3️⃣  Resposta
    return res.status(200).json({
      dadosOriginais:      validNumbers,
      outliersExcluidos:   aiResult.outliers           || [],
      dadosLimpos:         cleanedData,
      mediaCalculada:      mean,
      intervaloM:          intervalM,
      metaFinal:           finalGoal,
      nivelPressao:        pressureUpper,
      objetivo:            objectiveUpper,
      justificativaOutliers: aiResult.justificativaOutliers || 'Nenhum outlier identificado na amostra.',
      justificativaMeta:     aiResult.justificativaMeta    || '',
    });

  } catch (err) {
    console.error('[sandbox-calculate] Erro:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar análise. Tente novamente.' });
  }
};