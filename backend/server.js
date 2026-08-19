// backend/server.js — Node.js + Socket.IO Mock Backend
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'oms_dev_secret_change_in_production';
const PORT = process.env.PORT || 3000;

// ─── In-Memory Data Store ─────────────────────────────────────────────────────
const USERS = [
  { id: 'u1', email: 'admin@oms.dev',   password: 'password', firstName: 'Alice', lastName: 'Admin',   role: 'admin'   },
  { id: 'u2', email: 'manager@oms.dev', password: 'password', firstName: 'Bob',   lastName: 'Manager', role: 'manager' },
  { id: 'u3', email: 'viewer@oms.dev',  password: 'password', firstName: 'Carol', lastName: 'Viewer',  role: 'viewer'  },
];

const STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled'];

function makeOrder(idx) {
  const status = STATUSES[Math.floor(Math.random() * 5)];
  const items = Array.from({ length: Math.ceil(Math.random() * 4) }, (_, i) => {
    const qty = Math.ceil(Math.random() * 10);
    const price = +(Math.random() * 200 + 10).toFixed(2);
    const discount = [0, 5, 10][Math.floor(Math.random() * 3)];
    const total = +(qty * price * (1 - discount / 100)).toFixed(2);
    return { id: uuidv4(), productId: `P${1000+i}`, productName: `Product ${1000+i}`, sku: `SKU-${1000+i}`, qty, unitPrice: price, discount, total };
  });
  const subtotal = +items.reduce((s, i) => s + i.total, 0).toFixed(2);
  const tax = +(subtotal * 0.1).toFixed(2);
  const shipping = subtotal > 500 ? 0 : +(subtotal * 0.05).toFixed(2);
  const total = +(subtotal + tax + shipping).toFixed(2);
  const priorities = ['low','normal','normal','high','urgent'];
  const createdAt = new Date(Date.now() - Math.random() * 30 * 86400000).toISOString();
  return {
    id: uuidv4(),
    orderNumber: `ORD-${(10000 + idx).toString()}`,
    customerId: `C${100 + (idx % 20)}`,
    customerName: `Customer ${100 + (idx % 20)}`,
    customerEmail: `customer${100 + (idx % 20)}@example.com`,
    status,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    items,
    subtotal,
    tax,
    shipping,
    discount: 0,
    total,
    shippingAddress: { street: `${idx * 10} Main St`, city: 'Springfield', state: 'IL', zip: '62701', country: 'US' },
    notes: idx % 5 === 0 ? 'Handle with care.' : '',
    createdAt,
    updatedAt: createdAt,
    estimatedDelivery: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
}

let orders = Array.from({ length: 80 }, (_, i) => makeOrder(i + 1));

// ─── JWT Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token expired' });
  }
}

function ok(res, data, message = 'OK') {
  res.json({ success: true, data, message });
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const { password: _, ...safeUser } = user;
  const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
  ok(res, { user: safeUser, tokens: { accessToken, refreshToken, expiresIn: 900 } });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const user = USERS.find(u => u.id === payload.sub);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const newRefresh = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
    ok(res, { accessToken, refreshToken: newRefresh, expiresIn: 900 });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

// ─── Orders Routes ────────────────────────────────────────────────────────────
app.get('/api/orders', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 20, search, status, priority, sortField = 'createdAt', sortDir = 'desc' } = req.query;

  let filtered = [...orders];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(o =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
    );
  }

  if (status) {
    const statuses = status.split(',');
    filtered = filtered.filter(o => statuses.includes(o.status));
  }

  if (priority) {
    const priorities = priority.split(',');
    filtered = filtered.filter(o => priorities.includes(o.priority));
  }

  filtered.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (a[sortField] < b[sortField]) return -dir;
    if (a[sortField] > b[sortField]) return dir;
    return 0;
  });

  const total = filtered.length;
  const p = parseInt(page);
  const ps = parseInt(pageSize);
  const data = filtered.slice((p - 1) * ps, p * ps).map(o => ({
    id: o.id, orderNumber: o.orderNumber, customerName: o.customerName,
    status: o.status, priority: o.priority, total: o.total,
    itemCount: o.items.length, createdAt: o.createdAt, updatedAt: o.updatedAt,
  }));

  ok(res, { data, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) });
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  ok(res, order);
});

app.post('/api/orders', authMiddleware, (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  const newOrder = {
    ...req.body,
    id: uuidv4(),
    orderNumber: `ORD-${(10000 + orders.length + 1).toString()}`,
    status: 'pending',
    subtotal: 0, tax: 0, shipping: 0, discount: 0, total: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.unshift(newOrder);

  // Broadcast via WebSocket
  io.emit('order:created', {
    id: newOrder.id, orderNumber: newOrder.orderNumber, customerName: newOrder.customerName,
    status: newOrder.status, priority: newOrder.priority, total: newOrder.total,
    itemCount: newOrder.items?.length ?? 0, createdAt: newOrder.createdAt, updatedAt: newOrder.updatedAt,
  });

  ok(res, newOrder, 'Order created');
});

app.patch('/api/orders/:id', authMiddleware, (req, res) => {
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });

  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  orders[idx] = { ...orders[idx], ...req.body, updatedAt: new Date().toISOString() };
  const updated = orders[idx];

  // Broadcast via WebSocket
  const summary = {
    id: updated.id, orderNumber: updated.orderNumber, customerName: updated.customerName,
    status: updated.status, priority: updated.priority, total: updated.total,
    itemCount: updated.items?.length ?? 0, createdAt: updated.createdAt, updatedAt: updated.updatedAt,
  };
  io.emit('order:updated', summary);

  ok(res, updated, 'Order updated');
});

app.delete('/api/orders/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });

  orders.splice(idx, 1);
  io.emit('order:deleted', { id: req.params.id });
  res.status(204).send();
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const statusCounts = {};
  STATUSES.forEach(s => { statusCounts[s] = orders.filter(o => o.status === s).length; });
  const revenue = +orders.reduce((s, o) => s + o.total, 0).toFixed(2);
  const deliveredToday = orders.filter(o => o.status === 'delivered' && o.updatedAt?.startsWith(today)).length;

  ok(res, {
    totalOrders: orders.length,
    pendingOrders: statusCounts['pending'] ?? 0,
    processingOrders: statusCounts['processing'] ?? 0,
    deliveredToday,
    revenue,
    revenueGrowth: 12.4,
    avgOrderValue: orders.length ? +(revenue / orders.length).toFixed(2) : 0,
    ordersByStatus: statusCounts,
    revenueByDay: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      revenue: +(Math.random() * 10000 + 2000).toFixed(2),
    })).reverse(),
  });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[WS] Client connected: ${socket.id}`);

  socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));
  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

// ─── Simulate live order updates every 15 s ───────────────────────────────────
setInterval(() => {
  if (orders.length === 0) return;
  const order = orders[Math.floor(Math.random() * Math.min(orders.length, 20))];
  const statusFlow = { pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered' };
  const nextStatus = statusFlow[order.status];
  if (!nextStatus) return;

  order.status = nextStatus;
  order.updatedAt = new Date().toISOString();

  const summary = {
    id: order.id, orderNumber: order.orderNumber, customerName: order.customerName,
    status: order.status, priority: order.priority, total: order.total,
    itemCount: order.items?.length ?? 0, createdAt: order.createdAt, updatedAt: order.updatedAt,
  };
  io.emit('order:updated', summary);
  console.log(`[Sim] Order ${order.orderNumber} → ${nextStatus}`);
}, 15000);

server.listen(PORT, () => console.log(`OMS Backend running on http://localhost:${PORT}`));
