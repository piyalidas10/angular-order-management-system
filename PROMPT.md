# Prompt: Generate a Production-Ready Real-Time Angular 19 Application Using Component → Facade → Service Pattern

Act as a Senior Angular Architect and build a **production-grade, enterprise-scale, real-time application** using **Angular 19** following the **Component → Facade → Service architecture pattern**.

The application should demonstrate modern Angular best practices, scalability, maintainability, and clean separation of concerns.

## Application Requirements

Build a **Real-Time Order Management System** (or similar enterprise application) with the following features:

### Functional Requirements

* Dashboard with live updates
* Order listing with pagination, filtering, sorting
* Order details page
* Create / Update / Delete orders
* Real-time order status updates
* Notifications
* User authentication and role-based access
* Loading, error, and empty states
* Optimistic UI updates
* Offline handling and retry mechanism

---

## Technology Stack

Use:

* Angular 19
* Standalone Components
* Signals
* Computed Signals
* Signal-based State Management
* RxJS only where required
* TypeScript Strict Mode
* Angular Router
* Lazy Loading
* Route-Level Code Splitting
* Angular Material
* SCSS
* HttpClient
* WebSocket
* Server-Sent Events (optional)
* Node.js + Socket.IO backend (mock)
* JWT Authentication
* Interceptors
* Guards
* Functional Providers

---

## Architecture Pattern

Follow this strict flow:

```text
UI Component
      ↓
Facade Layer
      ↓
Business Service
      ↓
API / WebSocket Service
      ↓
Backend
```

Example:

```text
OrderListComponent
        ↓
OrderFacade
        ↓
OrderService
        ↓
OrderApiService
        ↓
HTTP / WebSocket
```

---

## Responsibilities

### Component Layer

Responsible only for:

* UI rendering
* User events
* Calling Facade methods
* Reading Signals from Facade

Must NOT contain:

* HTTP calls
* Business logic
* State mutation

Example:

```typescript
@Component({...})
export class OrderListComponent {
  orders = this.orderFacade.orders;
  loading = this.orderFacade.loading;

  constructor(private orderFacade: OrderFacade) {}

  refresh() {
      this.orderFacade.loadOrders();
  }
}
```

---

### Facade Layer

Responsibilities:

* State management
* Signals
* Computed values
* Combine data
* Handle loading
* Handle errors
* Real-time updates

Example:

```typescript
@Injectable()
export class OrderFacade {

    private readonly state = signal<OrderState>({
        orders: [],
        loading: false,
        error: null
    });

    readonly orders = computed(() => this.state().orders);
    readonly loading = computed(() => this.state().loading);

    loadOrders() {}
    createOrder() {}
    updateOrder() {}
}
```

---

### Business Service Layer

Responsibilities:

* Business rules
* Validation
* Data transformation
* Domain logic

Example:

```typescript
class OrderService {

    calculateTotal() {}

    validateOrder() {}

    applyDiscount() {}
}
```

---

### API Service Layer

Responsibilities:

* HTTP calls
* WebSocket handling
* Retry strategy
* Error handling

Example:

```typescript
class OrderApiService {

    getOrders(){}

    createOrder(){}

    connectSocket(){}
}
```

---

## Folder Structure

```text
src/
 ├── core/
 │   ├── auth/
 │   ├── interceptors/
 │   ├── guards/
 │   └── services/
 │
 ├── shared/
 │   ├── ui/
 │   ├── models/
 │   └── utilities/
 │
 ├── features/
 │   └── orders/
 │       ├── pages/
 │       ├── components/
 │       ├── facades/
 │       ├── services/
 │       ├── api/
 │       ├── store/
 │       ├── models/
 │       └── routes.ts
 │
 └── app.config.ts
```

---

## Real-Time Requirements

Implement:

* WebSocket connection
* Auto reconnect
* Heartbeat / Ping-Pong
* Connection status signal
* Live updates

Example:

```text
Client
   ↓
WebSocket
   ↓
Socket.IO
   ↓
Redis Pub/Sub
   ↓
Backend Services
```

---

## State Management

Use Signals:

```typescript
signal()
computed()
effect()
linkedSignal()
resource()
```

State Example:

```typescript
interface OrderState {
    orders: Order[];
    selectedOrder: Order | null;
    loading: boolean;
    error: string | null;
    connected: boolean;
}
```

---

## Authentication

Implement:

* JWT
* Refresh Token
* Role-Based Access
* Route Guards

Roles:

```text
Admin
Manager
Viewer
```

---

## Deliverables

Generate:

1. Complete project structure
2. All Angular 19 code
3. Models
4. Components
5. Facades
6. Services
7. API layer
8. WebSocket integration
9. Authentication
10. Guards
11. Interceptors
12. Signal state management
13. Unit tests
14. Sequence diagrams
15. Architecture diagrams
16. Best practices
17. Performance optimizations
18. Production deployment strategy

The code should follow:

* SOLID principles
* Clean Architecture
* Separation of Concerns
* Enterprise standards
* Scalable folder structure
* Reusable components
* High testability

Generate production-quality code with detailed explanations.
