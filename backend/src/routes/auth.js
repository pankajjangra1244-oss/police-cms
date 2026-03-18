const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'PoliceSecureKey2025';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { badge_number, password } = req.body;
    if (!badge_number || !password)
      return res.status(400).json({ error: 'Badge number and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE badge_number = $1 AND is_active = true', [badge_number]);
    const user = result.rows[0];
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, badge_number: user.badge_number, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, badge_number: user.badge_number, email: user.email, role: user.role, department: user.department, phone: user.phone },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, badge_number, email, password, role, department, phone } = req.body;
    if (!name || !badge_number || !email || !password)
      return res.status(400).json({ error: 'All required fields must be provided' });

    const existing = await pool.query('SELECT * FROM users WHERE badge_number = $1 OR email = $2', [badge_number, email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Badge number or email already exists' });

    const passHash = bcrypt.hashSync(password, 10);
    const insertResult = await pool.query(
      `INSERT INTO users (name, badge_number, email, password_hash, role, department, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
      [name, badge_number, email, passHash, role || 'officer', department, phone]
    );
    const user = insertResult.rows[0];

    res.status(201).json({ message: 'User registered', user: { id: user.id, name, badge_number, email, role: user.role } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
