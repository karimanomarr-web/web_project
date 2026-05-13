/* ─────────────────────────────────────────────────────────
   api.js — Centralized API client for all backend calls
   ───────────────────────────────────────────────────────── */

const API_BASE = 'http://localhost:5000/api';

const api = {
  /* ── Internal fetch wrapper ── */
  async _request(method, endpoint, body = null, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = localStorage.getItem('gb_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  },

  get:    (ep, auth = false)           => api._request('GET',    ep, null, auth),
  post:   (ep, body, auth = false)     => api._request('POST',   ep, body, auth),
  put:    (ep, body, auth = false)     => api._request('PUT',    ep, body, auth),
  delete: (ep, auth = false)           => api._request('DELETE', ep, null, auth),

  /* ── Auth ── */
  auth: {
    login:    (body) => api.post('/auth/login', body),
    register: (body) => api.post('/auth/register', body),
    me:       ()     => api.get('/auth/me', true),
    update:   (body) => api.put('/auth/me', body, true),
    users:    ()     => api.get('/auth/users', true),
    deleteUser: (id) => api.delete(`/auth/users/${id}`, true),
  },

  /* ── Products ── */
  products: {
    getAll:  (params = {}) => api.get(`/products?${new URLSearchParams(params)}`),
    getById: (id)          => api.get(`/products/${id}`),
    brands:  ()            => api.get('/products/brands'),
    create:  (body)        => api.post('/products', body, true),
    update:  (id, body)    => api.put(`/products/${id}`, body, true),
    delete:  (id)          => api.delete(`/products/${id}`, true),
  },

  /* ── Categories ── */
  categories: {
    getAll:  ()       => api.get('/categories'),
    create:  (body)   => api.post('/categories', body, true),
    update:  (id, b)  => api.put(`/categories/${id}`, b, true),
    delete:  (id)     => api.delete(`/categories/${id}`, true),
  },

  /* ── Cart ── */
  cart: {
    get:     ()             => api.get('/cart', true),
    add:     (body)         => api.post('/cart', body, true),
    update:  (itemId, body) => api.put(`/cart/${itemId}`, body, true),
    remove:  (itemId)       => api.delete(`/cart/${itemId}`, true),
    clear:   ()             => api.delete('/cart', true),
  },

  /* ── Orders ── */
  orders: {
    getAll:  ()        => api.get('/orders', true),
    getById: (id)      => api.get(`/orders/${id}`, true),
    create:  (body)    => api.post('/orders', body, true),
    update:  (id, b)   => api.put(`/orders/${id}`, b, true),
    delete:  (id)      => api.delete(`/orders/${id}`, true),
  },
};

window.api = api;
