const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware de autenticacao JWT
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado.' });
  }
}

// Middleware de permissao ADMIN
// Le X-Empresa-Id enviado pelo frontend (via api.js interceptor).
// Valida que o usuario logado e ADMIN nessa empresa especifica.
// Expoe req.empresaId para todos os handlers downstream.
async function apenasAdmin(req, res, next) {
  try {
    const empresaId = req.headers['x-empresa-id'];
    if (!empresaId) {
      return res.status(400).json({ error: 'Header X-Empresa-Id ausente. Selecione uma empresa antes de continuar.' });
    }

    const result = await pool.query(
      `SELECT eu.papel, eu.empresa_id
       FROM empresa_usuarios eu
       WHERE eu.usuario_id = $1
         AND eu.empresa_id = $2
         AND eu.papel = 'ADMIN'
         AND eu.ativo = true
       LIMIT 1`,
      [req.userId, empresaId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso restrito a administradores desta empresa.' });
    }

    req.empresaId = empresaId;
    next();
  } catch (err) {
    console.error('[apenasAdmin]', err.message);
    res.status(500).json({ error: 'Erro ao verificar permissoes.' });
  }
}

// Rota de Teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'MetasPro API esta operando' });
});

// ─── AUTENTICACAO ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { name, nome, email, password, senha } = req.body;
  const nomeRecebido = nome || name;
  const senhaRecebida = senha || password;
  try {
    const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'E-mail ja cadastrado.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senhaRecebida, salt);
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nomeRecebido, email, hashedPassword]
    );

    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    res.status(201).json({ token, user: result.rows[0] });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro no servidor ao registrar.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, senha, password } = req.body;
  const senhaRecebida = senha || password;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais invalidas' });
    if (user.ativo === false) return res.status(403).json({ error: 'Usuario inativo. Entre em contato com o administrador.' });

    const hashArmazenado = user.senha_hash || user.password;
    if (!hashArmazenado || !senhaRecebida) return res.status(401).json({ error: 'Credenciais invalidas' });
    const validPassword = await bcrypt.compare(senhaRecebida, hashArmazenado);
    if (!validPassword) return res.status(401).json({ error: 'Credenciais invalidas' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    return res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, sub: googleId } = ticket.getPayload();

    let result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    let user = result.rows[0];
    if (user && user.ativo === false) return res.status(403).json({ error: 'Usuario inativo. Entre em contato com o administrador.' });

    if (!user) {
      const insertResult = await pool.query(
        'INSERT INTO usuarios (nome, email, google_id) VALUES ($1, $2, $3) RETURNING id, nome, email',
        [name, email, googleId]
      );
      user = insertResult.rows[0];
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
  } catch (error) {
    console.error('Erro Google auth:', error);
    res.status(401).json({ error: 'Falha na autenticacao com o Google.' });
  }
});

// ─── ROTAS DE OPCOES (listas para formularios) ────────────────────────────────

// GET /api/opcoes/empresas
app.get('/api/opcoes/empresas', autenticar, apenasAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, razao_social, nome_fantasia, cnpj
       FROM empresas
       WHERE ativo = true
       ORDER BY razao_social ASC`
    );
    res.json({ empresas: result.rows });
  } catch (err) {
    console.error('Erro ao listar empresas:', err.message);
    res.status(500).json({ error: 'Erro ao buscar empresas.' });
  }
});

// GET /api/opcoes/unidades?empresa_id=xxx
app.get('/api/opcoes/unidades', autenticar, apenasAdmin, async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) {
    return res.status(400).json({ error: 'Parametro empresa_id obrigatorio.' });
  }
  try {
    const result = await pool.query(
      `SELECT id, nome_unidade, codigo_unidade
       FROM unidades_monitoradas
       WHERE empresa_id = $1 AND ativo = true
       ORDER BY nome_unidade ASC`,
      [empresa_id]
    );
    res.json({ unidades: result.rows });
  } catch (err) {
    console.error('Erro ao listar unidades:', err.message);
    res.status(500).json({ error: 'Erro ao buscar unidades.' });
  }
});

// ─── CRUD DE USUARIOS ─────────────────────────────────────────────────────────

// GET /api/usuarios
app.get('/api/usuarios', autenticar, apenasAdmin, async (req, res) => {
  try {
    const empresaId = req.empresaId;

    const result = await pool.query(
      `SELECT
         u.id,
         u.nome,
         u.email,
         u.ativo        AS usuario_ativo,
         u.data_cadastro,
         u.created_at,
         u.google_id,
         u.avatar_url,
         eu.papel,
         eu.ativo       AS vinculo_ativo
       FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       WHERE eu.empresa_id = $1
       ORDER BY u.nome ASC`,
      [empresaId]
    );
    res.json({ usuarios: result.rows, empresaId });
  } catch (err) {
    console.error('Erro ao listar usuarios:', err.message);
    res.status(500).json({ error: 'Erro ao buscar usuarios.', detalhe: err.message });
  }
});

// GET /api/usuarios/me/perfil
app.get('/api/usuarios/me/perfil', autenticar, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.ativo, u.data_cadastro, u.created_at,
              eu.papel, eu.empresa_id,
              e.nome_fantasia, e.razao_social
       FROM usuarios u
       LEFT JOIN empresa_usuarios eu ON eu.usuario_id = u.id AND eu.ativo = true
       LEFT JOIN empresas e ON e.id = eu.empresa_id
       WHERE u.id = $1
       LIMIT 1`,
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario nao encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// GET /api/usuarios/:id
app.get('/api/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const empresaId = req.empresaId;

    const result = await pool.query(
      `SELECT
         u.id,
         u.nome,
         u.email,
         u.ativo        AS usuario_ativo,
         u.data_cadastro,
         u.created_at,
         u.google_id,
         u.avatar_url,
         eu.papel,
         eu.ativo       AS vinculo_ativo,
         e.id           AS empresa_id,
         e.nome_fantasia,
         e.razao_social,
         e.cnpj
       FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       INNER JOIN empresas e ON e.id = eu.empresa_id
       WHERE eu.empresa_id = $1 AND u.id = $2`,
      [empresaId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    const usuario = result.rows[0];

    const unidadesVinculadas = await pool.query(
      `SELECT um.id, um.nome_unidade, um.codigo_unidade
       FROM usuario_unidades uu
       INNER JOIN unidades_monitoradas um ON um.id = uu.unidade_id
       WHERE uu.usuario_id = $1 AND uu.ativo = true
       ORDER BY um.nome_unidade ASC`,
      [id]
    );
    usuario.unidades = unidadesVinculadas.rows;

    res.json(usuario);
  } catch (err) {
    console.error('Erro ao buscar usuario:', err);
    res.status(500).json({ error: 'Erro ao buscar usuario.' });
  }
});

// POST /api/usuarios
app.post('/api/usuarios', autenticar, apenasAdmin, async (req, res) => {
  const { nome, email, senha, papel, empresa_id, unidades } = req.body;

  if (!nome || !email || !senha || !papel || !empresa_id) {
    return res.status(400).json({ error: 'Campos obrigatorios: nome, email, senha, papel, empresa_id.' });
  }
  const papeisValidos = ['ADMIN', 'DESIGNADO_CONFIGURADOR', 'DESIGNADO_LANCADOR'];
  if (!papeisValidos.includes(papel)) {
    return res.status(400).json({ error: `Papel invalido. Use: ${papeisValidos.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const emailCheck = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'E-mail ja cadastrado no sistema.' });
    }

    const empresaCheck = await client.query(
      `SELECT id FROM empresas WHERE id = $1 AND ativo = true`,
      [empresa_id]
    );
    if (empresaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Empresa nao encontrada ou inativa.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const novoUser = await client.query(
      `INSERT INTO usuarios (nome, email, password, senha_hash, ativo)
       VALUES ($1, $2, $3, $3, true)
       RETURNING id, nome, email, ativo, data_cadastro, created_at`,
      [nome, email, senhaHash]
    );
    const novoId = novoUser.rows[0].id;

    await client.query(
      `INSERT INTO empresa_usuarios (empresa_id, usuario_id, papel, ativo)
       VALUES ($1, $2, $3, true)`,
      [empresa_id, novoId, papel]
    );

    if (Array.isArray(unidades) && unidades.length > 0) {
      for (const unidade_id of unidades) {
        const unidadeCheck = await client.query(
          `SELECT id FROM unidades_monitoradas WHERE id = $1 AND empresa_id = $2 AND ativo = true`,
          [unidade_id, empresa_id]
        );
        if (unidadeCheck.rows.length > 0) {
          await client.query(
            `INSERT INTO usuario_unidades (usuario_id, unidade_id, ativo)
             VALUES ($1, $2, true)
             ON CONFLICT (usuario_id, unidade_id) DO UPDATE SET ativo = true`,
            [novoId, unidade_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...novoUser.rows[0], papel, empresa_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar usuario:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar usuario.' });
  } finally {
    client.release();
  }
});

// PUT /api/usuarios/:id
app.put('/api/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome, email, papel, ativo, novaSenha, unidades } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const empresaId = req.empresaId;

    const pertenceCheck = await client.query(
      `SELECT u.id FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       WHERE eu.empresa_id = $1 AND u.id = $2`,
      [empresaId, id]
    );
    if (pertenceCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario nao encontrado nesta empresa.' });
    }

    const campos = [];
    const valores = [];
    let idx = 1;

    if (nome)   { campos.push(`nome = $${idx++}`);  valores.push(nome); }
    if (email)  { campos.push(`email = $${idx++}`); valores.push(email); }
    if (typeof ativo === 'boolean') { campos.push(`ativo = $${idx++}`); valores.push(ativo); }
    if (novaSenha) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(novaSenha, salt);
      campos.push(`senha_hash = $${idx++}`);
      valores.push(hash);
    }

    if (campos.length > 0) {
      valores.push(id);
      await client.query(
        `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${idx}`,
        valores
      );
    }

    if (papel) {
      const papeisValidos = ['ADMIN', 'DESIGNADO_CONFIGURADOR', 'DESIGNADO_LANCADOR'];
      if (!papeisValidos.includes(papel)) throw new Error('Papel invalido.');
      await client.query(
        `UPDATE empresa_usuarios SET papel = $1 WHERE empresa_id = $2 AND usuario_id = $3`,
        [papel, empresaId, id]
      );
    }

    if (Array.isArray(unidades)) {
      const empresaUsuarioRes = await client.query(
        `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [id]
      );
      const empresaUsuarioId = empresaUsuarioRes.rows[0]?.empresa_id || empresaId;

      await client.query(
        `UPDATE usuario_unidades SET ativo = false WHERE usuario_id = $1`,
        [id]
      );

      for (const unidade_id of unidades) {
        const unidadeCheck = await client.query(
          `SELECT id FROM unidades_monitoradas WHERE id = $1 AND empresa_id = $2 AND ativo = true`,
          [unidade_id, empresaUsuarioId]
        );
        if (unidadeCheck.rows.length > 0) {
          await client.query(
            `INSERT INTO usuario_unidades (usuario_id, unidade_id, ativo)
             VALUES ($1, $2, true)
             ON CONFLICT (usuario_id, unidade_id) DO UPDATE SET ativo = true`,
            [id, unidade_id]
          );
        }
      }
    }

    await client.query('COMMIT');

    const updated = await pool.query(
      `SELECT u.id, u.nome, u.email, u.ativo, u.data_cadastro, u.created_at, eu.papel
       FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       WHERE eu.empresa_id = $1 AND u.id = $2`,
      [empresaId, id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar usuario:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar usuario.' });
  } finally {
    client.release();
  }
});

// DELETE /api/usuarios/:id
app.delete('/api/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.userId) {
    return res.status(400).json({ error: 'Voce nao pode excluir seu proprio usuario.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const empresaId = req.empresaId;

    const result = await client.query(
      `UPDATE empresa_usuarios SET ativo = false
       WHERE empresa_id = $1 AND usuario_id = $2
       RETURNING id`,
      [empresaId, id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario nao encontrado nesta empresa.' });
    }

    await client.query(
      `UPDATE usuario_unidades SET ativo = false WHERE usuario_id = $1`,
      [id]
    );

    await client.query(`UPDATE usuarios SET ativo = false WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ mensagem: 'Usuario desativado com sucesso.', id: parseInt(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir usuario:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir usuario.' });
  } finally {
    client.release();
  }
});

// ─── ROTAS DE SESSAO ──────────────────────────────────────────────────────────

// GET /api/session/empresas
app.get('/api/session/empresas', autenticar, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         e.id,
         e.nome_fantasia,
         e.razao_social,
         e.cnpj,
         eu.papel
       FROM empresa_usuarios eu
       INNER JOIN empresas e ON e.id = eu.empresa_id
       WHERE eu.usuario_id = $1
         AND eu.ativo = true
         AND e.ativo = true
       ORDER BY e.nome_fantasia ASC`,
      [req.userId]
    );
    res.json({ empresas: result.rows });
  } catch (err) {
    console.error('[session/empresas]', err.message);
    res.status(500).json({ error: 'Erro ao buscar empresas da sessao.' });
  }
});

// GET /api/session/unidades?empresa_id=xxx
// CORRECAO: adicionado try/catch explicito no bloco de leitura do papel
// para garantir que sempre retorna status HTTP mesmo em caso de erro SQL.
app.get('/api/session/unidades', autenticar, async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) {
    return res.status(400).json({ error: 'Parametro empresa_id e obrigatorio.' });
  }

  try {
    const papelRes = await pool.query(
      `SELECT papel FROM empresa_usuarios
       WHERE usuario_id = $1 AND empresa_id = $2 AND ativo = true
       LIMIT 1`,
      [req.userId, empresa_id]
    );

    if (papelRes.rows.length === 0) {
      return res.status(403).json({ error: 'Sem acesso a esta empresa.' });
    }

    const papel = papelRes.rows[0].papel;
    let unidades;

    if (papel === 'ADMIN') {
      unidades = await pool.query(
        `SELECT id, nome_unidade, codigo_unidade
         FROM unidades_monitoradas
         WHERE empresa_id = $1 AND ativo = true
         ORDER BY nome_unidade ASC`,
        [empresa_id]
      );
    } else {
      unidades = await pool.query(
        `SELECT um.id, um.nome_unidade, um.codigo_unidade
         FROM usuario_unidades uu
         INNER JOIN unidades_monitoradas um ON um.id = uu.unidade_id
         WHERE uu.usuario_id = $1
           AND um.empresa_id = $2
           AND uu.ativo = true
           AND um.ativo = true
         ORDER BY um.nome_unidade ASC`,
        [req.userId, empresa_id]
      );
    }

    return res.json({ unidades: unidades.rows });
  } catch (err) {
    console.error('[session/unidades]', err.message);
    return res.status(500).json({ error: 'Erro ao buscar unidades da sessao.' });
  }
});

// ─── CRUD DE EMPRESAS ─────────────────────────────────────────────────────────

// GET /api/empresas
app.get('/api/empresas', autenticar, apenasAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, cnpj, razao_social, nome_fantasia, ativo, criado_em
       FROM empresas
       ORDER BY razao_social ASC`
    );
    res.json({ empresas: result.rows });
  } catch (err) {
    console.error('[GET /empresas]', err.message);
    res.status(500).json({ error: 'Erro ao buscar empresas.', detalhe: err.message });
  }
});

// GET /api/empresas/:id
app.get('/api/empresas/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const empresaRes = await pool.query(
      `SELECT id, cnpj, razao_social, nome_fantasia, ativo, criado_em
       FROM empresas WHERE id = $1`,
      [id]
    );
    if (empresaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa nao encontrada.' });
    }
    const empresa = empresaRes.rows[0];

    const unidadesRes = await pool.query(
      `SELECT id, nome_unidade, codigo_unidade, ativo
       FROM unidades_monitoradas
       WHERE empresa_id = $1
       ORDER BY nome_unidade ASC`,
      [id]
    );
    empresa.unidades = unidadesRes.rows;

    const usuariosRes = await pool.query(
      `SELECT u.id, u.nome, u.email, eu.papel, eu.ativo
       FROM empresa_usuarios eu
       INNER JOIN usuarios u ON u.id = eu.usuario_id
       WHERE eu.empresa_id = $1
       ORDER BY u.nome ASC`,
      [id]
    );
    empresa.usuarios = usuariosRes.rows;

    res.json(empresa);
  } catch (err) {
    console.error('[GET /empresas/:id]', err.message);
    res.status(500).json({ error: 'Erro ao buscar empresa.', detalhe: err.message });
  }
});

// POST /api/empresas
app.post('/api/empresas', autenticar, apenasAdmin, async (req, res) => {
  const { razao_social, nome_fantasia, cnpj } = req.body;

  if (!razao_social || !cnpj) {
    return res.status(400).json({ error: 'Campos obrigatorios: razao_social, cnpj.' });
  }

  const cnpjDigits = cnpj.replace(/\D/g, '');
  if (cnpjDigits.length !== 14) {
    return res.status(400).json({ error: 'CNPJ invalido. Informe 14 digitos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cnpjCheck = await client.query(
      `SELECT id FROM empresas WHERE cnpj = $1`,
      [cnpjDigits]
    );
    if (cnpjCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'CNPJ ja cadastrado no sistema.' });
    }

    const result = await client.query(
      `INSERT INTO empresas (cnpj, razao_social, nome_fantasia)
       VALUES ($1, $2, $3)
       RETURNING id, cnpj, razao_social, nome_fantasia, ativo, criado_em`,
      [cnpjDigits, razao_social.trim(), (nome_fantasia || razao_social).trim()]
    );

    const novaEmpresaId = result.rows[0].id;

    // Auto-vincular Max (desenvolvedor) como ADMIN em toda nova empresa
    const maxUser = await client.query(
      `SELECT id FROM usuarios WHERE email = 'maxvilhenaviana@gmail.com' LIMIT 1`
    );
    if (maxUser.rows.length > 0) {
      await client.query(
        `INSERT INTO empresa_usuarios (empresa_id, usuario_id, papel, ativo)
         VALUES ($1, $2, 'ADMIN', true)
         ON CONFLICT DO NOTHING`,
        [novaEmpresaId, maxUser.rows[0].id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /empresas]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao criar empresa.' });
  } finally {
    client.release();
  }
});

// PUT /api/empresas/:id
app.put('/api/empresas/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const { razao_social, nome_fantasia, cnpj, ativo } = req.body;

  if (!razao_social || !cnpj) {
    return res.status(400).json({ error: 'Campos obrigatorios: razao_social, cnpj.' });
  }

  const cnpjDigits = cnpj.replace(/\D/g, '');
  if (cnpjDigits.length !== 14) {
    return res.status(400).json({ error: 'CNPJ invalido. Informe 14 digitos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const empresaCheck = await client.query(
      `SELECT id FROM empresas WHERE id = $1`, [id]
    );
    if (empresaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Empresa nao encontrada.' });
    }

    const cnpjCheck = await client.query(
      `SELECT id FROM empresas WHERE cnpj = $1 AND id != $2`,
      [cnpjDigits, id]
    );
    if (cnpjCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'CNPJ ja pertence a outra empresa.' });
    }

    const campos = [`razao_social = $1`, `nome_fantasia = $2`, `cnpj = $3`];
    const valores = [
      razao_social.trim(),
      (nome_fantasia || razao_social).trim(),
      cnpjDigits,
    ];

    if (typeof ativo === 'boolean') {
      campos.push(`ativo = $${valores.length + 1}`);
      valores.push(ativo);
    }

    valores.push(id);
    const result = await client.query(
      `UPDATE empresas SET ${campos.join(', ')} WHERE id = $${valores.length}
       RETURNING id, cnpj, razao_social, nome_fantasia, ativo, criado_em`,
      valores
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /empresas/:id]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao atualizar empresa.' });
  } finally {
    client.release();
  }
});

// DELETE /api/empresas/:id (soft delete)
app.delete('/api/empresas/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE empresas SET ativo = false WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Empresa nao encontrada.' });
    }

    await client.query('COMMIT');
    res.json({ mensagem: 'Empresa desativada com sucesso.', id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE /empresas/:id]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao desativar empresa.' });
  } finally {
    client.release();
  }
});

// ─── CRUD DE UNIDADES DE MONITORAMENTO ───────────────────────────────────────
// Tabela: unidades_monitoradas
// Campos: id (uuid), empresa_id (uuid FK empresas), nome_unidade (varchar 255),
//         codigo_unidade (varchar 50), ativo (boolean), criado_em (timestamptz)

// GET /api/unidades — lista todas as unidades da empresa do admin logado
app.get('/api/unidades', autenticar, apenasAdmin, async (req, res) => {
  try {
    const empresaId = req.empresaId;

    const result = await pool.query(
      `SELECT
         um.id,
         um.nome_unidade,
         um.codigo_unidade,
         um.ativo,
         um.criado_em,
         e.nome_fantasia AS empresa_nome,
         e.razao_social  AS empresa_razao,
         (
           SELECT COUNT(*)
           FROM usuario_unidades uu
           WHERE uu.unidade_id = um.id AND uu.ativo = true
         ) AS total_usuarios
       FROM unidades_monitoradas um
       INNER JOIN empresas e ON e.id = um.empresa_id
       WHERE um.empresa_id = $1
       ORDER BY um.nome_unidade ASC`,
      [empresaId]
    );

    res.json({ unidades: result.rows, empresaId });
  } catch (err) {
    console.error('[GET /unidades]', err.message);
    res.status(500).json({ error: 'Erro ao buscar unidades.', detalhe: err.message });
  }
});

// GET /api/unidades/:id — detalhe de uma unidade com usuarios vinculados
app.get('/api/unidades/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const empresaId = req.empresaId;

    const unidadeRes = await pool.query(
      `SELECT
         um.id,
         um.nome_unidade,
         um.codigo_unidade,
         um.ativo,
         um.criado_em,
         e.id           AS empresa_id,
         e.nome_fantasia,
         e.razao_social,
         e.cnpj
       FROM unidades_monitoradas um
       INNER JOIN empresas e ON e.id = um.empresa_id
       WHERE um.id = $1 AND um.empresa_id = $2`,
      [id, empresaId]
    );

    if (unidadeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade nao encontrada.' });
    }

    const unidade = unidadeRes.rows[0];

    // Usuarios vinculados a esta unidade
    const usuariosRes = await pool.query(
      `SELECT u.id, u.nome, u.email, eu.papel, uu.ativo AS vinculo_ativo
       FROM usuario_unidades uu
       INNER JOIN usuarios u ON u.id = uu.usuario_id
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id AND eu.empresa_id = $2
       WHERE uu.unidade_id = $1
       ORDER BY u.nome ASC`,
      [id, empresaId]
    );
    unidade.usuarios = usuariosRes.rows;

    res.json(unidade);
  } catch (err) {
    console.error('[GET /unidades/:id]', err.message);
    res.status(500).json({ error: 'Erro ao buscar unidade.', detalhe: err.message });
  }
});

// POST /api/unidades — cria nova unidade na empresa do admin logado
app.post('/api/unidades', autenticar, apenasAdmin, async (req, res) => {
  const { nome_unidade, codigo_unidade } = req.body;
  const empresaId = req.empresaId;

  if (!nome_unidade || !nome_unidade.trim()) {
    return res.status(400).json({ error: 'Campo obrigatorio: nome_unidade.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica se ja existe unidade com mesmo nome nesta empresa
    const nomeCheck = await client.query(
      `SELECT id FROM unidades_monitoradas
       WHERE empresa_id = $1 AND LOWER(nome_unidade) = LOWER($2) AND ativo = true`,
      [empresaId, nome_unidade.trim()]
    );
    if (nomeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ja existe uma unidade ativa com este nome nesta empresa.' });
    }

    // Gera codigo automatico se nao informado
    let codigoFinal = codigo_unidade ? codigo_unidade.trim() : null;
    if (!codigoFinal) {
      const countRes = await client.query(
        `SELECT COUNT(*) FROM unidades_monitoradas WHERE empresa_id = $1`,
        [empresaId]
      );
      const seq = String(parseInt(countRes.rows[0].count) + 1).padStart(2, '0');
      codigoFinal = `UN-${seq}`;
    }

    // Verifica unicidade do codigo dentro da empresa
    if (codigo_unidade) {
      const codigoCheck = await client.query(
        `SELECT id FROM unidades_monitoradas
         WHERE empresa_id = $1 AND LOWER(codigo_unidade) = LOWER($2) AND ativo = true`,
        [empresaId, codigoFinal]
      );
      if (codigoCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ja existe uma unidade com este codigo nesta empresa.' });
      }
    }

    const result = await client.query(
      `INSERT INTO unidades_monitoradas (empresa_id, nome_unidade, codigo_unidade, ativo)
       VALUES ($1, $2, $3, true)
       RETURNING id, empresa_id, nome_unidade, codigo_unidade, ativo, criado_em`,
      [empresaId, nome_unidade.trim(), codigoFinal]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /unidades]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao criar unidade.' });
  } finally {
    client.release();
  }
});

// PUT /api/unidades/:id — atualiza nome, codigo e status da unidade
app.put('/api/unidades/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome_unidade, codigo_unidade, ativo } = req.body;
  const empresaId = req.empresaId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Confirma que a unidade pertence a esta empresa
    const unidadeCheck = await client.query(
      `SELECT id FROM unidades_monitoradas WHERE id = $1 AND empresa_id = $2`,
      [id, empresaId]
    );
    if (unidadeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unidade nao encontrada nesta empresa.' });
    }

    // Verifica duplicidade de nome (excluindo o proprio registro)
    if (nome_unidade) {
      const nomeCheck = await client.query(
        `SELECT id FROM unidades_monitoradas
         WHERE empresa_id = $1 AND LOWER(nome_unidade) = LOWER($2) AND id != $3 AND ativo = true`,
        [empresaId, nome_unidade.trim(), id]
      );
      if (nomeCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ja existe outra unidade ativa com este nome.' });
      }
    }

    // Verifica duplicidade de codigo (excluindo o proprio registro)
    if (codigo_unidade) {
      const codigoCheck = await client.query(
        `SELECT id FROM unidades_monitoradas
         WHERE empresa_id = $1 AND LOWER(codigo_unidade) = LOWER($2) AND id != $3 AND ativo = true`,
        [empresaId, codigo_unidade.trim(), id]
      );
      if (codigoCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ja existe outra unidade com este codigo.' });
      }
    }

    const campos = [];
    const valores = [];
    let idx = 1;

    if (nome_unidade)    { campos.push(`nome_unidade = $${idx++}`);    valores.push(nome_unidade.trim()); }
    if (codigo_unidade)  { campos.push(`codigo_unidade = $${idx++}`);  valores.push(codigo_unidade.trim()); }
    if (typeof ativo === 'boolean') { campos.push(`ativo = $${idx++}`); valores.push(ativo); }

    if (campos.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    valores.push(id);
    const result = await client.query(
      `UPDATE unidades_monitoradas
       SET ${campos.join(', ')}
       WHERE id = $${idx}
       RETURNING id, empresa_id, nome_unidade, codigo_unidade, ativo, criado_em`,
      valores
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /unidades/:id]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao atualizar unidade.' });
  } finally {
    client.release();
  }
});

// DELETE /api/unidades/:id — desativa (soft delete) a unidade
app.delete('/api/unidades/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const empresaId = req.empresaId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Confirma que pertence a esta empresa
    const unidadeCheck = await client.query(
      `SELECT id FROM unidades_monitoradas WHERE id = $1 AND empresa_id = $2`,
      [id, empresaId]
    );
    if (unidadeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unidade nao encontrada nesta empresa.' });
    }

    // Desativa a unidade
    await client.query(
      `UPDATE unidades_monitoradas SET ativo = false WHERE id = $1`,
      [id]
    );

    // Desativa todos os vinculos de usuarios com esta unidade
    await client.query(
      `UPDATE usuario_unidades SET ativo = false WHERE unidade_id = $1`,
      [id]
    );

    await client.query('COMMIT');
    res.json({ mensagem: 'Unidade desativada com sucesso.', id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE /unidades/:id]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao desativar unidade.' });
  } finally {
    client.release();
  }
});

module.exports = app;
