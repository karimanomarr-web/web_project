const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { users } = require('../data/seed');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(), name, email: email.toLowerCase(),
      password: hashed, role: 'user',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

// PUT /api/auth/me  (update profile)
router.put('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const { name, email, password } = req.body;
    if (name) user.name = name;
    if (email) {
      const conflict = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== user.id);
      if (conflict) return res.status(409).json({ message: 'Email already in use.' });
      user.email = email.toLowerCase();
    }
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      user.password = await bcrypt.hash(password, 10);
    }
    res.json({ message: 'Profile updated.', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/auth/users  (admin only)
router.get('/users', require('../middleware/auth').authenticate, require('../middleware/auth').requireAdmin, (req, res) => {
  res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })));
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', require('../middleware/auth').authenticate, require('../middleware/auth').requireAdmin, (req, res) => {
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'User not found.' });
  if (users[idx].role === 'admin') return res.status(403).json({ message: 'Cannot delete admin user.' });
  users.splice(idx, 1);
  res.json({ message: 'User deleted.' });
});

module.exports = router;
