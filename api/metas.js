// api/metas.js
// Rotas serverless Vercel para o módulo de Metas
// GET  /api/metas/unidades/:empresa_id  → lista unidades da empresa
// POST /api/metas/calcular              → processa histórico com IA e salva meta

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PRESSURE_LEVELS = {
  MODERADO:      0.25,
  INTERMEDIARIO: 0.50,
  DESAFIADOR:    0.75,
  ALAVANCADO:    1.00,
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
function autenticar(req) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('Token não fornecido.');
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    throw new Error('Token inválido ou expirado.');
  }
}

// ─── Motor determinístico ─────────────────────────────────────────────────────
function calcularMeta(cleanedData, direcao, pressaoPct) {
  if (!cleanedData || cleanedData.length === 0) throw new Error('Amostra limpa vazia.');
  const mean = cleanedData.reduce((a, b) => a + b, 0) / cleanedData.length;
  let intervalM, metaFinal;

  if (direcao === 'AUMENTAR') {
    const maxVal  = Math.max(...cleanedData);
    intervalM  = maxVal - mean;
    metaFinal  = mean + pressaoPct * intervalM;
  } else {
    const minVal  = Math.min(...cleanedData);
    intervalM  = mean - minVal;
    metaFinal  = mean - pressaoPct * intervalM;
  }
  return { mean, intervalM, metaFinal };
}

// ─── Chamada OpenAI ───────────────────────────────────────────────────────────
async function analisarComIA(historico, direcao, pressaoLabel) {
  const pressaoPct = PRESSURE_LEVELS[pressaoLabel];

  const systemPrompt = `Você é um analista corporativo especialista em estatística aplicada e governança de metas.
Responda EXCLUSIVAMENTE em JSON válido, sem texto extra, sem markdown, sem blocos de código.`;

  const userPrompt = `Analise a série histórica de resultados para uma meta cujo objetivo é ${direcao} os resultados.

Dados históricos: ${JSON.stringify(historico)}
Nível de pressão: ${pressaoLabel} (${pressaoPct * 100}% do intervalo M)

Faça:
1) Identifique outliers estatísticos usando IQR ou desvio padrão, o que for mais adequado.
2) Retorne a amostra limpa (sem outliers).
3) Explique em linguagem clara para o gestor por que cada outlier foi excluído.
4) Gere justificativa para a meta, mencionando o nível de esforço e quantas vezes historicamente seria atingida.

Responda APENAS com este JSON:
{
  "outliers": [],
  "cleanedData": [],
  "justificativaOutliers": "texto",
  "justificativaMeta": "texto de 2 a 4 frases"
}`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.15,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${txt}`);
  }

  const json    = await resp.json();
  const content = json.choices?.[0]?.message?.content || '{}';
  const clean   = content.replace(/```json|```/gi, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('Resposta da IA não é JSON válido.');
  }
}

// ─── Persistência ─────────────────────────────────────────────────────────────
async function salvarMeta(client, { usuarioId, payload, aiResult, calcResult }) {
  const {
    nome_meta, unidade_id, objetivo_descritivo, abrangencia,
    apresentacao, direcao, periodicidade_resultado, nivel_pressao, historico,
    peso,
  } = payload;

  // 1. Configuração da meta
  const cfgRes = await client.query(
    `INSERT INTO configuracoes_metas
       (unidade_id, nome_meta, objetivo_descritivo, abrangencia, tipo,
        direcao, nivel_pressao, apresentacao, periodicidade_resultado,
        periodicidade_controle, peso)
     VALUES ($1,$2,$3,$4,'QUANTITATIVA',$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      unidade_id, nome_meta, objetivo_descritivo || null,
      abrangencia || 'OPERACIONAL', direcao,
      PRESSURE_LEVELS[nivel_pressao], apresentacao || 'NUMERO',
      periodicidade_resultado, periodicidade_resultado,
      peso != null ? Number(peso) : null,
    ]
  );
  const configId = cfgRes.rows[0].id;

  // 2. Histórico de indicadores
  for (let i = 0; i < historico.length; i++) {
    const val = historico[i];
    const isOutlier = aiResult.outliers?.includes(val) ?? false;
    // Gera data retroativa conforme periodicidade
    const periodoRef = new Date();
    periodoRef.setMonth(periodoRef.getMonth() - (historico.length - i));
    await client.query(
      `INSERT INTO historicos_indicadores
         (configuracao_meta_id, periodo_referencia, valor, foi_outlier, registrado_por)
       VALUES ($1,$2,$3,$4,$5)`,
      [configId, periodoRef.toISOString().slice(0, 10), val, isOutlier, usuarioId]
    );
  }

  // 3. Log da IA
  const logRes = await client.query(
    `INSERT INTO analises_ia
       (configuracao_meta_id, modelo_utilizado, dados_originais,
        outliers_identificados, media_calculada, intervalo_m,
        sugestao_meta, justificativa_outliers, justificativa_meta,
        criterio_outlier_usado)
     VALUES ($1,'gpt-4o-mini',$2,$3,$4,$5,$6,$7,$8,'IQR/StdDev')
     RETURNING id`,
    [
      configId,
      JSON.stringify(historico),
      JSON.stringify(aiResult.outliers || []),
      calcResult.mean,
      calcResult.intervalM,
      calcResult.metaFinal,
      aiResult.justificativaOutliers || 'Nenhum outlier identificado.',
      aiResult.justificativaMeta || '',
    ]
  );
  const analiseId = logRes.rows[0].id;

  // 4. Ciclo da meta (1 ano a partir de hoje)
  const inicio = new Date();
  const fim    = new Date();
  fim.setFullYear(fim.getFullYear() + 1);

  const cicloRes = await client.query(
    `INSERT INTO ciclos_metas
       (configuracao_meta_id, sugestao_ia_id, valor_meta_aprovado,
        data_inicio, data_fim, aprovado_por)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [
      configId, analiseId, calcResult.metaFinal,
      inicio.toISOString().slice(0, 10),
      fim.toISOString().slice(0, 10),
      usuarioId,
    ]
  );
  const cicloId = cicloRes.rows[0].id;

  // 5. Primeira meta_periodo (período atual)
  await client.query(
    `INSERT INTO metas_periodo (ciclo_meta_id, periodo_referencia, valor_meta_periodo)
     VALUES ($1,$2,$3)`,
    [cicloId, inicio.toISOString().slice(0, 10), calcResult.metaFinal]
  );

  return { configId, analiseId, cicloId };
}

// ─── Handler principal ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = req.url || '';

  // ── GET /api/metas/lista ─────────────────────────────────────────────────
  // Lista todas as metas do usuário com dados consolidados para o dashboard
  if (req.method === 'GET' && url.endsWith('/lista')) {
    try {
      const user = autenticar(req);

      // Busca a empresa do usuário
      const empRes = await pool.query(
        `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id]
      );
      if (empRes.rows.length === 0) {
        return res.status(200).json([]);
      }
      const empresaId = empRes.rows[0].empresa_id;

      // Busca metas com dados consolidados do ciclo mais recente e análise da IA
      const result = await pool.query(
        `SELECT
           cm.id                        AS config_id,
           cm.nome_meta,
           cm.direcao,
           cm.nivel_pressao,
           cm.periodicidade_resultado,
           cm.apresentacao,
           cm.abrangencia,
           cm.objetivo_descritivo,
           cm.criado_em,
           um.nome_unidade,
           um.codigo_unidade,
           -- Dados do ciclo mais recente
           ciclo.valor_meta_aprovado    AS valor_meta_final,
           -- Dados da análise IA mais recente
           ai.media_calculada,
           ai.intervalo_m,
           ai.justificativa_meta
         FROM configuracoes_metas cm
         JOIN unidades_monitoradas um ON um.id = cm.unidade_id
         LEFT JOIN LATERAL (
           SELECT valor_meta_aprovado
           FROM ciclos_metas
           WHERE configuracao_meta_id = cm.id
           ORDER BY criado_em DESC
           LIMIT 1
         ) ciclo ON true
         LEFT JOIN LATERAL (
           SELECT media_calculada, intervalo_m, justificativa_meta
           FROM analises_ia
           WHERE configuracao_meta_id = cm.id
           ORDER BY criado_em DESC
           LIMIT 1
         ) ai ON true
         WHERE um.empresa_id = $1
           AND cm.ativo = true
         ORDER BY cm.criado_em DESC`,
        [empresaId]
      );

      return res.status(200).json(result.rows);

    } catch (err) {
      console.error('[metas/lista]', err.message);
      if (err.message.includes('Token')) return res.status(401).json({ error: err.message });
      return res.status(500).json({ error: 'Erro ao listar metas.' });
    }
  }

  // ── GET /api/metas/unidades/:empresa_id ──────────────────────────────────
  if (req.method === 'GET' && url.includes('/unidades/')) {
    try {
      const user      = autenticar(req);
      const empresaId = url.split('/unidades/')[1]?.split('?')[0];

      // Verifica permissão
      const perm = await pool.query(
        `SELECT papel FROM empresa_usuarios
         WHERE empresa_id = $1 AND usuario_id = $2 AND ativo = true`,
        [empresaId, user.id]
      );
      if (perm.rows.length === 0) {
        return res.status(403).json({ error: 'Sem permissão para esta empresa.' });
      }

      const result = await pool.query(
        `SELECT id, nome_unidade, codigo_unidade
         FROM unidades_monitoradas
         WHERE empresa_id = $1 AND ativo = true
         ORDER BY nome_unidade`,
        [empresaId]
      );
      return res.status(200).json(result.rows);

    } catch (err) {
      console.error('[metas/unidades]', err.message);
      if (err.message.includes('Token')) return res.status(401).json({ error: err.message });
      return res.status(500).json({ error: 'Erro ao listar unidades.' });
    }
  }

  // ── GET /api/metas/config/:id ────────────────────────────────────────────
  // Carrega dados de uma meta existente para pré-preencher o wizard no modo edição
  if (req.method === 'GET' && url.includes('/config/')) {
    try {
      const user     = autenticar(req);
      const configId = url.split('/config/')[1]?.split('?')[0];

      const cfgRes = await pool.query(
        `SELECT cm.*, um.empresa_id
         FROM configuracoes_metas cm
         JOIN unidades_monitoradas um ON um.id = cm.unidade_id
         WHERE cm.id = $1`,
        [configId]
      );
      if (cfgRes.rows.length === 0) {
        return res.status(404).json({ error: 'Meta não encontrada.' });
      }
      const cfg = cfgRes.rows[0];

      const perm = await pool.query(
        `SELECT papel FROM empresa_usuarios
         WHERE empresa_id = $1 AND usuario_id = $2 AND ativo = true`,
        [cfg.empresa_id, user.id]
      );
      if (perm.rows.length === 0) {
        return res.status(403).json({ error: 'Sem permissão para esta meta.' });
      }

      const histRes = await pool.query(
        `SELECT valor FROM historicos_indicadores
         WHERE configuracao_meta_id = $1
         ORDER BY periodo_referencia ASC`,
        [configId]
      );

      const pressaoMap = {
        '0.25': 'MODERADO', '0.50': 'INTERMEDIARIO',
        '0.75': 'DESAFIADOR', '1.00': 'ALAVANCADO',
        '0.5': 'INTERMEDIARIO', '1': 'ALAVANCADO',
      };
      const nivelLabel = pressaoMap[String(Number(cfg.nivel_pressao).toFixed(2))] || 'MODERADO';

      return res.status(200).json({
        id:                      cfg.id,
        nome_meta:               cfg.nome_meta,
        unidade_id:              cfg.unidade_id,
        objetivo_descritivo:     cfg.objetivo_descritivo || '',
        abrangencia:             cfg.abrangencia         || 'OPERACIONAL',
        apresentacao:            cfg.apresentacao        || 'NUMERO',
        direcao:                 cfg.direcao,
        periodicidade_resultado: cfg.periodicidade_resultado,
        nivel_pressao_label:     nivelLabel,
        peso:                    cfg.peso != null ? Number(cfg.peso) : null,
        historico:               histRes.rows.map(r => Number(r.valor)),
      });

    } catch (err) {
      console.error('[metas/config]', err.message);
      if (err.message.includes('Token')) return res.status(401).json({ error: err.message });
      return res.status(500).json({ error: 'Erro ao carregar meta.' });
    }
  }

  // ── POST /api/metas/calcular ─────────────────────────────────────────────
  if (req.method === 'POST' && url.endsWith('/calcular')) {
    try {
      const user = autenticar(req);
      const {
        nome_meta, unidade_id, historico,
        direcao, nivel_pressao,
        objetivo_descritivo, abrangencia, apresentacao,
        periodicidade_resultado, peso,
      } = req.body || {};

      // Validações
      if (!nome_meta?.trim())   return res.status(400).json({ error: 'Nome da meta é obrigatório.' });
      if (!unidade_id)          return res.status(400).json({ error: 'Unidade é obrigatória.' });
      if (!Array.isArray(historico) || historico.length < 6)
        return res.status(400).json({ error: 'Mínimo de 6 resultados históricos.' });
      if (!PRESSURE_LEVELS[nivel_pressao?.toUpperCase()])
        return res.status(400).json({ error: 'Nível de pressão inválido.' });
      if (!['AUMENTAR', 'REDUZIR'].includes(direcao?.toUpperCase()))
        return res.status(400).json({ error: 'Direção inválida.' });
      if (!process.env.OPENAI_API_KEY)
        return res.status(500).json({ error: 'Chave OpenAI não configurada.' });

      const pressaoUpper = nivel_pressao.toUpperCase();
      const direcaoUpper = direcao.toUpperCase();
      const validNums    = historico.map(Number).filter(v => !isNaN(v));

      // 1. IA — identifica outliers e gera justificativas
      const aiResult = await analisarComIA(validNums, direcaoUpper, pressaoUpper);

      // Fallback se IA retornar cleanedData inválido
      const cleanedData = Array.isArray(aiResult.cleanedData) && aiResult.cleanedData.length >= 1
        ? aiResult.cleanedData.map(Number).filter(v => !isNaN(v))
        : validNums;

      // 2. Motor determinístico
      const pressaoPct  = PRESSURE_LEVELS[pressaoUpper];
      const calcResult  = calcularMeta(cleanedData, direcaoUpper, pressaoPct);

      // 3. Persistência em transação
      const client = await pool.connect();
      let ids;
      try {
        await client.query('BEGIN');
        ids = await salvarMeta(client, {
          usuarioId: user.id,
          payload: {
            nome_meta, unidade_id, objetivo_descritivo,
            abrangencia, apresentacao, direcao: direcaoUpper,
            periodicidade_resultado, nivel_pressao: pressaoUpper,
            historico: validNums, peso,
          },
          aiResult,
          calcResult,
        });
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      // 4. Resposta
      return res.status(201).json({
        ...ids,
        dadosOriginais:       validNums,
        outliersExcluidos:    aiResult.outliers           || [],
        dadosLimpos:          cleanedData,
        mediaCalculada:       calcResult.mean,
        intervaloM:           calcResult.intervalM,
        metaFinal:            calcResult.metaFinal,
        nivelPressao:         pressaoUpper,
        direcao:              direcaoUpper,
        justificativaOutliers: aiResult.justificativaOutliers || 'Nenhum outlier identificado.',
        justificativaMeta:     aiResult.justificativaMeta    || '',
      });

    } catch (err) {
      console.error('[metas/calcular]', err.message);
      if (err.message.includes('Token')) return res.status(401).json({ error: err.message });
      return res.status(500).json({ error: 'Erro ao processar meta. Tente novamente.' });
    }
  }

  return res.status(404).json({ error: 'Rota não encontrada.' });
};
