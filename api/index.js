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

// ─── Middleware de autenticação JWT ───────────────────────────────────────────
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// ─── Middleware de permissão ADMIN ────────────────────────────────────────────
async function apenasAdmin(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT eu.papel FROM empresa_usuarios eu
       WHERE eu.usuario_id = $1 AND eu.papel = 'ADMIN' AND eu.ativo = true
       LIMIT 1`,
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar permissões.' });
  }
}

// ─── Rota de Teste ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'MetasPro API está operando' });
});

// ─── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────

// Registro de Usuário
app.post('/api/auth/register', async (req, res) => {
  const { name, nome, email, password, senha } = req.body;
  const nomeRecebido = nome || name;
  const senhaRecebida = senha || password;
  try {
    const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'E-mail já cadastrado.' });

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

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, senha, password } = req.body;
  const senhaRecebida = senha || password;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const hashArmazenado = user.senha_hash || user.password;
    if (!hashArmazenado || !senhaRecebida) return res.status(401).json({ error: 'Credenciais inválidas' });
    const validPassword = await bcrypt.compare(senhaRecebida, hashArmazenado);
    if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    return res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Login com Google
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
    res.status(401).json({ error: 'Falha na autenticação com o Google.' });
  }
});

// ─── CRUD DE USUÁRIOS ─────────────────────────────────────────────────────────

app.get('/api/usuarios', autenticar, apenasAdmin, async (req, res) => {
  try {
    const empresaRes = await pool.query(
      `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND papel = 'ADMIN' AND ativo = true LIMIT 1`,
      [req.userId]
    );
    if (empresaRes.rows.length === 0) {
      return res.status(403).json({ error: 'Nenhuma empresa vinculada ao administrador.' });
    }
    const empresaId = empresaRes.rows[0].empresa_id;

    const result = await pool.query(
      `SELECT
         u.id, u.nome, u.email, u.ativo, u.created_at,
         eu.papel, eu.ativo AS vinculo_ativo
       FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       WHERE eu.empresa_id = $1
       ORDER BY u.nome ASC`,
      [empresaId]
    );
    res.json({ usuarios: result.rows, empresaId });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

app.get('/api/usuarios/me/perfil', autenticar, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.ativo, u.created_at,
              eu.papel, eu.empresa_id,
              e.nome_fantasia, e.razao_social
       FROM usuarios u
       LEFT JOIN empresa_usuarios eu ON eu.usuario_id = u.id AND eu.ativo = true
       LEFT JOIN empresas e ON e.id = eu.empresa_id
       WHERE u.id = $1
       LIMIT 1`,
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

app.get('/api/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const empresaRes = await pool.query(
      `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND papel = 'ADMIN' AND ativo = true LIMIT 1`,
      [req.userId]
    );
    if (empresaRes.rows.length === 0) return res.status(403).json({ error: 'Sem empresa vinculada.' });
    const empresaId = empresaRes.rows[0].empresa_id;

    const result = await pool.query(
      `SELECT
         u.id, u.nome, u.email, u.ativo, u.created_at,
         u.google_id, u.avatar_url, u.data_cadastro,
         eu.papel, eu.ativo AS vinculo_ativo,
         e.id AS empresa_id, e.nome_fantasia, e.razao_social, e.cnpj
       FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       INNER JOIN empresas e ON e.id = eu.empresa_id
       WHERE eu.empresa_id = $1 AND u.id = $2`,
      [empresaId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const usuario = result.rows[0];

    // Busca unidades da empresa do usuário
    const unidadesRes = await pool.query(
      `SELECT id, nome_unidade, codigo_unidade, ativo
       FROM unidades_monitoradas
       WHERE empresa_id = $1
       ORDER BY nome_unidade ASC`,
      [usuario.empresa_id]
    );
    usuario.unidades = unidadesRes.rows;

    res.json(usuario);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

app.post('/api/usuarios', autenticar, apenasAdmin, async (req, res) => {
  const { nome, email, senha, papel } = req.body;

  if (!nome || !email || !senha || !papel) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, papel.' });
  }
  const papeisValidos = ['ADMIN', 'DESIGNADO_CONFIGURADOR', 'DESIGNADO_LANCADOR'];
  if (!papeisValidos.includes(papel)) {
    return res.status(400).json({ error: `Papel inválido. Use: ${papeisValidos.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const empresaRes = await client.query(
      `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND papel = 'ADMIN' AND ativo = true LIMIT 1`,
      [req.userId]
    );
    if (empresaRes.rows.length === 0) throw new Error('Sem empresa vinculada ao admin.');
    const empresaId = empresaRes.rows[0].empresa_id;

    const emailCheck = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'E-mail já cadastrado no sistema.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const novoUser = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, ativo)
       VALUES ($1, $2, $3, true)
       RETURNING id, nome, email, ativo, created_at`,
      [nome, email, senhaHash]
    );

    await client.query(
      `INSERT INTO empresa_usuarios (empresa_id, usuario_id, papel, ativo)
       VALUES ($1, $2, $3, true)`,
      [empresaId, novoUser.rows[0].id, papel]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...novoUser.rows[0], papel });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar usuário.' });
  } finally {
    client.release();
  }
});

app.put('/api/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome, email, papel, ativo, novaSenha } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const empresaRes = await client.query(
      `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND papel = 'ADMIN' AND ativo = true LIMIT 1`,
      [req.userId]
    );
    if (empresaRes.rows.length === 0) throw new Error('Sem empresa vinculada ao admin.');
    const empresaId = empresaRes.rows[0].empresa_id;

    const pertenceCheck = await client.query(
      `SELECT u.id FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       WHERE eu.empresa_id = $1 AND u.id = $2`,
      [empresaId, id]
    );
    if (pertenceCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado nesta empresa.' });
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
      if (!papeisValidos.includes(papel)) throw new Error('Papel inválido.');
      await client.query(
        `UPDATE empresa_usuarios SET papel = $1 WHERE empresa_id = $2 AND usuario_id = $3`,
        [papel, empresaId, id]
      );
    }

    await client.query('COMMIT');

    const updated = await pool.query(
      `SELECT u.id, u.nome, u.email, u.ativo, u.created_at, eu.papel
       FROM usuarios u
       INNER JOIN empresa_usuarios eu ON eu.usuario_id = u.id
       WHERE eu.empresa_id = $1 AND u.id = $2`,
      [empresaId, id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar usuário.' });
  } finally {
    client.release();
  }
});

app.delete('/api/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.userId) {
    return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const empresaRes = await client.query(
      `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND papel = 'ADMIN' AND ativo = true LIMIT 1`,
      [req.userId]
    );
    if (empresaRes.rows.length === 0) throw new Error('Sem empresa vinculada ao admin.');
    const empresaId = empresaRes.rows[0].empresa_id;

    const result = await client.query(
      `UPDATE empresa_usuarios SET ativo = false
       WHERE empresa_id = $1 AND usuario_id = $2
       RETURNING id`,
      [empresaId, id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado nesta empresa.' });
    }

    await client.query(`UPDATE usuarios SET ativo = false WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ mensagem: 'Usuário desativado com sucesso.', id: parseInt(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir usuário.' });
  } finally {
    client.release();
  }
});

module.exports = app;
