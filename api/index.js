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

app.post('/api/auth/login', async (req, res) => {
  const { email, senha, password } = req.body;
  const senhaRecebida = senha || password;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (user.ativo === false) return res.status(403).json({ error: 'Usuário inativo. Entre em contato com o administrador.' });

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
    if (user && user.ativo === false) return res.status(403).json({ error: 'Usuário inativo. Entre em contato com o administrador.' });

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

// ─── ROTAS DE OPÇÕES (listas para formulários) ────────────────────────────────

// GET /api/opcoes/empresas — lista todas as empresas ativas (para o admin escolher)
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

// GET /api/opcoes/unidades?empresa_id=xxx — lista unidades ativas de uma empresa
app.get('/api/opcoes/unidades', autenticar, apenasAdmin, async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) {
    return res.status(400).json({ error: 'Parâmetro empresa_id obrigatório.' });
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

// ─── CRUD DE USUÁRIOS ─────────────────────────────────────────────────────────

// GET /api/usuarios — lista todos os usuários da empresa do admin logado
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
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ error: 'Erro ao buscar usuários.', detalhe: err.message });
  }
});

// GET /api/usuarios/me/perfil — perfil do usuário logado
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
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// GET /api/usuarios/:id — detalhe de um usuário com suas unidades vinculadas
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
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const usuario = result.rows[0];

    // Unidades que o usuário tem acesso (via usuario_unidades)
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
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// POST /api/usuarios — cria novo usuário, vincula à empresa escolhida e às unidades selecionadas
app.post('/api/usuarios', autenticar, apenasAdmin, async (req, res) => {
  const { nome, email, senha, papel, empresa_id, unidades } = req.body;
  // unidades: array de UUIDs das unidades selecionadas (pode ser vazio)

  if (!nome || !email || !senha || !papel || !empresa_id) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, papel, empresa_id.' });
  }
  const papeisValidos = ['ADMIN', 'DESIGNADO_CONFIGURADOR', 'DESIGNADO_LANCADOR'];
  if (!papeisValidos.includes(papel)) {
    return res.status(400).json({ error: `Papel inválido. Use: ${papeisValidos.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica se e-mail já existe
    const emailCheck = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'E-mail já cadastrado no sistema.' });
    }

    // Verifica se a empresa_id recebida é válida e ativa
    const empresaCheck = await client.query(
      `SELECT id FROM empresas WHERE id = $1 AND ativo = true`,
      [empresa_id]
    );
    if (empresaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Empresa não encontrada ou inativa.' });
    }

    // Cria o usuário
    // A tabela possui DUAS colunas de senha: "password" (NOT NULL, legada)
    // e "senha_hash" (atual). Ambas precisam ser preenchidas com o mesmo hash.
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const novoUser = await client.query(
      `INSERT INTO usuarios (nome, email, password, senha_hash, ativo)
       VALUES ($1, $2, $3, $3, true)
       RETURNING id, nome, email, ativo, data_cadastro, created_at`,
      [nome, email, senhaHash]
    );
    const novoId = novoUser.rows[0].id;

    // Vincula o usuário à empresa escolhida com o papel definido
    await client.query(
      `INSERT INTO empresa_usuarios (empresa_id, usuario_id, papel, ativo)
       VALUES ($1, $2, $3, true)`,
      [empresa_id, novoId, papel]
    );

    // Vincula o usuário às unidades selecionadas (se houver)
    if (Array.isArray(unidades) && unidades.length > 0) {
      for (const unidade_id of unidades) {
        // Verifica se a unidade pertence à empresa escolhida antes de vincular
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
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar usuário.' });
  } finally {
    client.release();
  }
});

// PUT /api/usuarios/:id — atualiza dados, papel e unidades do usuário
app.put('/api/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome, email, papel, ativo, novaSenha, unidades } = req.body;
  // unidades: array de UUIDs das unidades selecionadas (se presente, substitui as atuais)

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const empresaRes = await client.query(
      `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND papel = 'ADMIN' AND ativo = true LIMIT 1`,
      [req.userId]
    );
    if (empresaRes.rows.length === 0) throw new Error('Sem empresa vinculada ao admin.');
    const empresaId = empresaRes.rows[0].empresa_id;

    // Confirma que o usuário pertence a esta empresa
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

    // Monta o UPDATE dinâmico apenas com os campos fornecidos
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

    // Sincroniza unidades: se o array foi enviado, substitui os vínculos atuais
    if (Array.isArray(unidades)) {
      // Descobre a empresa do usuário para validar as unidades
      const empresaUsuarioRes = await client.query(
        `SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [id]
      );
      const empresaUsuarioId = empresaUsuarioRes.rows[0]?.empresa_id || empresaId;

      // Desativa todos os vínculos atuais
      await client.query(
        `UPDATE usuario_unidades SET ativo = false WHERE usuario_id = $1`,
        [id]
      );

      // Reativa ou insere os vínculos selecionados
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

    // Retorna o usuário atualizado
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
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar usuário.' });
  } finally {
    client.release();
  }
});

// DELETE /api/usuarios/:id — desativa (soft delete) o usuário na empresa
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

    // Desativa o vínculo empresa_usuarios
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

    // Desativa todos os vínculos de unidade do usuário
    await client.query(
      `UPDATE usuario_unidades SET ativo = false WHERE usuario_id = $1`,
      [id]
    );

    // Desativa o usuário
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

// ─── ROTAS DE SESSÃO ─────────────────────────────────────────────────────────
// Usadas pelo frontend imediatamente após o login para determinar
// em qual empresa/unidade o usuário vai atuar na sessão.

// GET /api/session/empresas — lista todas as empresas ativas do usuário logado
// Retorna o papel em cada empresa para exibição no ModalSelecionarEmpresa.
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
    res.status(500).json({ error: 'Erro ao buscar empresas da sessão.' });
  }
});

// GET /api/session/unidades?empresa_id=xxx — lista unidades ativas da empresa
// que o usuário tem acesso (via usuario_unidades).
// Se o usuário for ADMIN da empresa, retorna TODAS as unidades da empresa.
app.get('/api/session/unidades', autenticar, async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) {
    return res.status(400).json({ error: 'Parâmetro empresa_id é obrigatório.' });
  }

  try {
    // Verifica se o usuário pertence a esta empresa e descobre seu papel
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
      // ADMIN vê todas as unidades ativas da empresa
      unidades = await pool.query(
        `SELECT id, nome_unidade, codigo_unidade
         FROM unidades_monitoradas
         WHERE empresa_id = $1 AND ativo = true
         ORDER BY nome_unidade ASC`,
        [empresa_id]
      );
    } else {
      // Usuários designados veem apenas as unidades vinculadas a eles
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

    res.json({ unidades: unidades.rows });
  } catch (err) {
    console.error('[session/unidades]', err.message);
    res.status(500).json({ error: 'Erro ao buscar unidades da sessão.' });
  }
});


// ─── CRUD DE EMPRESAS ─────────────────────────────────────────────────────────

// GET /api/empresas — lista todas as empresas
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

// GET /api/empresas/:id — detalhe com unidades e usuários vinculados
app.get('/api/empresas/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const empresaRes = await pool.query(
      `SELECT id, cnpj, razao_social, nome_fantasia, ativo, criado_em
       FROM empresas WHERE id = $1`,
      [id]
    );
    if (empresaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
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

// POST /api/empresas — cria nova empresa
app.post('/api/empresas', autenticar, apenasAdmin, async (req, res) => {
  const { razao_social, nome_fantasia, cnpj } = req.body;

  if (!razao_social || !cnpj) {
    return res.status(400).json({ error: 'Campos obrigatórios: razao_social, cnpj.' });
  }

  const cnpjDigits = cnpj.replace(/\D/g, '');
  if (cnpjDigits.length !== 14) {
    return res.status(400).json({ error: 'CNPJ inválido. Informe 14 dígitos.' });
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
      return res.status(400).json({ error: 'CNPJ já cadastrado no sistema.' });
    }

    const result = await client.query(
      `INSERT INTO empresas (cnpj, razao_social, nome_fantasia)
       VALUES ($1, $2, $3)
       RETURNING id, cnpj, razao_social, nome_fantasia, ativo, criado_em`,
      [cnpjDigits, razao_social.trim(), (nome_fantasia || razao_social).trim()]
    );

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

// PUT /api/empresas/:id — atualiza dados da empresa
app.put('/api/empresas/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const { razao_social, nome_fantasia, cnpj, ativo } = req.body;

  if (!razao_social || !cnpj) {
    return res.status(400).json({ error: 'Campos obrigatórios: razao_social, cnpj.' });
  }

  const cnpjDigits = cnpj.replace(/\D/g, '');
  if (cnpjDigits.length !== 14) {
    return res.status(400).json({ error: 'CNPJ inválido. Informe 14 dígitos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const empresaCheck = await client.query(
      `SELECT id FROM empresas WHERE id = $1`, [id]
    );
    if (empresaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    const cnpjCheck = await client.query(
      `SELECT id FROM empresas WHERE cnpj = $1 AND id != $2`,
      [cnpjDigits, id]
    );
    if (cnpjCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'CNPJ já pertence a outra empresa.' });
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

// DELETE /api/empresas/:id — desativa (soft delete) a empresa
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
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    await client.query('COMMIT');
    res.json({ mensagem: 'Empresa desativada com sucesso.', id: parseInt(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE /empresas/:id]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao desativar empresa.' });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO UNIDADES DE MONITORAMENTO — CRUD completo
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/unidades — lista todas as unidades com nome da empresa
app.get('/api/unidades', autenticar, apenasAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT um.id, um.empresa_id, um.nome_unidade, um.codigo_unidade, um.ativo, um.criado_em,
              e.nome_fantasia AS empresa_nome
       FROM unidades_monitoradas um
       INNER JOIN empresas e ON e.id = um.empresa_id
       ORDER BY e.nome_fantasia ASC, um.nome_unidade ASC`
    );
    res.json({ unidades: result.rows });
  } catch (err) {
    console.error('[GET /unidades]', err.message);
    res.status(500).json({ error: 'Erro ao buscar unidades.', detalhe: err.message });
  }
});

// GET /api/unidades/:id — detalhe com usuários vinculados
app.get('/api/unidades/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const unidadeRes = await pool.query(
      `SELECT um.id, um.empresa_id, um.nome_unidade, um.codigo_unidade, um.ativo, um.criado_em,
              e.nome_fantasia AS empresa_nome
       FROM unidades_monitoradas um
       INNER JOIN empresas e ON e.id = um.empresa_id
       WHERE um.id = $1`,
      [id]
    );
    if (unidadeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada.' });
    }
    const unidade = unidadeRes.rows[0];

    // Usuários vinculados a esta unidade via usuario_unidades
    const usuariosRes = await pool.query(
      `SELECT u.id, u.nome, u.email, uu.ativo
       FROM usuario_unidades uu
       INNER JOIN usuarios u ON u.id = uu.usuario_id
       WHERE uu.unidade_id = $1 AND uu.ativo = true
       ORDER BY u.nome ASC`,
      [id]
    );
    unidade.usuarios = usuariosRes.rows;

    res.json(unidade);
  } catch (err) {
    console.error('[GET /unidades/:id]', err.message);
    res.status(500).json({ error: 'Erro ao buscar unidade.', detalhe: err.message });
  }
});

// POST /api/unidades — cria nova unidade
app.post('/api/unidades', autenticar, apenasAdmin, async (req, res) => {
  const { nome_unidade, codigo_unidade, empresa_id } = req.body;

  if (!nome_unidade || !empresa_id) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome_unidade, empresa_id.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica se a empresa existe e está ativa
    const empresaCheck = await client.query(
      `SELECT id FROM empresas WHERE id = $1 AND ativo = true`,
      [empresa_id]
    );
    if (empresaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Empresa não encontrada ou inativa.' });
    }

    // Verifica duplicidade de nome na mesma empresa
    if (nome_unidade) {
      const nomeCheck = await client.query(
        `SELECT id FROM unidades_monitoradas WHERE empresa_id = $1 AND LOWER(nome_unidade) = LOWER($2)`,
        [empresa_id, nome_unidade.trim()]
      );
      if (nomeCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Já existe uma unidade com esse nome nesta empresa.' });
      }
    }

    // Verifica duplicidade de código na mesma empresa (se informado)
    if (codigo_unidade && codigo_unidade.trim()) {
      const codigoCheck = await client.query(
        `SELECT id FROM unidades_monitoradas WHERE empresa_id = $1 AND LOWER(codigo_unidade) = LOWER($2)`,
        [empresa_id, codigo_unidade.trim()]
      );
      if (codigoCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Já existe uma unidade com esse código nesta empresa.' });
      }
    }

    const result = await client.query(
      `INSERT INTO unidades_monitoradas (empresa_id, nome_unidade, codigo_unidade)
       VALUES ($1, $2, $3)
       RETURNING id, empresa_id, nome_unidade, codigo_unidade, ativo, criado_em`,
      [empresa_id, nome_unidade.trim(), codigo_unidade?.trim() || null]
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

// PUT /api/unidades/:id — atualiza dados da unidade
app.put('/api/unidades/:id', autenticar, apenasAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome_unidade, codigo_unidade, empresa_id, ativo } = req.body;

  if (!nome_unidade || !empresa_id) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome_unidade, empresa_id.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const unidadeCheck = await client.query(
      `SELECT id FROM unidades_monitoradas WHERE id = $1`, [id]
    );
    if (unidadeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unidade não encontrada.' });
    }

    // Verifica duplicidade de nome (excluindo o próprio registro)
    const nomeCheck = await client.query(
      `SELECT id FROM unidades_monitoradas
       WHERE empresa_id = $1 AND LOWER(nome_unidade) = LOWER($2) AND id != $3`,
      [empresa_id, nome_unidade.trim(), id]
    );
    if (nomeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Já existe outra unidade com esse nome nesta empresa.' });
    }

    // Verifica duplicidade de código (excluindo o próprio registro)
    if (codigo_unidade && codigo_unidade.trim()) {
      const codigoCheck = await client.query(
        `SELECT id FROM unidades_monitoradas
         WHERE empresa_id = $1 AND LOWER(codigo_unidade) = LOWER($2) AND id != $3`,
        [empresa_id, codigo_unidade.trim(), id]
      );
      if (codigoCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Já existe outra unidade com esse código nesta empresa.' });
      }
    }

    const campos = [`nome_unidade = $1`, `codigo_unidade = $2`, `empresa_id = $3`];
    const valores = [
      nome_unidade.trim(),
      codigo_unidade?.trim() || null,
      empresa_id,
    ];

    if (typeof ativo === 'boolean') {
      campos.push(`ativo = $${valores.length + 1}`);
      valores.push(ativo);
    }

    valores.push(id);
    const result = await client.query(
      `UPDATE unidades_monitoradas SET ${campos.join(', ')} WHERE id = $${valores.length}
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE unidades_monitoradas SET ativo = false WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unidade não encontrada.' });
    }

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
