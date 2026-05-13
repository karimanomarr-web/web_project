/* products.js — Shop listing page logic */

const state = {
  page: 1, limit: 12,
  category: '', brands: [], minPrice: '', maxPrice: '',
  sort: '', search: '', total: 0, totalPages: 1,
};

/* ── Read URL params on load ── */
(function readParams() {
  const p = new URLSearchParams(window.location.search);
  state.category = p.get('category') || '';
  state.search   = p.get('search')   || '';
  state.sort     = p.get('sort')     || '';
  if (state.search) {
    const inp = document.getElementById('search-input');
    if (inp) inp.value = state.search;
  }
  // Update page title
  if (state.category) {
    const formatted = state.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    document.getElementById('page-title').textContent = formatted;
    document.getElementById('breadcrumb-cat').textContent = formatted;
    document.title = `${formatted} — GarageBasics`;
  } else if (state.search) {
    document.getElementById('page-title').textContent = `Search: "${state.search}"`;
    document.getElementById('breadcrumb-cat').textContent = `Search`;
  }
})();

/* ── Load filter options ── */
async function loadFilterOptions() {
  // Categories
  try {
    const cats = await api.categories.getAll();
    const el = document.getElementById('filter-categories');
    el.innerHTML = cats.map(c => `
      <div class="filter-option">
        <input type="checkbox" id="fcat-${c.id}" value="${c.id}" class="filter-cat-cb"
          ${state.category === c.id ? 'checked' : ''} />
        <label for="fcat-${c.id}">${c.icon} ${c.name}</label>
      </div>`).join('');
    el.querySelectorAll('.filter-cat-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        state.category = cb.checked ? cb.value : '';
        el.querySelectorAll('.filter-cat-cb').forEach(o => { if (o !== cb) o.checked = false; });
        state.page = 1; loadProducts();
      });
    });
  } catch {}

  // Brands
  try {
    const brands = await api.products.brands();
    const el = document.getElementById('filter-brands');
    el.innerHTML = brands.map(b => `
      <div class="filter-option">
        <input type="checkbox" id="fbrand-${b}" value="${b}" class="filter-brand-cb" />
        <label for="fbrand-${b}">${b}</label>
      </div>`).join('');
    el.querySelectorAll('.filter-brand-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        state.brands = [...el.querySelectorAll('.filter-brand-cb:checked')].map(c => c.value);
        state.page = 1; loadProducts();
      });
    });
  } catch {}

  // Sort
  const sortEl = document.getElementById('sort-select');
  if (sortEl) {
    sortEl.value = state.sort;
    sortEl.addEventListener('change', () => { state.sort = sortEl.value; state.page = 1; loadProducts(); });
  }
}

/* ── Load Products ── */
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = Array(6).fill(`<div class="skeleton" style="height:340px;border-radius:16px;"></div>`).join('');

  const params = { page: state.page, limit: state.limit };
  if (state.category) params.category = state.category;
  if (state.brands.length) params.brand = state.brands.join(',');
  if (state.minPrice) params.minPrice = state.minPrice;
  if (state.maxPrice) params.maxPrice = state.maxPrice;
  if (state.sort) params.sort = state.sort;
  if (state.search) params.search = state.search;

  try {
    const data = await api.products.getAll(params);
    state.total = data.total;
    state.totalPages = data.totalPages;

    document.getElementById('results-count').innerHTML =
      `Showing <strong>${data.products.length}</strong> of <strong>${data.total}</strong> products`;

    if (!data.products.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No products found</h3>
          <p class="text-muted mt-2">Try adjusting your filters or search query.</p>
          <button class="btn btn-outline mt-4" onclick="clearFilters()">Clear Filters</button>
        </div>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    grid.innerHTML = data.products.map(p => renderProductCard(p)).join('');
    renderPagination();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

/* ── Pagination ── */
function renderPagination() {
  const el = document.getElementById('pagination');
  if (state.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="changePage(${state.page - 1})" ${state.page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= state.totalPages; i++) {
    if (i === 1 || i === state.totalPages || Math.abs(i - state.page) <= 2) {
      html += `<button class="page-btn ${i === state.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    } else if (Math.abs(i - state.page) === 3) {
      html += `<span style="padding:0 4px;color:var(--grey-400)">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="changePage(${state.page + 1})" ${state.page === state.totalPages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function changePage(p) {
  if (p < 1 || p > state.totalPages) return;
  state.page = p;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Price Filter ── */
function applyPriceFilter() {
  state.minPrice = document.getElementById('filter-min-price').value;
  state.maxPrice = document.getElementById('filter-max-price').value;
  state.page = 1;
  loadProducts();
}

/* ── Clear Filters ── */
function clearFilters() {
  state.category = ''; state.brands = []; state.minPrice = ''; state.maxPrice = '';
  state.sort = ''; state.search = ''; state.page = 1;
  document.querySelectorAll('.filter-cat-cb, .filter-brand-cb').forEach(cb => cb.checked = false);
  document.getElementById('filter-min-price').value = '';
  document.getElementById('filter-max-price').value = '';
  document.getElementById('sort-select').value = '';
  document.getElementById('search-input').value = '';
  loadProducts();
}

function toggleFilterSidebar() {
  document.getElementById('filter-sidebar').classList.toggle('open');
}

/* ── Init ── */
loadFilterOptions();
loadProducts();
