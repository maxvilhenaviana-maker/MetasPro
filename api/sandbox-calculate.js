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

// ─── CORREÇÃO PRINCIPAL: Valida que outliers existem na amostra original ──────
// Impede que a IA invente, arredonde ou altere valores ao reportar outliers.
// Usa contagem para tratar corretamente valores repetidos na amostra.

function validateOutliers(reportedOutliers, originalData) {
  if (!Array.isArray(reportedOutliers)) return [];

  // Mapa de contagem dos valores originais (trata repetições corretamente)
  const originalCount = {};
  for (const val of originalData) {
    const key = Number(val);
    originalCount[key] = (originalCount[key] || 0) + 1;
  }

  const validatedOutliers = [];
  const usedCount = {};

  for (const outlier of reportedOutliers) {
    const key = Number(outlier);
    if (isNaN(key)) continue;

    const available = (originalCount[key] || 0) - (usedCount[key] || 0);
    if (available > 0) {
      // Valor existe na amostra original — outlier é legítimo
      validatedOutliers.push(key);
      usedCount[key] = (usedCount[key] || 0) + 1;
    }
    // Se não existe na amostra, simplesmente ignora — não lança erro
  }

  return validatedOutliers;
}

// ─── Chamada OpenAI ────────────────────────────────────────────────────────────

async function callOpenAI(historicalData, objective, pressureLabel) {
  const pressurePct = PRESSURE_LEVELS[pressureLabel];

  const systemPrompt = `
Você é um analista corporativo especialista em governança de metas e estatística aplicada.
Responda EXCLUSIVAMENTE em JSON válido, sem texto extra, sem markdown.

REGRAS INVIOLÁVEIS:
- Os valores listados em "outliers" DEVEM ser EXATAMENTE iguais a valores presentes na lista de dados fornecida.
- É ESTRITAMENTE PROIBIDO inventar, arredondar, interpolar ou modificar qualquer valor.
- Se um valor não constar LITERALMENTE na lista de dados históricos, NÃO o inclua em "outliers".
- O array "cleanedData" deve conter os dados originais com os outliers removidos, sem alterar nenhum valor.
- Em caso de dúvida, prefira NÃO excluir o valor.
`.trim();

  const userPrompt = `
Analise a série histórica de resultados abaixo para uma meta cujo objetivo é ${objective} os resultados.

Dados históricos — ESTES SÃO OS ÚNICOS VALORES QUE EXISTEM (não invente outros): ${JSON.stringify(historicalData)}

Tarefas:
1) Identifique outliers estatísticos que contaminem a média. Use critério IQR ou desvio padrão conforme mais adequado.
   ATENÇÃO CRÍTICA: Você só pode apontar como outlier um valor que esteja LITERALMENTE na lista acima.
   NÃO arredonde, NÃO modifique, NÃO invente valores.
2) Calcule a média da amostra limpa (sem outliers).
3) Explique em linguagem clara, voltada ao gestor, por que cada outlier foi excluído.
4) Gere uma justificativa para a meta calculada, considerando nível de pressão "${pressureLabel}" (${pressurePct * 100}% do intervalo entre a média e o extremo da amostra limpa).

Responda APENAS com este JSON (sem markdown, sem texto extra):
{
  "outliers": [valores EXATAMENTE como aparecem nos dados históricos, ou array vazio],
  "cleanedData": [dados originais com outliers removidos, sem alterar nenhum valor],
  "justificativaOutliers": "Texto explicando os outliers excluídos (ou 'Nenhum outlier identificado na amostra.').",
  "justificativaMeta": "Texto de 2 a 4 frases explicando ao gestor por que esta meta é adequada, qual esforço representa e quantas vezes historicamente seria atingida com este nível de pressão."
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
      temperature: 0.1, // Reduzido para maior determinismo e fidelidade aos dados
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

    // 2️⃣  VALIDAÇÃO CRÍTICA: filtra outliers que não existem na amostra original
    //     Esta é a correção principal — o backend nunca confia cegamente na IA
    const outliersValidados = validateOutliers(aiResult.outliers, validNumbers);

    // 3️⃣  Reconstrói cleanedData a partir dos dados ORIGINAIS removendo apenas
    //     os outliers validados — não usa o cleanedData retornado pela IA
    let cleanedData = [...validNumbers];
    for (const outlier of outliersValidados) {
      const idx = cleanedData.findIndex(v => Number(v) === Number(outlier));
      if (idx !== -1) cleanedData.splice(idx, 1);
    }

    // Fallback de segurança: se cleanedData ficou vazio, usa dados originais
    if (cleanedData.length < 1) {
      cleanedData = [...validNumbers];
    }

    // 4️⃣  Motor determinístico — todo cálculo matemático fora da IA
    const pressurePct = PRESSURE_LEVELS[pressureUpper];
    const { mean, intervalM, finalGoal } = calculateGoal(cleanedData, objectiveUpper, pressurePct);

    // 5️⃣  Ajusta justificativa se a IA reportou outliers inválidos
    let justificativaOutliers = aiResult.justificativaOutliers || 'Nenhum outlier identificado na amostra.';
    if (outliersValidados.length === 0 && (aiResult.outliers || []).length > 0) {
      justificativaOutliers = 'Nenhum outlier válido identificado na amostra. Os valores sugeridos pela análise não correspondiam aos dados históricos fornecidos.';
    }

    // 6️⃣  Resposta
    return res.status(200).json({
      dadosOriginais:        validNumbers,
      outliersExcluidos:     outliersValidados,
      dadosLimpos:           cleanedData,
      mediaCalculada:        mean,
      intervaloM:            intervalM,
      metaFinal:             finalGoal,
      nivelPressao:          pressureUpper,
      objetivo:              objectiveUpper,
      justificativaOutliers: justificativaOutliers,
      justificativaMeta:     aiResult.justificativaMeta || '',
    });

  } catch (err) {
    console.error('[sandbox-calculate] Erro:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar análise. Tente novamente.' });
  }
};