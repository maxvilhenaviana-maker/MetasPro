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

// Rota de Teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'MetasPro API está operando' });
});

// NOVA ROTA: Registro de Usuário
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await pool.query(
      'INSERT INTO users (nome, email, password) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [name, email, hashedPassword]
    );

    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    res.status(201).json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor ao registrar.' });
  }
});

// Rota de Login Original (Preservada com bypass '123456')
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (validPassword || password === '123456') {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
      return res.json({ token, user: { id: user.id, name: user.nome, email: user.email } });
    }
    res.status(401).json({ error: 'Credenciais inválidas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// NOVA ROTA: Login com Google
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, sub: googleId } = ticket.getPayload();

    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    if (!user) {
      const insertResult = await pool.query(
        'INSERT INTO users (nome, email, google_id) VALUES ($1, $2, $3) RETURNING id, nome, email',
        [name, email, googleId]
      );
      user = insertResult.rows[0];
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    res.json({ token, user });
  } catch (error) {
    res.status(401).json({ error: 'Falha na autenticação com o Google.' });
  }
});

module.exports = app;