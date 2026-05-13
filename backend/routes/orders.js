const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { orders, carts, products } = require('../data/seed');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders  — user sees own orders, admin sees all
router.get('/', authenticate, (req, res) => {
  let result = orders;
  if (req.user.role !== 'admin') {
    result = orders.filter(o => o.userId === req.user.id);
  }
  res.json(result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// GET /api/orders/:id
router.get('/:id', authenticate, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (req.user.role !== 'admin' && order.userId !== req.user.id) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  res.json(order);
});

// POST /api/orders  — place order from cart
router.post('/', authenticate, (req, res) => {
  try {
    const { shipping, payment } = req.body;
    if (!shipping || !shipping.name || !shipping.address || !shipping.city) {
      return res.status(400).json({ message: 'Shipping details are required.' });
    }

    const userCart = carts[req.user.id];
    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // Build order items with product snapshots
    const orderItems = userCart.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found.`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}.`);
      product.stock -= item.quantity; // deduct stock
      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
        subtotal: parseFloat((product.price * item.quantity).toFixed(2)),
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const shippingCost = subtotal >= 500 ? 0 : 49.99;
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + shippingCost + tax).toFixed(2));

    const order = {
      id: `ORD-${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name,
      items: orderItems,
      shipping,
      payment: { method: payment?.method || 'card', last4: payment?.last4 || '****' },
      subtotal: parseFloat(subtotal.toFixed(2)),
      shippingCost,
      tax,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    orders.push(order);
    // Clear cart
    carts[req.user.id] = { items: [] };

    res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/orders/:id  — admin update status
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  order.status = status;
  order.updatedAt = new Date().toISOString();
  res.json({ message: 'Order status updated.', order });
});

// DELETE /api/orders/:id  — admin only
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Order not found.' });
  orders.splice(idx, 1);
  res.json({ message: 'Order deleted.' });
});

module.exports = router;
