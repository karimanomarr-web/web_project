/* home.js — Homepage: hero slider, categories, featured products */

/* ══ Hero Slider ══ */
(function initSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.slider-dot');
  let current  = 0, timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    slides[current].classList.add('prev');
    dots[current].classList.remove('active');
    setTimeout(() => slides[current].classList.remove('prev'), 800);
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  document.getElementById('slide-next')?.addEventListener('click', () => { clearInterval(timer); next(); timer = setInterval(next, 5000); });
  document.getElementById('slide-prev')?.addEventListener('click', () => { clearInterval(timer); prev(); timer = setInterval(next, 5000); });

  dots.forEach(d => d.addEventListener('click', () => {
    clearInterval(timer);
    goTo(parseInt(d.dataset.index));
    timer = setInterval(next, 5000);
  }));

  timer = setInterval(next, 5000);
})();

/* ══ Category Images ══ */
const catImages = {
  'cabinets':     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
  'flooring':     'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=600',
  'workbenches':  'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600',
  'shelving':     'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600',
  'wall-storage': 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600',
  'accessories':  'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600',
};

/* ══ Load Categories ══ */
async function loadHomeCategories() {
  const el = document.getElementById('home-categories');
  if (!el) return;
  try {
    const cats = await api.categories.getAll();
    el.innerHTML = cats.map(c => `
      <a class="cat-tile" href="products.html?category=${c.id}">
        <img class="cat-tile-img" src="${catImages[c.id] || catImages['accessories']}" alt="${c.name}" loading="lazy" />
        <div class="cat-tile-overlay"></div>
        <div class="cat-tile-content">
          <div class="cat-tile-icon">${c.icon}</div>
          <div class="cat-tile-name">${c.name}</div>
          <div class="cat-tile-count">${c.description}</div>
        </div>
      </a>`).join('');
  } catch {
    el.innerHTML = '<p class="text-muted text-center" style="grid-column:1/-1">Could not load categories.</p>';
  }
}

/* ══ Load Featured Products ══ */
async function loadFeaturedProducts() {
  const el = document.getElementById('featured-products');
  if (!el) return;
  el.innerHTML = Array(4).fill('<div class="skeleton" style="height:360px;border-radius:16px;"></div>').join('');
  try {
    const data = await api.products.getAll({ featured: 'true', limit: 4 });
    if (!data.products.length) {
      el.innerHTML = '<p class="text-muted text-center" style="grid-column:1/-1">No featured products.</p>';
      return;
    }
    el.innerHTML = data.products.map(p => renderProductCard(p)).join('');
  } catch {
    el.innerHTML = '<p class="text-muted text-center" style="grid-column:1/-1">Could not load products.</p>';
  }
}

/* ══ Newsletter ══ */
document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('newsletter-email').value;
  Toast.show(`Thanks! ${email} has been subscribed. 🎉`, 'success');
  e.target.reset();
});

/* ══ Init ══ */
loadHomeCategories();
loadFeaturedProducts();
