const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────── Middleware ────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ──────────────── Routes ────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'GarageBasics API is running', timestamp: new Date().toISOString() });
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ──────────────── 404 & Error Handler ────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error.', error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🏠  GarageBasics API running at http://localhost:${PORT}`);
  console.log(`📦  Frontend served at http://localhost:${PORT}`);
  console.log(`\n  Admin: admin@garagebasics.com / admin123`);
  console.log(`  User:  john@example.com / user123\n`);
});
