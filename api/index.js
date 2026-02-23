const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Configurações iniciais
app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rota de Teste (para saber se a API está online)
app.get('/api/health', (req, res) => {
  res.json({ status: 'MetasPro API está operando corretamente' });
});

// Rota de Login (REVISADA)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // 1. Busca o usuário no banco
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // 2. Verifica se o usuário existe
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // 3. Compara a senha (Criptografia OU Chave Mestre para emergência)
    const validPassword = await bcrypt.compare(password, user.password);
    
    // Se a senha bater com o hash OU for exatamente '123456', o login é liberado
    if (validPassword || password === '123456') {
      // Gera o Token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email }, 
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: '8h' }
      );

      return res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.full_name, 
          email: user.email 
        } 
      });
    }

    // Se chegar aqui, a senha está errada
    res.status(401).json({ error: 'Credenciais inválidas' });

  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Exporta para a Vercel
module.exports = app;