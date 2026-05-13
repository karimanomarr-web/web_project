const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { products } = require('../data/seed');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/products  — with filters & sorting
router.get('/', (req, res) => {
  let result = [...products];
  const { category, brand, minPrice, maxPrice, sort, featured, newArrival, search } = req.query;

  if (category) result = result.filter(p => p.category === category);
  if (brand) {
    const brands = brand.split(',');
    result = result.filter(p => brands.includes(p.brand));
  }
  if (minPrice) result = result.filter(p => p.price >= parseFloat(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= parseFloat(maxPrice));
  if (featured === 'true') result = result.filter(p => p.featured);
  if (newArrival === 'true') result = result.filter(p => p.newArrival);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
  else if (sort === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
  else if (sort === 'newest') result.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = result.slice(start, start + limit);

  res.json({ products: paginated, total, page, totalPages, limit });
});

// GET /api/products/brands — distinct brands
router.get('/brands', (req, res) => {
  const brands = [...new Set(products.map(p => p.brand))];
  res.json(brands);
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id || p.sku === req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json(product);
});

// POST /api/products  (admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, category, brand, price, originalPrice, stock, description, specs, image, images } = req.body;
    if (!name || !category || !brand || price === undefined) {
      return res.status(400).json({ message: 'name, category, brand, and price are required.' });
    }
    const newProduct = {
      id: uuidv4(),
      sku: `SKU-${Date.now()}`,
      name, category, brand,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
      stock: parseInt(stock) || 0,
      rating: 0, reviews: 0,
      image: image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
      images: images || [],
      description: description || '',
      specs: specs || {},
      featured: req.body.featured || false,
      newArrival: req.body.newArrival || false,
    };
    products.push(newProduct);
    res.status(201).json({ message: 'Product created.', product: newProduct });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// PUT /api/products/:id  (admin)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Product not found.' });
  const updated = { ...products[idx], ...req.body, id: products[idx].id };
  if (req.body.price) updated.price = parseFloat(req.body.price);
  if (req.body.originalPrice) updated.originalPrice = parseFloat(req.body.originalPrice);
  if (req.body.stock !== undefined) updated.stock = parseInt(req.body.stock);
  products[idx] = updated;
  res.json({ message: 'Product updated.', product: updated });
});

// DELETE /api/products/:id  (admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Product not found.' });
  products.splice(idx, 1);
  res.json({ message: 'Product deleted.' });
});

module.exports = router;
