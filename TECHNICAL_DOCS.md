# GarageBasics — Technical Documentation

## 1. Project Overview

GarageBasics is a full-stack e-commerce web application for garage storage and organization products. It is built with a **Node.js/Express REST API** backend and a **vanilla HTML/CSS/JavaScript** frontend. All data is stored **in-memory** (no database) using JavaScript arrays and objects defined in `seed.js`.

---

## 2. Project Structure

```
mmp/
├── backend/
│   ├── server.js               # Express app entry point
│   ├── package.json            # Dependencies & scripts
│   ├── middleware/
│   │   └── auth.js             # JWT middleware (authenticate, requireAdmin)
│   ├── routes/
│   │   ├── auth.js             # /api/auth — register, login, profile
│   │   ├── products.js         # /api/products — full CRUD + filters
│   │   ├── categories.js       # /api/categories — full CRUD
│   │   ├── cart.js             # /api/cart — per-user cart management
│   │   └── orders.js           # /api/orders — place & manage orders
│   └── data/
│       └── seed.js             # In-memory data store (users, products, categories, orders, carts)
└── frontend/
    ├── index.html              # Homepage (hero slider, categories, featured products)
    ├── products.html           # Shop listing with filters & pagination
    ├── product.html            # Single product detail page
    ├── cart.html               # Shopping cart page
    ├── checkout.html           # Checkout & order placement
    ├── orders.html             # User order history
    ├── login.html              # Login & registration
    ├── admin.html              # Admin dashboard (full CRUD)
    ├── css/
    │   ├── style.css           # Global design tokens, layout, utilities
    │   └── components.css      # Reusable UI components (cards, buttons, modals...)
    └── js/
        ├── api.js              # Centralized fetch wrapper for all API calls
        ├── main.js             # Shared: Auth state, Cart badge, Toast, helpers
        ├── home.js             # Homepage: hero slider, categories, featured products
        ├── products.js         # Shop listing: filters, sorting, pagination
        ├── product.js          # Product detail: gallery, tabs, add-to-cart, related
        ├── cart.js             # Cart page: render items, update qty, remove, clear
        ├── checkout.js         # Checkout: form validation, order placement
        └── admin.js            # Admin: full CRUD panels for all entities
```

---

## 3. Backend — Detailed Explanation

### 3.1 `server.js` — Entry Point

```js
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
```

- Runs on **port 5000** by default.
- **CORS** is open to all origins (`*`).
- Serves the **frontend folder as static files**, so opening `http://localhost:5000` directly loads the app.
- **Routes** are mounted under `/api/*`:
  - `/api/auth` → `routes/auth.js`
  - `/api/products` → `routes/products.js`
  - `/api/categories` → `routes/categories.js`
  - `/api/cart` → `routes/cart.js`
  - `/api/orders` → `routes/orders.js`
- A **catch-all** (`app.get('*', ...)`) returns `index.html` for any unknown path (SPA-like behavior).
- A **health check** endpoint: `GET /api/health` returns status OK.

---

### 3.2 `data/seed.js` — In-Memory Data Store

This is the **database substitute**. All data lives here as JavaScript arrays/objects exported as CommonJS modules.

| Export | Type | Description |
|--------|------|-------------|
| `users` | `Array` | User accounts (id, name, email, hashed password, role) |
| `categories` | `Array` | Product categories (id, name, icon, description) |
| `products` | `Array` | All products (22 items across 6 categories) |
| `orders` | `Array` | Placed orders (starts empty) |
| `carts` | `Object` | Per-user cart keyed by `userId` |

**Default Users (seed data):**
| Email | Password | Role |
|-------|----------|------|
| `admin@garagebasics.com` | `admin123` | admin |
| `john@example.com` | `user123` | user |

Passwords are hashed at startup using `bcrypt.hashSync()`.

**Categories (6):**
`cabinets`, `flooring`, `workbenches`, `shelving`, `wall-storage`, `accessories`

**Products (22):** Each product has these fields:
```js
{
  id, sku, name, category, brand,
  price, originalPrice,
  stock, rating, reviews,
  image, images[],
  description,
  specs: { key: value },
  featured: Boolean,
  newArrival: Boolean
}
```

> ⚠️ **Important:** All data resets every time the server restarts because it is in-memory only.

---

### 3.3 `middleware/auth.js` — JWT Authentication

Two middleware functions are exported:

**`authenticate(req, res, next)`**
- Reads the `Authorization: Bearer <token>` header.
- Verifies the JWT using `JWT_SECRET` (`garagebasics_secret_key_2024`).
- On success, attaches decoded payload to `req.user` (contains `id`, `email`, `name`, `role`).
- Returns `401` if no token, `403` if invalid/expired.

**`requireAdmin(req, res, next)`**
- Must be used **after** `authenticate`.
- Checks `req.user.role === 'admin'`.
- Returns `403` if the user is not admin.

**JWT payload structure:**
```js
{ id, email, name, role }   // expires in 7 days
```

---

### 3.4 `routes/auth.js` — Authentication Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns JWT token |
| GET | `/api/auth/me` | User | Get current user profile |
| PUT | `/api/auth/me` | User | Update name, email, or password |
| GET | `/api/auth/users` | Admin | List all users |
| DELETE | `/api/auth/users/:id` | Admin | Delete a user (cannot delete admin) |

**Registration logic:**
1. Validates name, email, password (min 6 chars).
2. Checks for duplicate email.
3. Hashes password with `bcrypt` (salt rounds: 10).
4. Creates user with a `uuidv4()` ID and role `user`.
5. Returns JWT token immediately (auto-login after register).

**Login logic:**
1. Finds user by email (case-insensitive).
2. Compares password with `bcrypt.compare()`.
3. Returns JWT token + user object (no password).

---

### 3.5 `routes/products.js` — Product Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | None | List products with filters, sort, pagination |
| GET | `/api/products/brands` | None | List all distinct brand names |
| GET | `/api/products/:id` | None | Get single product by ID or SKU |
| POST | `/api/products` | Admin | Create new product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |

**`GET /api/products` — Query Parameters:**

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `category` | string | `cabinets` | Filter by category ID |
| `brand` | string | `GarageBasics,RaceDeck` | Comma-separated brands |
| `minPrice` | number | `100` | Minimum price filter |
| `maxPrice` | number | `500` | Maximum price filter |
| `featured` | boolean | `true` | Only featured products |
| `newArrival` | boolean | `true` | Only new arrivals |
| `search` | string | `steel` | Search name, desc, brand, category |
| `sort` | string | `price-asc` | Sort order (see below) |
| `page` | number | `1` | Page number (default: 1) |
| `limit` | number | `12` | Items per page (default: 12) |

**Sort values:** `price-asc`, `price-desc`, `name-asc`, `rating`, `newest`

**Response shape:**
```json
{
  "products": [...],
  "total": 22,
  "page": 1,
  "totalPages": 2,
  "limit": 12
}
```

---

### 3.6 `routes/categories.js` — Category Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | None | List all categories |
| GET | `/api/categories/:id` | None | Get single category |
| POST | `/api/categories` | Admin | Create category (ID auto-generated from name) |
| PUT | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete category |

Category ID is generated from name: `name.toLowerCase().replace(/\s+/g, '-')` (e.g., "Wall Storage" → `wall-storage`).

---

### 3.7 `routes/cart.js` — Cart Routes

All cart routes require authentication. Carts are stored in the `carts` object keyed by `userId`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart` | User | Get user's cart with enriched product info |
| POST | `/api/cart` | User | Add item `{ productId, quantity }` |
| PUT | `/api/cart/:itemId` | User | Update item quantity |
| DELETE | `/api/cart/:itemId` | User | Remove specific item |
| DELETE | `/api/cart` | User | Clear entire cart |

**GET /api/cart response:**
```json
{
  "items": [{ "id", "productId", "quantity", "product": {...} }],
  "subtotal": 1299.99,
  "itemCount": 2
}
```

- Stock validation is performed on add and update.
- Quantity is capped at `product.stock`.

---

### 3.8 `routes/orders.js` — Order Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders` | User/Admin | Users see own orders; admin sees all |
| GET | `/api/orders/:id` | User/Admin | Get single order (user can only see own) |
| POST | `/api/orders` | User | Place order from current cart |
| PUT | `/api/orders/:id` | Admin | Update order status |
| DELETE | `/api/orders/:id` | Admin | Delete an order |

**POST /api/orders — Order Placement flow:**
1. Validates shipping fields (name, address, city are required).
2. Checks cart is not empty.
3. For each cart item: verifies stock → deducts stock → creates product snapshot.
4. Calculates pricing:
   - **Free shipping** if `subtotal >= $500`, otherwise `$49.99`
   - **Tax:** 8% of subtotal
5. Generates order ID: `ORD-${Date.now()}`
6. Clears user's cart.
7. Returns full order object.

**Order statuses:** `pending` → `processing` → `shipped` → `delivered` | `cancelled`

**Order object structure:**
```js
{
  id, userId, userName,
  items: [{ productId, sku, name, image, price, quantity, subtotal }],
  shipping: { name, phone, address, city, state, zip, country },
  payment: { method, last4 },
  subtotal, shippingCost, tax, total,
  status,
  createdAt, updatedAt
}
```

---

## 4. Frontend — Detailed Explanation

### 4.1 `js/api.js` — API Client

A centralized HTTP client exposed as `window.api`.

**Internal `_request()` method:**
- Automatically sets `Content-Type: application/json`.
- Reads JWT from `localStorage.getItem('gb_token')` when `auth=true`.
- Throws an `Error` with the server message on non-OK responses.

**Namespaced methods:**
```js
api.auth.login(body)            // POST /api/auth/login
api.auth.register(body)         // POST /api/auth/register
api.auth.me()                   // GET  /api/auth/me
api.products.getAll(params)     // GET  /api/products?...
api.products.getById(id)        // GET  /api/products/:id
api.products.brands()           // GET  /api/products/brands
api.categories.getAll()         // GET  /api/categories
api.cart.get()                  // GET  /api/cart
api.cart.add(body)              // POST /api/cart
api.cart.update(itemId, body)   // PUT  /api/cart/:itemId
api.cart.remove(itemId)         // DELETE /api/cart/:itemId
api.orders.create(body)         // POST /api/orders
api.orders.getAll()             // GET  /api/orders
```

---

### 4.2 `js/main.js` — Shared Utilities

Loaded on every page. Exports to `window`:

**`Auth` object:**
| Method | Description |
|--------|-------------|
| `Auth.getToken()` | Returns JWT from `localStorage` |
| `Auth.getUser()` | Returns parsed user object from `localStorage` |
| `Auth.isLoggedIn()` | Returns `true` if token exists |
| `Auth.isAdmin()` | Returns `true` if user role is `admin` |
| `Auth.save(token, user)` | Stores token + user, updates header UI |
| `Auth.logout()` | Clears storage, redirects to homepage after 800ms |
| `Auth.updateUI()` | Shows/hides header login/user/admin buttons |

**`Toast` object:**
```js
Toast.show('Message', 'success' | 'error' | 'info' | 'warning', duration=3500)
```
Dynamically creates toast notifications appended to `#toast-container`.

**`Cart` object:**
- `Cart.updateBadge(count)` — Updates all `.cart-badge` elements.
- `Cart.syncCount()` — Fetches cart from API and updates badge.

**Global helpers:**
- `renderProductCard(product)` — Returns full product card HTML string.
- `renderStars(rating)` — Returns star span HTML.
- `renderPrice(price, originalPrice)` — Returns price block with discount badge.
- `formatPrice(n)` — Returns `$X.XX` formatted string.
- `addToCart(productId, qty)` — Calls API, shows toast, syncs badge. Redirects to login if not authenticated.

**Global event delegation:**
```js
document.addEventListener('click', e => {
  const btn = e.target.closest('.add-to-cart-btn');
  if (btn) addToCart(btn.dataset.id);
});
```

---

### 4.3 `js/home.js` — Homepage Logic

- **Hero Slider:** Auto-advances every 5 seconds. Previous/next buttons and dot navigation. CSS classes `active`/`prev` control transitions.
- **`loadHomeCategories()`:** Fetches all categories from API, renders clickable tiles with images mapped by category ID.
- **`loadFeaturedProducts()`:** Fetches products with `featured=true&limit=4`, renders product cards using `renderProductCard()`. Shows skeleton loaders while loading.
- **Newsletter form:** Simulated subscription (shows success toast, no real backend call).

---

### 4.4 `js/products.js` — Shop Listing

Manages a `state` object:
```js
const state = { page, limit, category, brands[], minPrice, maxPrice, sort, search, total, totalPages }
```

**On load:**
1. Reads URL params (`?category=`, `?search=`, `?sort=`).
2. Calls `loadFilterOptions()` — fetches categories + brands, builds filter checkboxes.
3. Calls `loadProducts()` — fetches paginated products, renders cards.

**Filtering:** All filters update `state`, reset `page=1`, call `loadProducts()`.

**Sorting options:** Price Low→High, Price High→Low, Name A→Z, Top Rated, Newest.

**Pagination:** `renderPagination()` generates numbered page buttons with ellipsis for large ranges.

---

### 4.5 `js/product.js` — Product Detail

1. Reads `?id=` from URL, calls `api.products.getById(id)`.
2. Renders: image gallery (main + thumbnails), name, brand, SKU, rating stars, price with discount, stock indicator, description, specs table.
3. **Stock states:** "In Stock (N available)" | "Low Stock — only N left!" | "Out of Stock" (disables button).
4. **Tabs:** Details / Specifications / Reviews — CSS class toggling.
5. **Related products:** Loads same category, excludes current product.

---

### 4.6 `js/cart.js` — Cart Page

- Checks `Auth.isLoggedIn()` — shows a lock screen if not authenticated.
- Renders all cart items with quantity controls (+/- buttons and number input).
- **`updateSummary(subtotal)`** — Calculates shipping ($0 if ≥$500, else $49.99), tax (8%), total.
- **`updateQty(itemId, qty)`** — If qty < 1, removes item. Otherwise calls API update.
- **`removeItem(itemId)`** — Fades item, calls API delete, reloads cart.
- **`clearCart()`** — Confirms with user, calls `api.cart.clear()`.

---

### 4.7 `js/checkout.js` — Checkout Page

1. Redirects to `cart.html` if cart is empty.
2. Pre-fills shipping name and card name from logged-in user.
3. **Input formatters:**
   - Card number: formats as `XXXX XXXX XXXX XXXX`
   - Expiry: formats as `MM/YY`
4. **`placeOrder()`:**
   - Validates all required fields (highlights error, focuses first invalid field).
   - Collects shipping info and payment `last4` digits.
   - Calls `api.orders.create({ shipping, payment })`.
   - On success: shows a success modal with the order ID.

---

### 4.8 `js/admin.js` — Admin Dashboard

**Access guard:** Redirects to login if user is not admin.

**Panels:** Dashboard | Products | Categories | Orders | Users

**Dashboard panel:**
- Parallel API calls: products, orders, users.
- Shows 4 stat cards: Total Products, Total Orders, Total Revenue, Total Users.
- Table of the 8 most recent orders.

**Products panel:**
- Lists all products in a table with image, SKU, category badge, price, stock (color-coded: green >10, yellow >0, red =0).
- **Add/Edit** via modal form with all product fields.
- **Delete** with confirmation modal.

**Categories panel:**
- CRUD for categories (name, icon emoji, description).

**Orders panel:**
- Inline status dropdown — changes status in real-time via `PUT /api/orders/:id`.
- Delete with confirmation.

**Users panel:**
- Lists all users with role badges.
- Admin user is protected (cannot be deleted).

---

## 5. Authentication Flow

```
1. User submits login form
2. POST /api/auth/login → server returns { token, user }
3. Frontend: Auth.save(token, user) → stores in localStorage
4. All subsequent API calls include: Authorization: Bearer <token>
5. Server middleware decodes token → attaches req.user
6. Logout: localStorage cleared → redirect to homepage
```

**Token storage keys:**
- `gb_token` — JWT string
- `gb_user` — JSON stringified user object

---

## 6. Pricing & Order Calculation

| Component | Formula |
|-----------|---------|
| Subtotal | Sum of (price × quantity) for all items |
| Shipping | `$0.00` if subtotal ≥ $500, else `$49.99` |
| Tax | `subtotal × 0.08` (8%) |
| **Total** | `subtotal + shipping + tax` |

This logic is duplicated on both frontend (cart/checkout display) and backend (order creation) for consistency.

---

## 7. Dependencies

### Backend (`package.json`)
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.2 | HTTP server & routing |
| `cors` | ^2.8.5 | Cross-origin request headers |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `jsonwebtoken` | ^9.0.2 | JWT creation & verification |
| `uuid` | ^9.0.0 | Generate unique IDs (`uuidv4()`) |
| `nodemon` | ^3.0.2 | Dev: auto-restart on file change |

### Frontend
No npm packages. Pure vanilla HTML, CSS, and JavaScript.
External resources loaded via CDN/URL:
- **Google Fonts** (Inter) — typography
- **Unsplash** — product images

---

## 8. How to Run

```bash
# Start the backend server
cd backend
npm install
node server.js        # production
# or
npm run dev           # development (nodemon)
```

Then open: **http://localhost:5000**

The frontend is served as static files by Express — no separate frontend server needed.

---

## 9. API Quick Reference

### Base URL
```
http://localhost:5000/api
```

### Auth Endpoints
```
POST   /auth/register          # { name, email, password }
POST   /auth/login             # { email, password }
GET    /auth/me                # (requires token)
PUT    /auth/me                # (requires token) { name?, email?, password? }
GET    /auth/users             # (admin only)
DELETE /auth/users/:id         # (admin only)
```

### Product Endpoints
```
GET    /products               # ?category=&brand=&minPrice=&maxPrice=&sort=&search=&page=&limit=
GET    /products/brands        # returns array of brand strings
GET    /products/:id           # by ID or SKU
POST   /products               # (admin) create product
PUT    /products/:id           # (admin) update product
DELETE /products/:id           # (admin) delete product
```

### Category Endpoints
```
GET    /categories             # list all
GET    /categories/:id         # single category
POST   /categories             # (admin) { name, icon, description }
PUT    /categories/:id         # (admin)
DELETE /categories/:id         # (admin)
```

### Cart Endpoints
```
GET    /cart                   # user's cart with enriched products
POST   /cart                   # { productId, quantity }
PUT    /cart/:itemId           # { quantity }
DELETE /cart/:itemId           # remove item
DELETE /cart                   # clear cart
```

### Order Endpoints
```
GET    /orders                 # user sees own; admin sees all
GET    /orders/:id
POST   /orders                 # { shipping: {...}, payment: { method, last4 } }
PUT    /orders/:id             # (admin) { status }
DELETE /orders/:id             # (admin)
```

---

## 10. Important Notes & Limitations

> ⚠️ **In-Memory Storage:** All data (users, products, orders, carts) is lost on server restart. There is no database connected.

> ⚠️ **No Real Payments:** The checkout collects card fields for UI demonstration only. No payment processor is integrated.

> ⚠️ **JWT Secret:** The secret `garagebasics_secret_key_2024` is hardcoded. In production, use an environment variable.

> ⚠️ **CORS:** Set to `*` (all origins). In production, restrict to your domain.

> ⚠️ **Image URLs:** Product images use Unsplash URLs. They require an internet connection to display.
