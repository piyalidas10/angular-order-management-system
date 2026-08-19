# 🔄 Project Workflow Guide

> End-to-end developer workflow for the Angular 19 Order Management System.
> Covers local setup, development cycles, branching strategy, testing, code review,
> and deployment pipelines.

---

## 📋 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Daily Development Cycle](#daily-development-cycle)
3. [Adding a New Feature](#adding-a-new-feature)
4. [Data Flow Walkthrough](#data-flow-walkthrough)
5. [Branching Strategy](#branching-strategy)
6. [Commit Conventions](#commit-conventions)
7. [Code Review Checklist](#code-review-checklist)
8. [Testing Workflow](#testing-workflow)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Deployment Workflow](#deployment-workflow)
11. [Debugging Guide](#debugging-guide)
12. [Common Tasks Reference](#common-tasks-reference)

---

## 🖥 Local Development Setup

### First-Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/angular-oms.git
cd angular-oms

# 2. Install Angular frontend dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Verify Angular CLI version (must be 19.x)
ng version
```

### Start All Services

Open **two terminals**:

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
# ✅ OMS Backend running on http://localhost:3000
# ✅ Socket.IO ready
# ✅ 80 seed orders loaded
```

**Terminal 2 — Frontend**
```bash
ng serve
# ✅ Application bundle generation complete
# ✅ http://localhost:4200
```

### Verify Everything Works

1. Open **http://localhost:4200**
2. Log in with `admin@oms.dev / password`
3. Navigate to **Orders** — table should populate
4. Watch the **● Live** badge in the toolbar
5. After ~15 seconds an order in the list should auto-update status (WebSocket simulation)

---

## 🔁 Daily Development Cycle

```
┌─────────────────────────────────────────────────────┐
│  git pull origin main                               │
│        ↓                                           │
│  git checkout -b feat/<ticket>                     │
│        ↓                                           │
│  ng serve  +  cd backend && npm run dev            │
│        ↓                                           │
│  Code → Save → Hot reload (~ 200 ms)              │
│        ↓                                           │
│  ng test --watch  (parallel terminal)              │
│        ↓                                           │
│  git commit -m "feat(orders): ..."                 │
│        ↓                                           │
│  git push origin feat/<ticket>                     │
│        ↓                                           │
│  Open Pull Request → CI checks → Review → Merge   │
└─────────────────────────────────────────────────────┘
```

---

## ➕ Adding a New Feature

Follow these steps **in order**. Every new feature lives under `src/features/<name>/`.

### Step 1 — Define the Model

```typescript
// src/shared/models/<feature>.model.ts
export interface MyEntity { ... }
export interface MyEntityState { ... }
export interface CreateMyEntityDto { ... }
export interface UpdateMyEntityDto { ... }
```

### Step 2 — Build the API Service

```typescript
// src/features/<name>/api/<name>-api.service.ts
@Injectable({ providedIn: 'root' })
export class MyEntityApiService {
  // HTTP calls ONLY
  getAll(): Observable<MyEntity[]> { ... }
  create(dto: CreateMyEntityDto): Observable<MyEntity> { ... }
}
```

### Step 3 — Build the Business Service

```typescript
// src/features/<name>/services/<name>.service.ts
@Injectable({ providedIn: 'root' })
export class MyEntityService {
  // Pure domain logic — no HTTP, no signals
  validate(dto: CreateMyEntityDto): ValidationResult { ... }
  calculate(entity: MyEntity): number { ... }
}
```

### Step 4 — Build the Facade

```typescript
// src/features/<name>/facades/<name>.facade.ts
@Injectable({ providedIn: 'root' })
export class MyEntityFacade {
  private readonly _state = signal<MyEntityState>(DEFAULT_STATE);

  readonly items   = computed(() => this._state().items);
  readonly loading = computed(() => this._state().loading);
  readonly error   = computed(() => this._state().error);

  loadAll(): void { ... }
  create(dto: CreateMyEntityDto): void { ... }
}
```

### Step 5 — Build the Pages / Components

```typescript
// src/features/<name>/pages/<page>/<page>.page.ts
@Component({ standalone: true, ... })
export class MyPageComponent {
  readonly facade = inject(MyEntityFacade);
  // Read signals, call facade methods — nothing else
}
```

### Step 6 — Register Routes

```typescript
// src/features/<name>/routes.ts
export const MY_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/...').then(m => m.MyPageComponent) }
];
```

```typescript
// src/app/app.routes.ts  — add to children of the shell route
{
  path: 'my-feature',
  loadChildren: () => import('../features/<name>/routes').then(m => m.MY_ROUTES),
}
```

### Step 7 — Write Tests

```
tests/
  <name>.service.spec.ts        ← business logic
  <name>-api.service.spec.ts    ← HTTP mocking
  <name>.facade.spec.ts         ← state management
```

---

## 🔀 Data Flow Walkthrough

### Creating an Order (Full Trace)

```
User clicks "Create Order" (Submit button)
        │
        ▼
OrderFormPageComponent.submit()
  └─ calls facade.createOrder(dto)
        │
        ▼
OrderFacade.createOrder(dto)
  ├─ calls orderService.validateOrder(dto)
  │     └─ returns { valid: true/false, errors[] }
  ├─ if invalid → notifService.error(...)  → STOP
  ├─ _state.update({ creating: true })
  └─ calls orderApiService.createOrder(dto)
        │
        ▼
OrderApiService.createOrder(dto)
  └─ POST /api/orders  (authInterceptor adds Bearer token)
        │
        ▼
Backend (server.js)
  ├─ Validates JWT
  ├─ Checks role (admin|manager)
  ├─ Creates order object
  ├─ io.emit('order:created', summary)   ← broadcast to all WS clients
  └─ Returns 201 { success: true, data: newOrder }
        │
        ▼
OrderFacade (subscribe next)
  ├─ _state.update({ creating: false })
  ├─ calls notifService.success('Order Created', ...)
  └─ calls this.loadOrders()   ← refresh list
        │
        ▼
All connected clients (via WebSocket)
  └─ ws.on('order:created', summary)
       └─ _state.update: prepend summary to orders[]
```

### Real-Time Update Flow

```
Backend simulation tick (every 15 s)
        │
        ▼
io.emit('order:updated', updatedSummary)
        │
        ▼
WebSocketService.onmessage handler
  └─ dispatches to registered handlers for 'order:updated'
        │
        ▼
OrderFacade ws.on('order:updated', summary => ...)
  ├─ _state.update: replace matching order in orders[]
  ├─ _state.update: merge into selectedOrder if open
  └─ notifService.info('Live Update', ...)
        │
        ▼
Angular Signal graph re-evaluates computed()
  └─ OrderListPageComponent re-renders affected row
```

---

## 🌿 Branching Strategy

```
main                    ← production-ready, protected
  └── develop           ← integration branch
        ├── feat/OMS-42-export-csv
        ├── feat/OMS-55-notifications-panel
        ├── fix/OMS-61-pagination-reset
        └── chore/OMS-70-upgrade-material-19
```

| Branch Prefix | When to Use | Merges Into |
|---|---|---|
| `feat/` | New feature | `develop` |
| `fix/` | Bug fix | `develop` (or `main` for hotfix) |
| `chore/` | Tooling, deps, refactor | `develop` |
| `docs/` | Documentation only | `develop` |
| `hotfix/` | Production emergency | `main` + `develop` |

### Branch Naming

```
feat/OMS-<ticket>-<short-slug>
fix/OMS-<ticket>-<short-slug>

# Examples
feat/OMS-42-csv-export
fix/OMS-61-filter-reset-on-page-change
chore/OMS-70-upgrade-angular-19-2
```

---

## 📝 Commit Conventions

The project follows **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE / Closes #ticket]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | New feature visible to users |
| `fix` | Bug fix |
| `refactor` | Code change with no feature/fix |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Build, deps, tooling |
| `perf` | Performance improvement |
| `ci` | CI/CD config changes |

### Examples

```bash
git commit -m "feat(orders): add CSV export to order list"
git commit -m "fix(auth): prevent double refresh on concurrent 401s"
git commit -m "test(facade): cover optimistic update revert path"
git commit -m "chore(deps): upgrade @angular/material to 19.2"
git commit -m "docs(readme): add docker compose example"
```

---

## ✅ Code Review Checklist

Before opening a Pull Request, verify every item:

### Architecture
- [ ] No HTTP calls inside a Component or Facade
- [ ] No business logic inside a Component or API Service
- [ ] State mutations only inside the Facade via `.update()`
- [ ] New pages use `standalone: true`
- [ ] New services use `inject()`, not constructor injection

### TypeScript
- [ ] No `any` types
- [ ] No non-null assertions (`!`) without a comment explaining why it is safe
- [ ] All public API surfaces typed with interfaces, not inline object literals
- [ ] Strict mode passes: `ng build --configuration=production`

### Signals
- [ ] Mutable state held in `signal()` inside the Facade
- [ ] Derived values use `computed()`, not re-computed in templates
- [ ] Side-effects use `effect()` or RxJS subscriptions, not in `computed()`

### Tests
- [ ] New business logic covered by a spec in `tests/`
- [ ] Facade spec covers the happy path and error/revert path
- [ ] HTTP specs use `HttpTestingController` — no real calls

### Security
- [ ] No secrets or API keys in any TypeScript or SCSS file
- [ ] Role checks present for any destructive route/action
- [ ] User input passed to a template uses Angular's built-in sanitization

---

## 🧪 Testing Workflow

### Running Tests

```bash
# Interactive watch mode (recommended during development)
ng test

# Single run — use in CI
ng test --no-watch --no-progress

# With code coverage report (opens in browser)
ng test --no-watch --code-coverage
# Coverage report → coverage/angular-oms/index.html
```

### Writing a New Spec

1. Create `tests/<name>.spec.ts` or colocate as `<component>.spec.ts`
2. Use `TestBed.configureTestingModule` with only the providers needed
3. For services with HTTP, always use `provideHttpClientTesting()`
4. For facade tests, mock at the API service level — inject `HttpTestingController`
5. Use `fakeAsync` + `tick()` for Observables

```typescript
// Minimal facade test template
describe('MyFacade', () => {
  let facade: MyFacade;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyFacade, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    facade = TestBed.inject(MyFacade);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should load items', fakeAsync(() => {
    facade.loadAll();
    const req = httpMock.expectOne(r => r.url.includes('/items'));
    req.flush({ success: true, data: { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } });
    tick();
    expect(facade.loading()).toBe(false);
  }));
});
```

---

## 🤖 CI/CD Pipeline

### GitHub Actions — `ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: ng lint

      - name: Test
        run: ng test --no-watch --no-progress --browsers=ChromeHeadless

      - name: Build
        run: ng build --configuration=production

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/angular-oms/
```

### Pipeline Stages

```
Push / PR
    │
    ▼
┌─────────────────────────┐
│  1. Install (npm ci)    │  ~30 s
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│  2. Lint (ng lint)      │  ~15 s — fail fast
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│  3. Test (Karma/Jasmine)│  ~60 s — coverage gate
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│  4. Build (production)  │  ~90 s — bundle size gate
└────────────┬────────────┘
             ▼
┌─────────────────────────┐  (main branch only)
│  5. Deploy to staging   │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐  (manual approval)
│  6. Deploy to prod      │
└─────────────────────────┘
```

---

## 🚀 Deployment Workflow

### Staging Deployment

```bash
# Triggered automatically on merge to `develop`
ng build --configuration=production
# Artifacts deployed to staging via CI artifact upload
```

### Production Deployment

```bash
# 1. Merge develop → main (via PR)
# 2. Tag the release
git tag -a v1.2.0 -m "Release v1.2.0 - CSV export, notifications panel"
git push origin v1.2.0

# 3. CI pipeline triggers production deploy on tag push
```

### Manual Build & Deploy

```bash
# Build
ng build --configuration=production

# Copy dist to your server / CDN
rsync -avz dist/angular-oms/ user@server:/var/www/oms/

# Backend deploy (with PM2)
cd backend
pm2 restart oms-backend --update-env
```

---

## 🐛 Debugging Guide

### Angular Signals in DevTools

Install the [Angular DevTools](https://angular.dev/tools/devtools) Chrome extension.
Navigate to the **Components** tab → click a component → inspect its signal values live.

### WebSocket Debugging

```typescript
// Temporarily add in WebSocketService for verbose logging
this.socket.onmessage = (event) => {
  console.log('[WS IN]', event.data);
  // ... existing handler
};
```

Or use the **Network → WS** tab in Chrome DevTools to inspect frames.

### HTTP Request Debugging

All requests pass through `authInterceptor` and `errorInterceptor`.
Add `console.log` temporarily in the interceptor, or use:

```bash
# Angular verbose HTTP logging (dev only)
# In app.config.ts, add:
{ provide: HTTP_INTERCEPTORS, ... }   # interceptors log to console
```

The **Network** tab in Chrome DevTools shows full request/response details.

### Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| Blank screen on load | Auth initialization delay | `AppComponent` waits for `auth.isInitialized()` signal — check `StorageService` |
| Orders not loading | Backend not running | Start `cd backend && npm run dev` |
| WebSocket not connecting | Token missing or expired | Check `AuthService.getAccessToken()` returns a valid string |
| `● Live` badge stays grey | WS URL mismatch | Verify `environment.wsUrl` matches backend port |
| 403 on create/delete | Wrong role logged in | Use `admin@oms.dev` for full access |
| Optimistic revert visible | Slow network / backend error | Expected — facade restores state from snapshot |

---

## 📌 Common Tasks Reference

```bash
# Generate a new standalone component
ng g component features/orders/components/order-timeline --standalone --style=scss

# Generate a new service
ng g service features/orders/services/order-export

# Run only a subset of tests
ng test --include='**/order*.spec.ts'

# Analyse bundle size
ng build --configuration=production --stats-json
npx webpack-bundle-analyzer dist/angular-oms/stats.json

# Check Angular strict compilation
ng build --configuration=production 2>&1 | grep -i error

# Update Angular to latest patch
ng update @angular/core @angular/cli

# Format code (if Prettier is configured)
npx prettier --write "src/**/*.ts"

# List all lazy-loaded routes
grep -r "loadComponent\|loadChildren" src/app/app.routes.ts src/features
```
