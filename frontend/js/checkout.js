/* checkout.js — Checkout page */

async function loadCheckout() {
  if (!Auth.isLoggedIn()) {
    document.getElementById('checkout-auth-warn').classList.remove('hidden');
    document.getElementById('checkout-layout').classList.add('hidden');
    return;
  }

  try {
    const data = await api.cart.get();
    if (!data.items.length) {
      window.location.href = 'cart.html'; return;
    }

    // Render order summary
    document.getElementById('checkout-items').innerHTML = data.items.map(item => {
      const p = item.product;
      if (!p) return '';
      return `<div class="order-item">
        <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/56'" />
        <div class="order-item-info">
          <div class="order-item-name">${p.name}</div>
          <div class="order-item-qty">Qty: ${item.quantity}</div>
        </div>
        <div class="order-item-price">${formatPrice(p.price * item.quantity)}</div>
      </div>`;
    }).join('');

    const subtotal = data.subtotal;
    const shipping = subtotal >= 500 ? 0 : 49.99;
    const tax      = subtotal * 0.08;
    document.getElementById('co-subtotal').textContent = formatPrice(subtotal);
    document.getElementById('co-shipping').textContent = shipping === 0 ? '✅ FREE' : formatPrice(shipping);
    document.getElementById('co-tax').textContent      = formatPrice(tax);
    document.getElementById('co-total').textContent    = formatPrice(subtotal + shipping + tax);
  } catch (err) {
    Toast.show(err.message, 'error');
  }

  // Format card number
  document.getElementById('cc-number').addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 16);
    e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
  });
  // Format expiry
  document.getElementById('cc-expiry').addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
    e.target.value = v;
  });
  // Pre-fill name from user
  const user = Auth.getUser();
  if (user) {
    document.getElementById('sh-name').value = user.name;
    document.getElementById('cc-name').value  = user.name;
  }
}

async function placeOrder() {
  const btn = document.getElementById('place-order-btn');

  // Validate
  const required = ['sh-name','sh-phone','sh-address','sh-city','sh-zip','cc-name','cc-number','cc-expiry','cc-cvv'];
  for (const id of required) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.classList.add('error');
      el.focus();
      Toast.show('Please fill in all required fields.', 'error');
      setTimeout(() => el.classList.remove('error'), 2000);
      return;
    }
  }

  btn.disabled = true; btn.textContent = '⏳ Placing order…';

  const shipping = {
    name:    document.getElementById('sh-name').value,
    phone:   document.getElementById('sh-phone').value,
    address: document.getElementById('sh-address').value,
    city:    document.getElementById('sh-city').value,
    state:   document.getElementById('sh-state').value,
    zip:     document.getElementById('sh-zip').value,
    country: document.getElementById('sh-country').value,
  };
  const ccNumber = document.getElementById('cc-number').value.replace(/\s/g, '');
  const payment  = { method: 'card', last4: ccNumber.slice(-4) };

  try {
    const result = await api.orders.create({ shipping, payment });
    Cart.updateBadge(0);
    document.getElementById('success-order-id').textContent = `Order ID: ${result.order.id}`;
    document.getElementById('success-modal').classList.add('active');
  } catch (err) {
    Toast.show(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Place Order →';
  }
}

loadCheckout();
