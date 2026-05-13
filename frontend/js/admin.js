/* admin.js — Admin dashboard: full CRUD for products, categories, orders, users */

/* ── Guard: admin only ── */
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    alert('Admin access required. Redirecting to login…');
    window.location.href = 'login.html?redirect=admin.html';
  }
});

/* ══ Panel Navigation ══ */
const panels = { dashboard: loadDashboard, products: loadProducts, categories: loadCategories, orders: loadOrders, users: loadUsers };

function showPanel(name) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  const titles = { dashboard: 'Dashboard', products: 'Products', categories: 'Categories', orders: 'Orders', users: 'Users' };
  document.getElementById('admin-title').textContent = titles[name] || name;
  if (panels[name]) panels[name]();
  event?.currentTarget?.classList.add('active');
}

/* ══ Modal helpers ══ */
function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target === o) o.classList.remove('active'); }));

function confirmDelete(msg, cb) {
  document.getElementById('delete-msg').textContent = msg;
  openModal('delete-modal');
  const btn = document.getElementById('delete-confirm-btn');
  btn.onclick = () => { closeModal('delete-modal'); cb(); };
}

/* ══ DASHBOARD ══ */
async function loadDashboard() {
  try {
    const [products, orders, users] = await Promise.all([
      api.products.getAll({ limit: 999 }),
      api.orders.getAll(),
      api.auth.users(),
    ]);
    document.getElementById('stat-products').textContent = products.total;
    document.getElementById('stat-orders').textContent   = orders.length;
    document.getElementById('stat-revenue').textContent  = '$' + orders.reduce((s, o) => s + o.total, 0).toFixed(0);
    document.getElementById('stat-users').textContent    = users.length;

    const tbody = document.getElementById('dashboard-orders-table');
    const recent = orders.slice(0, 8);
    tbody.innerHTML = recent.length ? recent.map(o => `
      <tr>
        <td style="font-weight:700;color:var(--teal)">${o.id}</td>
        <td>${o.userName}</td>
        <td>${o.items.length}</td>
        <td style="font-weight:700;color:var(--orange)">${formatPrice(o.total)}</td>
        <td><span class="order-status ${o.status}">${o.status}</span></td>
        <td style="color:var(--grey-500);font-size:.8rem">${new Date(o.createdAt).toLocaleDateString()}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--grey-400)">No orders yet.</td></tr>';
  } catch (err) { Toast.show(err.message, 'error'); }
}

/* ══ PRODUCTS ══ */
async function loadProducts() {
  const tbody = document.getElementById('products-table');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center"><div class="spinner spinner-sm" style="margin:16px auto"></div></td></tr>';
  try {
    const data = await api.products.getAll({ limit: 999 });
    tbody.innerHTML = data.products.map(p => `
      <tr>
        <td><img src="${p.image}" alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:var(--radius-sm)" onerror="this.src='https://via.placeholder.com/48'" /></td>
        <td style="font-weight:600;max-width:200px;">${p.name}</td>
        <td style="font-size:.75rem;color:var(--grey-500)">${p.sku}</td>
        <td><span class="badge badge-grey">${p.category}</span></td>
        <td style="color:var(--teal);font-weight:600;">${p.brand}</td>
        <td style="font-weight:700;color:var(--orange)">${formatPrice(p.price)}</td>
        <td>${p.stock > 10 ? `<span style="color:var(--success);font-weight:700">${p.stock}</span>` : p.stock > 0 ? `<span style="color:var(--warning);font-weight:700">${p.stock}</span>` : `<span style="color:var(--danger);font-weight:700">0</span>`}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}','${p.name.replace(/'/g,"\\'")}')">🗑️</button>
        </td>
      </tr>`).join('');
  } catch (err) { tbody.innerHTML = `<tr><td colspan="8"><div class="alert alert-danger">${err.message}</div></td></tr>`; }
}

/* ── Product form: populate categories ── */
async function populateCatSelect(selected = '') {
  const sel = document.getElementById('pf-category');
  try {
    const cats = await api.categories.getAll();
    sel.innerHTML = `<option value="">Select Category</option>` + cats.map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
  } catch {}
}

function openProductModal(product = null) {
  document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('pf-id').value           = product?.id || '';
  document.getElementById('pf-name').value         = product?.name || '';
  document.getElementById('pf-sku').value          = product?.sku || '';
  document.getElementById('pf-brand').value        = product?.brand || '';
  document.getElementById('pf-price').value        = product?.price || '';
  document.getElementById('pf-original-price').value = product?.originalPrice || '';
  document.getElementById('pf-stock').value        = product?.stock ?? '';
  document.getElementById('pf-image').value        = product?.image || '';
  document.getElementById('pf-description').value  = product?.description || '';
  document.getElementById('pf-featured').checked   = product?.featured || false;
  document.getElementById('pf-new').checked        = product?.newArrival || false;
  populateCatSelect(product?.category || '');
  document.getElementById('product-save-btn').textContent = product ? 'Save Changes' : 'Add Product';
  openModal('product-modal');
}

async function editProduct(id) {
  try {
    const p = await api.products.getById(id);
    openProductModal(p);
  } catch (err) { Toast.show(err.message, 'error'); }
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id  = document.getElementById('pf-id').value;
  const btn = document.getElementById('product-save-btn');
  btn.disabled = true; btn.textContent = '⏳ Saving…';
  const body = {
    name:          document.getElementById('pf-name').value,
    category:      document.getElementById('pf-category').value,
    brand:         document.getElementById('pf-brand').value,
    price:         document.getElementById('pf-price').value,
    originalPrice: document.getElementById('pf-original-price').value,
    stock:         document.getElementById('pf-stock').value,
    image:         document.getElementById('pf-image').value,
    description:   document.getElementById('pf-description').value,
    featured:      document.getElementById('pf-featured').checked,
    newArrival:    document.getElementById('pf-new').checked,
  };
  try {
    if (id) { await api.products.update(id, body); Toast.show('Product updated! ✅', 'success'); }
    else    { await api.products.create(body);      Toast.show('Product created! ✅', 'success'); }
    closeModal('product-modal');
    loadProducts();
  } catch (err) { Toast.show(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = id ? 'Save Changes' : 'Add Product'; }
});

function deleteProduct(id, name) {
  confirmDelete(`Delete "${name}"? This cannot be undone.`, async () => {
    try {
      await api.products.delete(id);
      Toast.show('Product deleted.', 'info');
      loadProducts();
    } catch (err) { Toast.show(err.message, 'error'); }
  });
}

/* ══ CATEGORIES ══ */
async function loadCategories() {
  const tbody = document.getElementById('categories-table');
  try {
    const cats = await api.categories.getAll();
    tbody.innerHTML = cats.map(c => `
      <tr>
        <td style="font-size:1.5rem">${c.icon}</td>
        <td style="font-size:.8rem;color:var(--grey-500);font-family:monospace">${c.id}</td>
        <td style="font-weight:700">${c.name}</td>
        <td style="color:var(--grey-600);font-size:.85rem">${c.description}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editCategory('${c.id}','${c.name.replace(/'/g,"\\'")}','${c.icon}','${c.description.replace(/'/g,"\\'")}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}','${c.name.replace(/'/g,"\\'")}')">🗑️</button>
        </td>
      </tr>`).join('');
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5"><div class="alert alert-danger">${err.message}</div></td></tr>`; }
}

function openCatModal() {
  document.getElementById('cat-modal-title').textContent = 'Add Category';
  document.getElementById('cf-id').value   = '';
  document.getElementById('cf-name').value = '';
  document.getElementById('cf-icon').value = '';
  document.getElementById('cf-desc').value = '';
  document.getElementById('cat-save-btn').textContent = 'Add Category';
  openModal('cat-modal');
}

function editCategory(id, name, icon, desc) {
  document.getElementById('cat-modal-title').textContent = 'Edit Category';
  document.getElementById('cf-id').value   = id;
  document.getElementById('cf-name').value = name;
  document.getElementById('cf-icon').value = icon;
  document.getElementById('cf-desc').value = desc;
  document.getElementById('cat-save-btn').textContent = 'Save Changes';
  openModal('cat-modal');
}

document.getElementById('cat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id  = document.getElementById('cf-id').value;
  const btn = document.getElementById('cat-save-btn');
  btn.disabled = true; btn.textContent = '⏳ Saving…';
  const body = { name: document.getElementById('cf-name').value, icon: document.getElementById('cf-icon').value, description: document.getElementById('cf-desc').value };
  try {
    if (id) { await api.categories.update(id, body); Toast.show('Category updated! ✅', 'success'); }
    else    { await api.categories.create(body);     Toast.show('Category created! ✅', 'success'); }
    closeModal('cat-modal');
    loadCategories();
  } catch (err) { Toast.show(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = id ? 'Save Changes' : 'Add Category'; }
});

function deleteCategory(id, name) {
  confirmDelete(`Delete category "${name}"?`, async () => {
    try { await api.categories.delete(id); Toast.show('Category deleted.', 'info'); loadCategories(); }
    catch (err) { Toast.show(err.message, 'error'); }
  });
}

/* ══ ORDERS ══ */
async function loadOrders() {
  const tbody = document.getElementById('orders-table');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center"><div class="spinner spinner-sm" style="margin:16px auto"></div></td></tr>';
  try {
    const orders = await api.orders.getAll();
    tbody.innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td style="font-weight:700;color:var(--teal);font-size:.85rem">${o.id}</td>
        <td>${o.userName}</td>
        <td>${o.items.length}</td>
        <td style="font-weight:700;color:var(--orange)">${formatPrice(o.total)}</td>
        <td>
          <select class="sort-select" style="padding:6px 10px;font-size:.8rem;" onchange="updateOrderStatus('${o.id}', this.value)">
            ${['pending','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>
        </td>
        <td style="color:var(--grey-500);font-size:.8rem">${new Date(o.createdAt).toLocaleDateString()}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.id}')">🗑️</button></td>
      </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--grey-400)">No orders yet.</td></tr>';
  } catch (err) { tbody.innerHTML = `<tr><td colspan="7"><div class="alert alert-danger">${err.message}</div></td></tr>`; }
}

async function updateOrderStatus(id, status) {
  try { await api.orders.update(id, { status }); Toast.show(`Order status → ${status}`, 'success'); }
  catch (err) { Toast.show(err.message, 'error'); loadOrders(); }
}

function deleteOrder(id) {
  confirmDelete(`Delete order ${id}? This cannot be undone.`, async () => {
    try { await api.orders.delete(id); Toast.show('Order deleted.', 'info'); loadOrders(); }
    catch (err) { Toast.show(err.message, 'error'); }
  });
}

/* ══ USERS ══ */
async function loadUsers() {
  const tbody = document.getElementById('users-table');
  try {
    const users = await api.auth.users();
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><div style="font-weight:700">${u.name}</div></td>
        <td style="color:var(--grey-600);font-size:.875rem">${u.email}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-teal' : 'badge-grey'}">${u.role}</span></td>
        <td style="color:var(--grey-500);font-size:.8rem">${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>${u.role !== 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}','${u.name.replace(/'/g,"\\'")}')">🗑️ Delete</button>` : '<span style="color:var(--grey-400);font-size:.8rem">Protected</span>'}</td>
      </tr>`).join('');
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5"><div class="alert alert-danger">${err.message}</div></td></tr>`; }
}

function deleteUser(id, name) {
  confirmDelete(`Delete user "${name}"?`, async () => {
    try { await api.auth.deleteUser(id); Toast.show('User deleted.', 'info'); loadUsers(); }
    catch (err) { Toast.show(err.message, 'error'); }
  });
}

/* ══ Init ══ */
loadDashboard();
