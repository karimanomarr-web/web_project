/* ─────────────────────────────────────────────────────────
   main.js — Shared utilities: auth state, header, toasts
   ───────────────────────────────────────────────────────── */

/* ══ Auth State ══ */
const Auth = {
  getToken() { return localStorage.getItem('gb_token'); },
  getUser()  {
    try { return JSON.parse(localStorage.getItem('gb_user')); } catch { return null; }
  },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin()    { return this.getUser()?.role === 'admin'; },

  save(token, user) {
    localStorage.setItem('gb_token', token);
    localStorage.setItem('gb_user', JSON.stringify(user));
    this.updateUI();
    Cart.syncCount();
  },
  logout() {
    localStorage.removeItem('gb_token');
    localStorage.removeItem('gb_user');
    this.updateUI();
    Toast.show('Logged out successfully.', 'info');
    Cart.updateBadge(0);
    setTimeout(() => { window.location.href = '/index.html'; }, 800);
  },

  updateUI() {
    const user = this.getUser();
    const loginBtn    = document.getElementById('header-login-btn');
    const userBtn     = document.getElementById('header-user-btn');
    const adminLink   = document.getElementById('header-admin-link');
    const userName    = document.getElementById('header-user-name');
    const logoutBtn   = document.getElementById('header-logout-btn');

    if (user) {
      if (loginBtn)  loginBtn.classList.add('hidden');
      if (userBtn)   userBtn.classList.remove('hidden');
      if (userName)  userName.textContent = user.name.split(' ')[0];
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      if (adminLink && user.role === 'admin') adminLink.classList.remove('hidden');
    } else {
      if (loginBtn)  loginBtn.classList.remove('hidden');
      if (userBtn)   userBtn.classList.add('hidden');
      if (logoutBtn) logoutBtn.classList.add('hidden');
      if (adminLink) adminLink.classList.add('hidden');
    }
  },
};

/* ══ Toast ══ */
const Toast = {
  show(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  },
};

/* ══ Cart Badge ══ */
const Cart = {
  updateBadge(count) {
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  },
  async syncCount() {
    if (!Auth.isLoggedIn()) return;
    try {
      const data = await api.cart.get();
      this.updateBadge(data.itemCount || 0);
    } catch {}
  },
};

/* ══ Rating Stars ══ */
function renderStars(rating, max = 5) {
  let html = '<span class="stars">';
  for (let i = 1; i <= max; i++) {
    html += i <= Math.round(rating)
      ? '<span>★</span>'
      : '<span class="empty">★</span>';
  }
  return html + '</span>';
}

/* ══ Price Helpers ══ */
function formatPrice(n) { return `$${parseFloat(n).toFixed(2)}`; }
function calcSave(orig, curr) {
  if (!orig || orig <= curr) return null;
  return Math.round((1 - curr / orig) * 100);
}
function renderPrice(price, originalPrice) {
  const save = calcSave(originalPrice, price);
  return `<div class="price-wrap">
    <span class="price-current">${formatPrice(price)}</span>
    ${originalPrice && originalPrice > price ? `<span class="price-original">${formatPrice(originalPrice)}</span>` : ''}
    ${save ? `<span class="price-save">Save ${save}%</span>` : ''}
  </div>`;
}

/* ══ Product Card ══ */
function renderProductCard(product) {
  const save = calcSave(product.originalPrice, product.price);
  return `
  <div class="product-card" id="pcard-${product.id}">
    <div class="product-card-img">
      <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400/F3F4F6/9CA3AF?text=No+Image'">
      <div class="product-card-badges">
        ${save ? `<span class="badge badge-sale">-${save}%</span>` : ''}
        ${product.newArrival ? `<span class="badge badge-new">New</span>` : ''}
        ${product.featured ? `<span class="badge badge-teal">Featured</span>` : ''}
      </div>
      <button class="wishlist-btn" title="Save">♡</button>
      <div class="product-card-actions">
        <button class="btn btn-primary btn-sm flex-1 add-to-cart-btn"
          data-id="${product.id}" data-name="${product.name}">
          🛒 Add to Cart
        </button>
        <a href="product.html?id=${product.id}" class="btn btn-ghost btn-sm" style="color:#fff;border-color:rgba(255,255,255,.4)">View</a>
      </div>
    </div>
    <div class="product-card-body">
      <div class="product-brand">${product.brand}</div>
      <div class="product-name"><a href="product.html?id=${product.id}">${product.name}</a></div>
      <div class="product-rating">
        ${renderStars(product.rating)}
        <span class="count">(${product.reviews})</span>
      </div>
    </div>
    <div class="product-card-footer">${renderPrice(product.price, product.originalPrice)}</div>
  </div>`;
}

/* ══ Add to Cart ══ */
async function addToCart(productId, qty = 1) {
  if (!Auth.isLoggedIn()) {
    Toast.show('Please log in to add items to cart.', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    return;
  }
  try {
    await api.cart.add({ productId, quantity: qty });
    Toast.show('Added to cart! 🛒', 'success');
    await Cart.syncCount();
  } catch (err) {
    Toast.show(err.message || 'Could not add to cart.', 'error');
  }
}

/* ══ Search ══ */
function initHeaderSearch() {
  const form = document.getElementById('search-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('search-input').value.trim();
    if (q) window.location.href = `products.html?search=${encodeURIComponent(q)}`;
  });
}

/* ══ Category Nav ══ */
async function loadCategoryNav() {
  const container = document.getElementById('cat-nav');
  if (!container) return;
  try {
    const cats = await api.categories.getAll();
    container.innerHTML = cats.map(c => `
      <a class="cat-link" href="products.html?category=${c.id}">
        <span class="cat-icon">${c.icon}</span> ${c.name}
      </a>`).join('');
    // Highlight active
    const params = new URLSearchParams(window.location.search);
    const active = params.get('category');
    if (active) {
      container.querySelectorAll('.cat-link').forEach(l => {
        if (l.href.includes(`category=${active}`)) l.classList.add('active');
      });
    }
  } catch {}
}

/* ══ Logout button ══ */
function bindLogout() {
  const btn = document.getElementById('header-logout-btn');
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
}

/* ══ Global delegation: Add-to-cart buttons ══ */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart-btn');
  if (btn) {
    const id = btn.dataset.id;
    if (id) addToCart(id);
  }
});

/* ══ Init on every page ══ */
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateUI();
  Cart.syncCount();
  loadCategoryNav();
  initHeaderSearch();
  bindLogout();
});

window.Auth = Auth;
window.Toast = Toast;
window.Cart = Cart;
window.renderProductCard = renderProductCard;
window.renderStars = renderStars;
window.renderPrice = renderPrice;
window.formatPrice = formatPrice;
window.addToCart = addToCart;
