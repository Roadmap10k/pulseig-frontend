const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  try {
    const existing = await db.query('SELECT id FROM businesses WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO businesses (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, plan, created_at`,
      [name, email, hash]
    );

    const business = result.rows[0];
    const token = jwt.sign(
      { id: business.id, name: business.name, email: business.email },
      process.env.JWT_SECRET || 'pulseig_dev_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, business });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM businesses WHERE email = $1 AND active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const business = result.rows[0];
    const valid = await bcrypt.compare(password, business.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: business.id, name: business.name, email: business.email },
      process.env.JWT_SECRET || 'pulseig_dev_secret',
      { expiresIn: '7d' }
    );

    const { password_hash, access_token, ...safe } = business;
    res.json({ token, business: safe });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, instagram_handle, plan, created_at FROM businesses WHERE id = $1`,
      [req.business.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

module.exports = router;
