// api/onboarding.js
// Rotas serverless Vercel para o fluxo de onboarding
// Gerencia criação de empresa, vínculo do admin e criação de unidade

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Middleware de autenticação ───────────────────────────────────────────────
function autenticar(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('Token não fornecido.');
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    throw new Error('Token inválido ou expirado.');
  }
}

// ─── Validação de CNPJ (formato) ─────────────────────────────────────────────
function validarCNPJ(cnpj) {
  const digits = cnpj.replace(/\D/g, '');
  return digits.length === 14;
}

// ─── Handler principal ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = req.url || '';

  // ── POST /api/onboarding/empresa ─────────────────────────────────────────
  if (req.method === 'POST' && url.endsWith('/empresa')) {
    try {
      const user = autenticar(req);
      const { cnpj, razao_social, nome_fantasia } = req.body || {};

      if (!cnpj || !razao_social) {
        return res.status(400).json({ error: 'CNPJ e Razão Social são obrigatórios.' });
      }
      if (!validarCNPJ(cnpj)) {
        return res.status(400).json({ error: 'CNPJ inválido.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verifica se CNPJ já existe
        const existing = await client.query(
          'SELECT id FROM empresas WHERE cnpj = $1',
          [cnpj]
        );
        if (existing.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'CNPJ já cadastrado no sistema.' });
        }

        // Cria a empresa
        const empResult = await client.query(
          `INSERT INTO empresas (cnpj, razao_social, nome_fantasia)
           VALUES ($1, $2, $3)
           RETURNING id, cnpj, razao_social, nome_fantasia, criado_em`,
          [cnpj, razao_social, nome_fantasia || razao_social]
        );
        const empresa = empResult.rows[0];

        // Vincula o usuário como ADMIN da empresa
        await client.query(
          `INSERT INTO empresa_usuarios (empresa_id, usuario_id, papel)
           VALUES ($1, $2, 'ADMIN')`,
          [empresa.id, user.id]
        );

        await client.query('COMMIT');
        return res.status(201).json({ empresa });

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

    } catch (err) {
      console.error('[onboarding/empresa]', err.message);
      if (err.message.includes('Token')) {
        return res.status(401).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Erro ao criar empresa.' });
    }
  }

  // ── POST /api/onboarding/unidade ──────────────────────────────────────────
  if (req.method === 'POST' && url.endsWith('/unidade')) {
    try {
      const user = autenticar(req);
      const { empresa_id, nome_unidade, codigo_unidade } = req.body || {};

      if (!empresa_id || !nome_unidade) {
        return res.status(400).json({ error: 'empresa_id e nome_unidade são obrigatórios.' });
      }

      // Verifica se o usuário é ADMIN da empresa
      const perm = await pool.query(
        `SELECT papel FROM empresa_usuarios
         WHERE empresa_id = $1 AND usuario_id = $2 AND ativo = true`,
        [empresa_id, user.id]
      );
      if (perm.rows.length === 0) {
        return res.status(403).json({ error: 'Sem permissão para esta empresa.' });
      }

      // Gera código automático se não informado
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM unidades_monitoradas WHERE empresa_id = $1',
        [empresa_id]
      );
      const seq = String(parseInt(countResult.rows[0].count) + 1).padStart(2, '0');
      const codigoFinal = codigo_unidade || `UN-${seq}`;

      const result = await pool.query(
        `INSERT INTO unidades_monitoradas (empresa_id, nome_unidade, codigo_unidade)
         VALUES ($1, $2, $3)
         RETURNING id, empresa_id, nome_unidade, codigo_unidade, criado_em`,
        [empresa_id, nome_unidade, codigoFinal]
      );

      return res.status(201).json({ unidade: result.rows[0] });

    } catch (err) {
      console.error('[onboarding/unidade]', err.message);
      if (err.message.includes('Token')) {
        return res.status(401).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Erro ao criar unidade.' });
    }
  }

  // ── GET /api/onboarding/status ────────────────────────────────────────────
  // Verifica se o usuário já completou o onboarding
  if (req.method === 'GET' && url.endsWith('/status')) {
    try {
      const user = autenticar(req);

      const result = await pool.query(
        `SELECT 
           e.id        AS empresa_id,
           e.nome_fantasia,
           e.razao_social,
           e.cnpj,
           eu.papel,
           COUNT(um.id) AS total_unidades
         FROM empresa_usuarios eu
         JOIN empresas e ON e.id = eu.empresa_id
         LEFT JOIN unidades_monitoradas um ON um.empresa_id = e.id AND um.ativo = true
         WHERE eu.usuario_id = $1 AND eu.ativo = true
         GROUP BY e.id, eu.papel
         LIMIT 1`,
        [user.id]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({ onboardingCompleto: false });
      }

      const row = result.rows[0];
      return res.status(200).json({
        onboardingCompleto: true,
        empresa: {
          id: row.empresa_id,
          nome_fantasia: row.nome_fantasia,
          razao_social: row.razao_social,
          cnpj: row.cnpj,
        },
        papel: row.papel,
        totalUnidades: parseInt(row.total_unidades),
      });

    } catch (err) {
      console.error('[onboarding/status]', err.message);
      if (err.message.includes('Token')) {
        return res.status(401).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Erro ao verificar status.' });
    }
  }

  return res.status(404).json({ error: 'Rota não encontrada.' });
};
