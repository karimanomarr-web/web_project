const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { carts, products } = require('../data/seed');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const getCart = (userId) => {
  if (!carts[userId]) carts[userId] = { items: [] };
  return carts[userId];
};

// GET /api/cart
router.get('/', authenticate, (req, res) => {
  const cart = getCart(req.user.id);
  const enriched = cart.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product: product || null };
  });
  const subtotal = enriched.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
  res.json({ items: enriched, subtotal: parseFloat(subtotal.toFixed(2)), itemCount: enriched.reduce((s, i) => s + i.quantity, 0) });
});

// POST /api/cart  — add item
router.post('/', authenticate, (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId is required.' });
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  if (product.stock < quantity) return res.status(400).json({ message: 'Insufficient stock.' });

  const cart = getCart(req.user.id);
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + parseInt(quantity), product.stock);
  } else {
    cart.items.push({ id: uuidv4(), productId, quantity: parseInt(quantity) });
  }
  res.json({ message: 'Item added to cart.', cart });
});

// PUT /api/cart/:itemId  — update quantity
router.put('/:itemId', authenticate, (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ message: 'Valid quantity required.' });
  const cart = getCart(req.user.id);
  const item = cart.items.find(i => i.id === req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Cart item not found.' });
  const product = products.find(p => p.id === item.productId);
  if (product && quantity > product.stock) return res.status(400).json({ message: 'Insufficient stock.' });
  item.quantity = parseInt(quantity);
  res.json({ message: 'Cart item updated.', cart });
});

// DELETE /api/cart/:itemId  — remove item
router.delete('/:itemId', authenticate, (req, res) => {
  const cart = getCart(req.user.id);
  const idx = cart.items.findIndex(i => i.id === req.params.itemId);
  if (idx === -1) return res.status(404).json({ message: 'Cart item not found.' });
  cart.items.splice(idx, 1);
  res.json({ message: 'Item removed.', cart });
});

// DELETE /api/cart  — clear cart
router.delete('/', authenticate, (req, res) => {
  carts[req.user.id] = { items: [] };
  res.json({ message: 'Cart cleared.' });
});

module.exports = router;
