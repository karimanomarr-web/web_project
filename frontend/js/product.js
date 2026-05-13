/* product.js — Single product detail page */

let currentProduct = null;

/* ── Load product from URL ── */
async function loadProduct() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { showError('No product ID specified.'); return; }

  try {
    const product = await api.products.getById(id);
    currentProduct = product;
    renderProduct(product);
    loadRelated(product.category, product.id);
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  document.getElementById('product-loading').innerHTML = `
    <div style="text-align:center; padding: 80px 20px;">
      <div style="font-size:3rem;">⚠️</div>
      <p class="mt-3">${msg}</p>
      <a href="products.html" class="btn btn-outline mt-4">Back to Products</a>
    </div>`;
}

/* ── Render product ── */
function renderProduct(p) {
  document.title = `${p.name} — GarageBasics`;
  document.getElementById('product-loading').classList.add('hidden');
  document.getElementById('product-detail').classList.remove('hidden');
  document.getElementById('bc-product').textContent = p.name;

  // Gallery
  const mainImg = document.getElementById('gallery-main-img');
  mainImg.src = p.image; mainImg.alt = p.name;
  const allImgs = [p.image, ...(p.images || []).filter(i => i !== p.image)];
  document.getElementById('gallery-thumbs').innerHTML = allImgs.map((img, i) => `
    <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchImage('${img}', this)">
      <img src="${img}" alt="View ${i+1}" loading="lazy" onerror="this.parentElement.style.display='none'" />
    </div>`).join('');

  document.getElementById('pd-brand').textContent = p.brand;
  document.getElementById('pd-title').textContent = p.name;
  document.getElementById('pd-sku').textContent = `SKU: ${p.sku}`;
  document.getElementById('pd-rating').innerHTML = `${renderStars(p.rating)} <span class="count" style="font-size:.85rem;color:var(--grey-500)">${p.rating} (${p.reviews} reviews)</span>`;
  document.getElementById('pd-price').innerHTML = renderPrice(p.price, p.originalPrice);
  document.getElementById('pd-desc').textContent = p.description;
  document.getElementById('tab-desc-text').textContent = p.description;

  // Badges
  const save = Math.round((1 - p.price / p.originalPrice) * 100);
  let badges = '';
  if (p.newArrival) badges += `<span class="badge badge-new">New Arrival</span>`;
  if (p.featured)   badges += `<span class="badge badge-teal">Featured</span>`;
  if (save > 0)     badges += `<span class="badge badge-sale">Save ${save}%</span>`;
  document.getElementById('pd-badges').innerHTML = badges;

  // Stock
  const stockEl = document.getElementById('pd-stock');
  if (p.stock > 10)     stockEl.innerHTML = `<span class="stock-dot in"></span> In Stock (${p.stock} available)`;
  else if (p.stock > 0) stockEl.innerHTML = `<span class="stock-dot low"></span> Low Stock — only ${p.stock} left!`;
  else                  stockEl.innerHTML = `<span class="stock-dot out"></span> Out of Stock`;

  if (p.stock === 0) {
    document.getElementById('add-cart-btn').disabled = true;
    document.getElementById('add-cart-btn').textContent = 'Out of Stock';
  }
  document.getElementById('qty-input').max = p.stock;

  // Specs
  const specsEl = document.getElementById('specs-tbody');
  const specs = p.specs || {};
  specsEl.innerHTML = Object.entries(specs).map(([k, v]) =>
    `<tr><td>${k.charAt(0).toUpperCase() + k.slice(1)}</td><td>${v}</td></tr>`).join('') ||
    '<tr><td colspan="2" style="color:var(--grey-400)">No specifications available.</td></tr>';

  // Reviews
  document.getElementById('avg-rating-display').textContent = p.rating.toFixed(1);
  document.getElementById('avg-stars').innerHTML = renderStars(p.rating);
  document.getElementById('review-count-display').textContent = `Based on ${p.reviews} reviews`;
}

/* ── Gallery switch ── */
function switchImage(src, thumbEl) {
  document.getElementById('gallery-main-img').src = src;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
}

/* ── Qty controls ── */
function changeQty(delta) {
  const input = document.getElementById('qty-input');
  const max = currentProduct?.stock || 99;
  let val = parseInt(input.value) + delta;
  val = Math.max(1, Math.min(max, val));
  input.value = val;
}

/* ── Add to cart ── */
async function addToCartFromPage() {
  if (!currentProduct) return;
  const qty = parseInt(document.getElementById('qty-input').value) || 1;
  const btn = document.getElementById('add-cart-btn');
  btn.disabled = true; btn.textContent = '⏳ Adding…';
  await addToCart(currentProduct.id, qty);
  btn.disabled = false; btn.textContent = '🛒 Add to Cart';
}

/* ── Tab switching ── */
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  event.currentTarget.classList.add('active');
  // Fix: use index
  const tabs = ['details', 'specs', 'reviews'];
  tabs.forEach((t, i) => {
    const panel = document.getElementById(`tab-${t}`);
    const btn   = document.querySelectorAll('.tab-btn')[i];
    if (t === name) { panel?.classList.add('active'); btn?.classList.add('active'); }
    else            { panel?.classList.remove('active'); btn?.classList.remove('active'); }
  });
}

/* ── Related Products ── */
async function loadRelated(category, excludeId) {
  const el = document.getElementById('related-products');
  try {
    const data = await api.products.getAll({ category, limit: 4 });
    const filtered = data.products.filter(p => p.id !== excludeId).slice(0, 4);
    el.innerHTML = filtered.length
      ? filtered.map(p => renderProductCard(p)).join('')
      : '<p class="text-muted">No related products found.</p>';
  } catch { el.innerHTML = ''; }
}

/* ── Init ── */
loadProduct();
