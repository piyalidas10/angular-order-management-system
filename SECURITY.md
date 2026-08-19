# 🔒 Security Policy

> Security guidelines, threat model, implemented controls, and vulnerability
> reporting procedures for the Angular 19 Order Management System.

---

## 📋 Table of Contents

1. [Supported Versions](#supported-versions)
2. [Reporting a Vulnerability](#reporting-a-vulnerability)
3. [Threat Model](#threat-model)
4. [Implemented Security Controls](#implemented-security-controls)
5. [Authentication & Token Security](#authentication--token-security)
6. [Authorization & RBAC](#authorization--rbac)
7. [Frontend Security](#frontend-security)
8. [Backend Security](#backend-security)
9. [Data Security](#data-security)
10. [WebSocket Security](#websocket-security)
11. [Production Hardening Checklist](#production-hardening-checklist)
12. [Dependency Management](#dependency-management)
13. [Security Headers](#security-headers)

---

## 📌 Supported Versions

| Version | Supported |
|---|---|
| 1.x (current) | ✅ Active security fixes |
| 0.x (pre-release) | ❌ No longer supported |

---

## 🚨 Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

### Responsible Disclosure Process

1. Email **security@your-org.com** with subject: `[OMS Security] <brief description>`
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - (Optional) Suggested fix or mitigation
3. You will receive an acknowledgment within **48 hours**
4. We target a fix within **14 days** for critical issues, **30 days** for others
5. You will be credited in the security advisory (unless you prefer to remain anonymous)

### What Qualifies

| Category | Examples |
|---|---|
| **Authentication bypass** | Token forging, session fixation |
| **Authorization flaws** | Privilege escalation, IDOR |
| **Injection** | XSS, prototype pollution in stored data |
| **Sensitive data exposure** | Tokens in logs, localStorage misuse |
| **Dependency vulnerabilities** | CVEs in `npm` packages with exploit path |

---

## 🗺 Threat Model

### Assets

| Asset | Sensitivity | Where Stored |
|---|---|---|
| JWT access token | High | `localStorage` (prefix `oms_`) |
| JWT refresh token | Critical | `localStorage` (prefix `oms_`) |
| User PII (email, name) | Medium | `localStorage`, in-memory signal |
| Order data | Medium | In-memory signal, never persisted client-side |
| `JWT_SECRET` | Critical | Backend environment variable only |

### Attack Surface

```
Internet
   │
   ▼
┌──────────────────────────────────────┐
│  Browser (Angular SPA)               │
│  ├─ localStorage  (tokens/user)      │ ← XSS target
│  ├─ In-memory signals (order state)  │ ← cleared on tab close
│  └─ HTTP/WS to backend              │
└──────────────────┬───────────────────┘
                   │ HTTPS / WSS
                   ▼
┌──────────────────────────────────────┐
│  Node.js Backend (Express)           │
│  ├─ REST API (/api/*)                │ ← auth + role checks
│  ├─ Socket.IO WebSocket              │ ← token-gated
│  └─ JWT_SECRET (env var)            │ ← never exposed
└──────────────────────────────────────┘
```

### Identified Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| XSS → token theft from `localStorage` | Medium | Critical | CSP header; Angular template sanitization; HttpOnly cookie migration path |
| CSRF | Low | High | JWT in `Authorization` header (not cookie) — CSRF immune by design |
| JWT secret exposure | Low | Critical | Env var only; never hardcoded; rotate via secret manager |
| Privilege escalation | Low | High | Role enforced both client (guard) and server (middleware) |
| Token reuse after logout | Medium | Medium | Refresh token blacklist (add Redis in production) |
| Man-in-the-middle | Low | Critical | HTTPS/WSS mandatory in production; HSTS header |

---

## 🔐 Implemented Security Controls

### Overview

| Control | Implementation | File |
|---|---|---|
| JWT Authentication | `AuthService`, `authInterceptor` | `core/auth/`, `core/interceptors/` |
| Automatic Token Refresh | `AuthService.scheduleRefresh()` | `core/auth/auth.service.ts` |
| Route Guards | `authGuard`, `roleGuard`, `guestGuard` | `core/guards/auth.guard.ts` |
| HTTP 401 Recovery | Token refresh + request replay queue | `core/interceptors/auth.interceptor.ts` |
| Role Enforcement | Backend middleware + frontend guard | `backend/server.js`, `auth.guard.ts` |
| Angular Template Sanitization | Built-in — all interpolated values escaped | Angular DI |
| No Sensitive Data in URLs | All filters/search use query params, not path | `order-api.service.ts` |
| Secure Storage Prefix | `oms_` namespace isolation | `storage.service.ts` |

---

## 🔑 Authentication & Token Security

### Access Token

- **Algorithm:** HS256 (upgrade to RS256 in production with key rotation)
- **Expiry:** 15 minutes
- **Storage:** `localStorage` under `oms_tokens`
- **Transport:** `Authorization: Bearer <token>` header — never in URL
- **Refresh:** Automatic via `timer()` scheduled 60 s before expiry

### Refresh Token

- **Expiry:** 7 days
- **Storage:** `localStorage` under `oms_tokens` (alongside access token)
- **Usage:** `POST /api/auth/refresh` — returns new pair
- **⚠️ Production Recommendation:** Migrate to `HttpOnly` cookie for refresh token to eliminate XSS theft vector

### Token Lifecycle

```
Login
  │
  ├─ Store { accessToken, refreshToken } in localStorage
  │
  ├─ Schedule timer(expiresIn - 60s) → auto-refresh
  │
  ├─ On 401 response:
  │    └─ authInterceptor queues request, calls /auth/refresh
  │         ├─ Success → replay all queued requests with new token
  │         └─ Failure → logout() + redirect to /auth/login
  │
  └─ On logout():
       ├─ POST /api/auth/logout (server-side invalidation)
       └─ localStorage.removeItem for tokens + user
```

### ⚠️ Production Token Hardening

For production, replace `localStorage` with an **HttpOnly cookie** for the refresh token:

```
Set-Cookie: oms_refresh=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh
```

This prevents any JavaScript (including XSS injections) from reading the refresh token.
The access token can remain in memory (not `localStorage`) using a `BehaviorSubject` or signal.

---

## 🛡 Authorization & RBAC

### Role Definitions

| Role | Create Order | Update Order | Delete Order | View Orders | View Dashboard |
|---|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `manager` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `viewer` | ❌ | ❌ | ❌ | ✅ | ✅ |

### Frontend Enforcement (Guards)

```typescript
// Blocks access before the component even loads
canActivate: [authGuard, roleGuard('admin', 'manager')]
```

**Important:** Frontend guards are a UX convenience — they are **not** a security boundary.
All authorization decisions are re-enforced on the backend.

### Backend Enforcement (Middleware)

```javascript
// server.js — role check on every mutating endpoint
if (!['admin', 'manager'].includes(req.user.role)) {
  return res.status(403).json({ success: false, message: 'Forbidden' });
}
```

Even if a client bypasses the frontend guard, the server rejects unauthorized requests with `403 Forbidden`.

### IDOR Prevention

All order operations on the backend use the `id` from the URL param, and future implementations should verify that the requesting user has access to that specific resource (e.g., tenant/org scoping):

```javascript
// Production pattern to add:
const order = await Order.findOne({ id: req.params.id, orgId: req.user.orgId });
if (!order) return res.status(404).json({ message: 'Not found' }); // don't reveal existence
```

---

## 🌐 Frontend Security

### Angular Template Sanitization

Angular automatically escapes all interpolated values (`{{ }}`), preventing reflected XSS.

```html
<!-- Safe — Angular escapes this -->
<p>{{ order.customerName }}</p>

<!-- NEVER do this — bypasses sanitization -->
<p [innerHTML]="order.notes"></p>
```

If you must render rich text, use Angular's `DomSanitizer` with `bypassSecurityTrustHtml()` **only** for content that has been sanitized server-side and is explicitly trusted.

### Content Security Policy

Add the following `meta` tag (or HTTP header — header preferred) to restrict script execution:

```html
<!-- src/index.html -->
<meta http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' ws://localhost:3000 wss://your-production-domain.com;
    img-src 'self' data:;
    frame-ancestors 'none';
  "
/>
```

### No Sensitive Data in Console

Ensure no `console.log` calls print tokens or PII in production code:

```bash
# Check for accidental token logging before committing
grep -r "console.log" src/ | grep -i "token\|password\|secret"
```

### Route Access Control

Every protected route uses `canActivate: [authGuard]` or `canActivate: [authGuard, roleGuard(...)]`.
The `guestGuard` on `/auth/login` prevents authenticated users from seeing the login form.

---

## 🖥 Backend Security

### JWT Secret Management

```bash
# NEVER hardcode in source code
# Set via environment variable
JWT_SECRET=<cryptographically-random-256-bit-value>

# Generate a strong secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**In production:** Store in a secret manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager) and inject at runtime.

### Input Validation

The mock backend performs basic validation. In production, add a validation library:

```bash
npm install zod   # or joi, class-validator
```

```javascript
// Example Zod schema for createOrder
const createOrderSchema = z.object({
  customerId: z.string().min(1),
  customerEmail: z.string().email(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});
```

### Rate Limiting

Add `express-rate-limit` to prevent brute-force attacks:

```javascript
const rateLimit = require('express-rate-limit');

// Auth endpoints: 10 attempts per 15 minutes
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// General API: 200 requests per minute
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200 }));
```

### Helmet — Security Headers

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
// Sets: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security,
//       X-XSS-Protection, Referrer-Policy, and more
```

### CORS Configuration

```javascript
// ❌ Development only — do NOT use in production
app.use(cors());

// ✅ Production: whitelist specific origins
app.use(cors({
  origin: ['https://oms.your-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
```

---

## 🔌 WebSocket Security

### Token Authentication

The client sends the JWT as a URL query parameter on the WebSocket upgrade:

```
ws://localhost:3000?token=<accessToken>
```

**Production improvement:** Pass the token via the Socket.IO `auth` option instead of the URL (URLs appear in server logs):

```typescript
// WebSocketService
const socket = io(environment.wsUrl, {
  auth: { token: this.authService.getAccessToken() },
});
```

```javascript
// Backend
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});
```

### Message Validation

Always validate incoming WebSocket message payloads server-side before broadcasting:

```javascript
socket.on('order:update-request', (data) => {
  if (!data?.id || typeof data.id !== 'string') return; // reject malformed
  // ... process
});
```

---

## ✅ Production Hardening Checklist

### Before Go-Live

#### Infrastructure
- [ ] HTTPS enforced everywhere — no HTTP in production
- [ ] WebSocket uses `wss://` (TLS)
- [ ] `JWT_SECRET` stored in secret manager, not `.env` file in repo
- [ ] `JWT_SECRET` is ≥ 256 bits (32 random bytes)
- [ ] Backend behind a reverse proxy (nginx / Caddy) with TLS termination

#### Backend
- [ ] `helmet()` middleware installed and configured
- [ ] CORS restricted to production domain(s) only
- [ ] Rate limiting on auth endpoints (`express-rate-limit`)
- [ ] Request body size limit (`express.json({ limit: '10kb' })`)
- [ ] Refresh token blacklist implemented (Redis recommended)
- [ ] Input validation on all POST/PATCH endpoints (Zod / Joi)
- [ ] Error responses never expose stack traces or internal paths

#### Frontend
- [ ] `Content-Security-Policy` header configured
- [ ] `X-Frame-Options: DENY` set (via HTTP header or Helmet)
- [ ] No `console.log` calls with sensitive data in production build
- [ ] No secrets, API keys, or credentials committed to source control
- [ ] Angular production build enabled (`ng build --configuration=production`)
- [ ] `environment.prod.ts` uses relative `/api` URL, not `localhost`

#### Authentication
- [ ] Refresh token migrated to `HttpOnly; Secure; SameSite=Strict` cookie
- [ ] Access token stored in memory signal (not `localStorage`) in production
- [ ] Token expiry validated on every protected API call server-side
- [ ] Logout endpoint invalidates refresh token server-side

#### Monitoring
- [ ] Failed login attempts logged and alerted
- [ ] Unusual WebSocket connection patterns monitored
- [ ] Error rates monitored (Sentry, Datadog, etc.)

---

## 📦 Dependency Management

### Audit Regularly

```bash
# Check for known vulnerabilities
npm audit

# Auto-fix non-breaking vulnerabilities
npm audit fix

# Review outdated packages
npm outdated
```

### Keeping Dependencies Current

```bash
# Update Angular safely
ng update

# Update all packages within semver range
npm update

# Review major updates (may include breaking changes)
npx npm-check-updates -u
npm install
ng test && ng build --configuration=production
```

### Policy

- **Critical** CVEs: patch within 24 hours
- **High** CVEs: patch within 7 days
- **Medium/Low** CVEs: address in next scheduled release

---

## 🔗 Security Headers Reference

Configure these headers on your reverse proxy (nginx / Caddy) or via `helmet`:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Cache-Control: no-store                          # on /api/* responses
```

Verify your headers with [https://securityheaders.com](https://securityheaders.com) after deployment.
