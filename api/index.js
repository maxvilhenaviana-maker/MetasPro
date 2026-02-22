const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Login Tradicional
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    res.json({ ...generateTokens(user), user: { nome: user.nome, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Login com Google
app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name } = ticket.getPayload();
    let { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = rows[0];

    if (!user) {
      const newUser = await pool.query(
        'INSERT INTO users (nome, email, password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, 'oauth_account']
      );
      user = newUser.rows[0];
    }
    res.json({ ...generateTokens(user), user: { nome: user.nome, email: user.email } });
  } catch (err) {
    res.status(400).json({ error: 'Falha no Google OAuth' });
  }
});

// Refresh Token
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token ausente' });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    const tokens = generateTokens({ id: decoded.id });
    res.json(tokens);
  });
});

module.exports = app;