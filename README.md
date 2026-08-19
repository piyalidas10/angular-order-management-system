# 📦 Angular 19 — Real-Time Order Management System

> A **production-grade, enterprise-scale** Order Management System built with Angular 19,
> following the strict **Component → Facade → Service** architecture pattern.
> Features real-time WebSocket updates, JWT authentication, role-based access control,
> optimistic UI, and a full Node.js + Socket.IO mock backend.

---

## 🗂 Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Environment Configuration](#environment-configuration)
7. [Authentication & Roles](#authentication--roles)
8. [API Reference](#api-reference)
9. [WebSocket Events](#websocket-events)
10. [State Management](#state-management)
11. [Running Tests](#running-tests)
12. [Production Build](#production-build)
13. [Performance Optimizations](#performance-optimizations)
14. [Contributing](#contributing)

---

## ✨ Features

| Category | Details |
|---|---|
| **Dashboard** | Live KPI cards (total orders, pending, processing, revenue), status distribution bar chart |
| **Order List** | Paginated table with server-side search, multi-status/priority filter, column sorting, live badge |
| **Order Detail** | Full order view, line items, shipping address, status transition menu |
| **Order Form** | Reactive `FormArray` for dynamic line items, full address and customer fields |
| **Real-Time** | WebSocket updates — order status changes pushed to all connected clients instantly |
| **Auth** | JWT login, silent token refresh, role-based route guards |
| **Notifications** | In-app toast bell with unread count badge, auto-dismiss for success/info |
| **Optimistic UI** | Delete and update reflected instantly; reverted on server error |
| **Offline / Retry** | HTTP GET operations retry with exponential backoff (up to 3×) |
| **Error States** | Loading spinners, empty states, inline error banners throughout |

---

## 🛠 Technology Stack

### Frontend
| Package | Version | Role |
|---|---|---|
| `@angular/core` | 19.x | Framework, Signals, Standalone Components |
| `@angular/material` | 19.x | UI component library |
| `@angular/router` | 19.x | Lazy-loaded routes, guards |
| `rxjs` | 7.8.x | HTTP streams, token refresh queuing |
| `typescript` | 5.6.x | Strict mode |
| `scss` | — | Component and global styles |

### Backend (Mock)
| Package | Version | Role |
|---|---|---|
| `express` | 4.x | REST API |
| `socket.io` | 4.x | WebSocket server |
| `jsonwebtoken` | 9.x | JWT sign/verify |
| `uuid` | 9.x | ID generation |
| `cors` | 2.x | Cross-origin headers |

---

## 🏛 Architecture Overview

The application enforces a strict **four-layer architecture**. Data and control flow in one direction only:

```
┌─────────────────────────────────────────────┐
│              UI Component                    │  ← renders, emits events, reads signals
└────────────────────┬────────────────────────┘
                     │  calls methods / reads computed()
┌────────────────────▼────────────────────────┐
│              Facade Layer                    │  ← owns signal<State>, orchestrates
└────────────────────┬────────────────────────┘
                     │  delegates domain logic
┌────────────────────▼────────────────────────┐
│           Business Service Layer             │  ← pure domain: validate, calculate, transform
└────────────────────┬────────────────────────┘
                     │  raw data access
┌────────────────────▼────────────────────────┐
│        API / WebSocket Service Layer         │  ← HTTP calls, WS connect, retry
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│         Node.js + Socket.IO Backend          │
└─────────────────────────────────────────────┘
```

### Layer Rules

#### ✅ Component — _allowed_
- Read signals from the Facade
- Call Facade methods on user events
- Render loading / error / empty states

#### ❌ Component — _forbidden_
- Direct HTTP calls
- Business logic or validation
- Mutating application state directly

#### ✅ Facade — _allowed_
- Hold `signal<FeatureState>()`
- Expose `computed()` slices
- Call Business Service and API Service
- Relay WebSocket events into state
- Implement optimistic updates

#### ✅ Business Service — _allowed_
- Stateless domain functions: `validateOrder()`, `canTransitionTo()`, `applyBulkDiscount()`
- No HTTP, no signals, no Angular lifecycle

#### ✅ API Service — _allowed_
- `HttpClient` calls only
- URL construction, query params
- Response mapping (`map(r => r.data)`)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── app.component.ts          # Root: connects WS on auth change (effect())
│   ├── app.config.ts             # ApplicationConfig — interceptors, router, animations
│   ├── app.routes.ts             # Fully lazy-loaded route tree
│   ├── auth/
│   │   └── login/
│   │       └── login.component.ts
│   ├── dashboard/
│   │   └── dashboard.component.ts
│   ├── shell/
│   │   └── shell.component.ts    # Sidenav + topbar + notification bell
│   └── errors/
│       └── not-found.component.ts
│
├── core/
│   ├── auth/
│   │   └── auth.service.ts       # JWT, refresh scheduler, signal<AuthState>
│   ├── guards/
│   │   └── auth.guard.ts         # authGuard, roleGuard(roles), guestGuard
│   ├── interceptors/
│   │   ├── auth.interceptor.ts   # Bearer header + 401 → refresh → replay
│   │   └── error.interceptor.ts  # Exponential backoff retry
│   └── services/
│       ├── notification.service.ts
│       └── websocket.service.ts  # Connect, heartbeat, reconnect, on/off
│
├── features/
│   └── orders/
│       ├── api/
│       │   └── order-api.service.ts
│       ├── services/
│       │   └── order.service.ts
│       ├── facades/
│       │   └── order.facade.ts
│       ├── components/
│       │   └── order-status-badge/
│       │       └── order-status-badge.component.ts
│       ├── pages/
│       │   ├── order-list/order-list.page.ts
│       │   ├── order-detail/order-detail.page.ts
│       │   └── order-form/order-form.page.ts
│       └── routes.ts
│
├── shared/
│   ├── models/
│   │   ├── order.model.ts
│   │   ├── user.model.ts
│   │   ├── notification.model.ts
│   │   └── api.model.ts
│   └── utilities/
│       ├── helpers.ts
│       └── storage.service.ts
│
├── environments/
│   ├── environment.ts            # Dev: localhost:3000
│   └── environment.prod.ts      # Prod: relative /api
│
├── main.ts
├── index.html
└── styles.scss

backend/
├── server.js                     # Express + Socket.IO mock backend
└── package.json

tests/
├── order.service.spec.ts
├── auth.service.spec.ts
├── order-api.service.spec.ts
└── order.facade.spec.ts
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x |
| Angular CLI | 19.x |

```bash
npm install -g @angular/cli@19
```

### 1 — Install Angular dependencies

```bash
npm install
```

### 2 — Install and start the mock backend

```bash
cd backend
npm install
npm run dev        # nodemon — auto-reloads on changes
```

The backend starts on **http://localhost:3000**.

### 3 — Start the Angular dev server

```bash
# from project root
ng serve
```

Open **http://localhost:4200** in your browser.

### Demo Credentials

| Email | Password | Role | Permissions |
|---|---|---|---|
| `admin@oms.dev` | `password` | `admin` | Full CRUD + delete |
| `manager@oms.dev` | `password` | `manager` | Create + update, no delete |
| `viewer@oms.dev` | `password` | `viewer` | Read-only |

---

## ⚙️ Environment Configuration

### Development (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl:  'ws://localhost:3000',
};
```

### Production (`src/environments/environment.prod.ts`)

```typescript
export const environment = {
  production: true,
  apiUrl: '/api',                              // served by same origin via reverse proxy
  wsUrl: `wss://${window.location.host}`,
};
```

`angular.json` swaps the environment file automatically during `ng build --configuration=production`.

---

## 🔐 Authentication & Roles

### JWT Flow

```
POST /api/auth/login
  → { accessToken (15 min), refreshToken (7 d), expiresIn }

authInterceptor adds:
  Authorization: Bearer <accessToken>

On 401:
  → POST /api/auth/refresh
  → Replay all queued requests with new token

AuthService schedules a timer() to silently refresh 60 s before expiry.
```

### Route Guards

```typescript
// Protect any authenticated route
canActivate: [authGuard]

// Restrict to specific roles
canActivate: [authGuard, roleGuard('admin', 'manager')]

// Redirect logged-in users away from /login
canActivate: [guestGuard]
```

### Checking Roles in Components

```typescript
readonly canDelete = computed(() => this.auth.hasRole('admin'));
```

---

## 📡 API Reference

All endpoints require `Authorization: Bearer <token>` unless noted.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | Login, returns tokens + user |
| `POST` | `/api/auth/refresh` | ❌ | Refresh tokens |
| `POST` | `/api/auth/logout` | ✅ | Invalidate session |
| `GET` | `/api/orders` | ✅ | List orders (paginated, filtered, sorted) |
| `GET` | `/api/orders/:id` | ✅ | Single order detail |
| `POST` | `/api/orders` | `admin\|manager` | Create order |
| `PATCH` | `/api/orders/:id` | `admin\|manager` | Update order |
| `DELETE` | `/api/orders/:id` | `admin` | Delete order |
| `GET` | `/api/dashboard/stats` | ✅ | KPI statistics |

### GET /api/orders — Query Parameters

| Param | Type | Example | Description |
|---|---|---|---|
| `page` | number | `1` | Page number (1-based) |
| `pageSize` | number | `20` | Results per page |
| `search` | string | `ORD-100` | Full-text on order #, customer |
| `status` | csv | `pending,confirmed` | Filter by status |
| `priority` | csv | `high,urgent` | Filter by priority |
| `sortField` | string | `createdAt` | Sort column |
| `sortDir` | `asc\|desc` | `desc` | Sort direction |

---

## 🔌 WebSocket Events

The backend broadcasts all mutation events so every connected client stays in sync.

| Event | Direction | Payload | Trigger |
|---|---|---|---|
| `order:created` | Server → Client | `OrderSummary` | New order POST |
| `order:updated` | Server → Client | `OrderSummary` | PATCH + simulation tick |
| `order:deleted` | Server → Client | `{ id: string }` | DELETE |
| `ping` | Client → Server | `{ timestamp }` | Every 30 s |
| `pong` | Server → Client | `{ timestamp }` | Response to ping |

### Subscribing in the Facade

```typescript
// Returns an unsubscribe function
const unsub = this.ws.on<OrderSummary>('order:updated', summary => {
  this._state.update(s => ({
    ...s,
    orders: s.orders.map(o => o.id === summary.id ? summary : o),
  }));
});

// Clean up in ngOnDestroy
this.wsUnsubscribers.push(unsub);
```

### Connection Status Signal

```typescript
// In any component or facade
readonly connected = computed(() => this.ws.status() === 'connected');
```

---

## 🧠 State Management

The entire feature state is a **single `signal<OrderState>()`** owned by `OrderFacade`.
No NgRx, no BehaviorSubject, no global store.

```typescript
interface OrderState {
  orders: OrderSummary[];
  selectedOrder: Order | null;
  loading: boolean;
  loadingOrder: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  connected: boolean;
  total: number;
  page: number;
  pageSize: number;
  filter: OrderFilter;
  sort: OrderSort;
}
```

### Derived (Computed) Signals Exposed by Facade

```typescript
readonly orders      = computed(() => this._state().orders);
readonly loading     = computed(() => this._state().loading);
readonly totalPages  = computed(() => Math.ceil(this._state().total / this._state().pageSize));
readonly hasOrders   = computed(() => this._state().orders.length > 0);
// … and more
```

### Mutation Pattern

All state changes use a single immutable `.update()` call:

```typescript
this._state.update(s => ({ ...s, loading: true, error: null }));
```

This ensures Angular's signal graph is notified once per logical operation.

---

## 🧪 Running Tests

```bash
# Watch mode (default)
ng test

# Single run with coverage
ng test --no-watch --code-coverage

# Run a specific spec file
ng test --include='**/order.service.spec.ts'
```

### Test Coverage Areas

| Spec File | What is Tested |
|---|---|
| `order.service.spec.ts` | Item totals, bulk discounts, validation rules, status transitions |
| `auth.service.spec.ts` | Login success/failure, role checks, logout, error state |
| `order-api.service.spec.ts` | HTTP GET/POST/DELETE with `HttpTestingController` |
| `order.facade.spec.ts` | Load state, loading flag, optimistic delete revert, filter |

---

## 🏗 Production Build

```bash
# Build with production optimisations
ng build --configuration=production

# Output lands in dist/angular-oms/
# Serve with any static file server or reverse proxy (nginx, Caddy, etc.)
```

### Docker Compose (example)

```yaml
version: '3.9'
services:
  frontend:
    image: nginx:alpine
    volumes:
      - ./dist/angular-oms:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    ports:
      - '80:80'

  backend:
    build: ./backend
    environment:
      - PORT=3000
      - JWT_SECRET=your_production_secret_here
    ports:
      - '3000:3000'
```

### Nginx Configuration (SPA + Proxy)

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Angular SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy API and WebSocket to backend
  location /api/ {
    proxy_pass http://backend:3000/api/;
  }

  location /socket.io/ {
    proxy_pass http://backend:3000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## ⚡ Performance Optimizations

| Technique | Where Applied |
|---|---|
| Route-level lazy loading | All routes via `loadComponent` / `loadChildren` |
| View Transitions API | `withViewTransitions()` in `provideRouter` |
| Signal-based change detection | No zone.js polling — only changed signals re-render |
| `eventCoalescing: true` | Batches multiple zone events into one CD cycle |
| Async animations | `provideAnimationsAsync()` defers animation bundle |
| Granular Material imports | Each component imports only needed Material modules |
| Server-side pagination | No full dataset in memory — `page` + `pageSize` params |
| Optimistic UI | Zero-latency perceived response for mutations |
| `@if` / `@for` blocks | Angular 19 built-in control flow — faster than `*ngIf` |
| Computed memoization | `computed()` values recalculate only when dependencies change |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Follow the architecture rules (Component → Facade → Service)
4. Add/update unit tests for any changed logic
5. Ensure `ng build --configuration=production` passes with no errors
6. Open a Pull Request with a clear description

### Code Style Checklist

- [ ] Strict TypeScript — no `any`, no `!` non-null assertions without justification
- [ ] Standalone components only — no `NgModule`
- [ ] Signals for state — no `BehaviorSubject` for UI state
- [ ] `inject()` function — no constructor parameter injection
- [ ] All HTTP calls live in `*ApiService` classes only
- [ ] All business rules live in `*Service` classes only
- [ ] All state mutations go through the `Facade`

---

## 📄 License

MIT © 2024 Angular OMS Project
