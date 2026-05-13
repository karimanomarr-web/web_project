const express = require('express');
const { categories } = require('../data/seed');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/categories
router.get('/', (req, res) => res.json(categories));

// GET /api/categories/:id
router.get('/:id', (req, res) => {
  const cat = categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ message: 'Category not found.' });
  res.json(cat);
});

// POST /api/categories (admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, icon, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  const id = name.toLowerCase().replace(/\s+/g, '-');
  if (categories.find(c => c.id === id)) return res.status(409).json({ message: 'Category already exists.' });
  const cat = { id, name, icon: icon || '📦', description: description || '' };
  categories.push(cat);
  res.status(201).json({ message: 'Category created.', category: cat });
});

// PUT /api/categories/:id (admin)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Category not found.' });
  categories[idx] = { ...categories[idx], ...req.body, id: categories[idx].id };
  res.json({ message: 'Category updated.', category: categories[idx] });
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Category not found.' });
  categories.splice(idx, 1);
  res.json({ message: 'Category deleted.' });
});

module.exports = router;
