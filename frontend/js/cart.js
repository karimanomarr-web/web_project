/* cart.js — Shopping cart page */

async function loadCart() {
  if (!Auth.isLoggedIn()) {
    document.getElementById('cart-loading').innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <div style="font-size:4rem; margin-bottom:16px;">🔒</div>
        <h3 style="margin-bottom:12px;">Please sign in to view your cart</h3>
        <a href="login.html?redirect=cart.html" class="btn btn-primary btn-lg">Sign In →</a>
      </div>`;
    return;
  }

  try {
    const data = await api.cart.get();
    document.getElementById('cart-loading').classList.add('hidden');

    if (!data.items.length) {
      document.getElementById('cart-empty').classList.remove('hidden');
      return;
    }

    document.getElementById('cart-layout').classList.remove('hidden');
    renderCartItems(data.items);
    updateSummary(data.subtotal);
  } catch (err) {
    document.getElementById('cart-loading').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function renderCartItems(items) {
  const el = document.getElementById('cart-items-list');
  el.innerHTML = items.map(item => {
    const p = item.product;
    if (!p) return '';
    const subtotal = (p.price * item.quantity).toFixed(2);
    return `
    <div class="cart-item" id="cart-item-${item.id}">
      <div class="cart-item-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/90'" />
      </div>
      <div>
        <div class="cart-item-brand">${p.brand}</div>
        <div class="cart-item-name"><a href="product.html?id=${p.id}" style="color:inherit;">${p.name}</a></div>
        <div class="cart-item-price">${formatPrice(p.price)} each</div>
        <div class="qty-ctrl" style="margin-top:10px;">
          <button onclick="updateQty('${item.id}', ${item.quantity - 1})">−</button>
          <input type="number" value="${item.quantity}" min="1" max="${p.stock}"
            onchange="updateQty('${item.id}', this.value)" />
          <button onclick="updateQty('${item.id}', ${item.quantity + 1})">+</button>
        </div>
      </div>
      <div class="cart-item-subtotal">
        <div class="subtotal-label">Subtotal</div>
        <div class="subtotal-value">$${subtotal}</div>
        <button class="btn btn-danger btn-sm mt-3" onclick="removeItem('${item.id}')">🗑️ Remove</button>
      </div>
    </div>`;
  }).join('');
}

function updateSummary(subtotal) {
  const shipping = subtotal >= 500 ? 0 : 49.99;
  const tax      = subtotal * 0.08;
  const total    = subtotal + shipping + tax;

  document.getElementById('s-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('s-shipping').textContent = shipping === 0 ? '✅ FREE' : formatPrice(shipping);
  document.getElementById('s-tax').textContent      = formatPrice(tax);
  document.getElementById('s-total').textContent    = formatPrice(total);
  Cart.updateBadge(document.querySelectorAll('.cart-item').length);
}

async function updateQty(itemId, newQty) {
  newQty = parseInt(newQty);
  if (newQty < 1) { removeItem(itemId); return; }
  try {
    await api.cart.update(itemId, { quantity: newQty });
    loadCart();
  } catch (err) { Toast.show(err.message, 'error'); }
}

async function removeItem(itemId) {
  try {
    const el = document.getElementById(`cart-item-${itemId}`);
    if (el) { el.style.opacity = '0.4'; el.style.pointerEvents = 'none'; }
    await api.cart.remove(itemId);
    Toast.show('Item removed from cart.', 'info');
    loadCart();
    Cart.syncCount();
  } catch (err) { Toast.show(err.message, 'error'); }
}

async function clearCart() {
  if (!confirm('Clear all items from your cart?')) return;
  try {
    await api.cart.clear();
    Toast.show('Cart cleared.', 'info');
    loadCart();
    Cart.updateBadge(0);
  } catch (err) { Toast.show(err.message, 'error'); }
}

loadCart();
