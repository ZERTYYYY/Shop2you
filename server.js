const express = require('express');
const session = require('express-session');
const path = require('path');
const { users, products } = require('./data/mockData');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'shop2you-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware auth
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};
const requireRole = (role) => (req, res, next) => {
  if (!req.session.user || req.session.user.role !== role) return res.redirect('/login');
  next();
};

// ─── AUTH ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(`/${req.session.user.role}/dashboard`);
  res.render('auth/login', { error: null });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.render('auth/login', { error: 'Email ou mot de passe incorrect.' });
  req.session.user = user;
  res.redirect(`/${user.role}/dashboard`);
});

app.get('/signup', (req, res) => res.render('auth/signup', { error: null }));

app.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;
  if (users.find(u => u.email === email)) return res.render('auth/signup', { error: 'Cet email est déjà utilisé.' });
  const newUser = { id: users.length + 1, role: role || 'user', email, password, name, phone: '', city: '', address: '', avatar: null, orders: [], cards: [], addresses: [] };
  users.push(newUser);
  req.session.user = newUser;
  res.redirect(`/${newUser.role}/dashboard`);
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ─── USER ────────────────────────────────────────────────────────────
app.get('/user/dashboard', requireRole('user'), (req, res) => {
  res.render('user/dashboard', { user: req.session.user, products, cart: req.session.cart || [] });
});

app.get('/user/profile', requireRole('user'), (req, res) => {
  res.render('user/profile', { user: req.session.user });
});

app.get('/user/orders', requireRole('user'), (req, res) => {
  res.render('user/orders', { user: req.session.user });
});

app.get('/user/checkout', requireRole('user'), (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  res.render('user/checkout', { user: req.session.user, cart, total: total.toFixed(2) });
});

app.post('/user/cart/add', requireRole('user'), (req, res) => {
  const { productId } = req.body;
  const product = products.find(p => p.id == productId);
  if (!product) return res.json({ success: false });
  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(i => i.id == productId);
  if (existing) existing.qty++;
  else req.session.cart.push({ ...product, qty: 1 });
  res.json({ success: true, cartCount: req.session.cart.reduce((s, i) => s + i.qty, 0) });
});

app.post('/user/cart/remove', requireRole('user'), (req, res) => {
  const { productId } = req.body;
  req.session.cart = (req.session.cart || []).filter(i => i.id != productId);
  res.json({ success: true });
});

app.post('/user/checkout/confirm', requireRole('user'), (req, res) => {
  const orderId = '#' + Math.random().toString(36).substr(2, 8).toUpperCase();
  req.session.cart = [];
  req.session.lastOrder = orderId;
  res.redirect('/user/checkout/done');
});

app.get('/user/checkout/done', requireRole('user'), (req, res) => {
  res.render('user/checkout-done', { user: req.session.user, orderId: req.session.lastOrder || '#UNKNOWN' });
});

// ─── DELIVERY ────────────────────────────────────────────────────────
app.get('/delivery/dashboard', requireRole('delivery'), (req, res) => {
  res.render('delivery/dashboard', { user: req.session.user });
});

app.get('/delivery/profile', requireRole('delivery'), (req, res) => {
  res.render('delivery/profile', { user: req.session.user });
});

app.get('/delivery/history', requireRole('delivery'), (req, res) => {
  res.render('delivery/history', { user: req.session.user });
});

app.get('/delivery/vehicle', requireRole('delivery'), (req, res) => {
  res.render('delivery/vehicle', { user: req.session.user });
});

// ─── PROVIDER ────────────────────────────────────────────────────────
app.get('/provider/dashboard', requireRole('provider'), (req, res) => {
  res.render('provider/dashboard', { user: req.session.user });
});

app.get('/provider/profile', requireRole('provider'), (req, res) => {
  res.render('provider/profile', { user: req.session.user });
});

app.get('/provider/invoices', requireRole('provider'), (req, res) => {
  res.render('provider/invoices', { user: req.session.user });
});

app.listen(PORT, () => {
  console.log(`✅ Shop2You lancé sur http://localhost:${PORT}`);
  console.log(`   👤 User     : user@shop2you.com / 123456`);
  console.log(`   🚗 Livreur  : livreur@shop2you.com / 123456`);
  console.log(`   🏪 Vendeur  : vendeur@shop2you.com / 123456`);
});
