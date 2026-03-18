const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'PoliceSecureKey2025';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { badge_number, password } = req.body;
    if (!badge_number || !password)
      return res.status(400).json({ error: 'Badge number and password are required' });

    const user = await db.users.findOneAsync({ badge_number, is_active: true });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, badge_number: user.badge_number, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, badge_number: user.badge_number, email: user.email, role: user.role, department: user.department, phone: user.phone },
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

    const existing = await db.users.findOneAsync({ $or: [{ badge_number }, { email }] });
    if (existing) return res.status(409).json({ error: 'Badge number or email already exists' });

    const now = new Date().toISOString();
    const user = await db.users.insertAsync({
      _id: uuidv4(), name, badge_number, email,
      password_hash: bcrypt.hashSync(password, 10),
      role: role || 'officer', department, phone, is_active: true,
      created_at: now, updated_at: now
    });

    res.status(201).json({ message: 'User registered', user: { id: user._id, name, badge_number, email, role: user.role } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.users.findOneAsync({ _id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safeUser } = user;
    res.json({ ...safeUser, id: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
