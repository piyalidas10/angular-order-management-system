import { Injectable, signal, computed, effect, inject, OnDestroy } from '@angular/core';
import {
  Order,
  OrderSummary,
  OrderState,
  CreateOrderDto,
  UpdateOrderDto,
  OrderFilter,
  OrderSort,
  PaginationParams,
} from '../../../shared/models/order.model';
import { OrderApiService } from '../api/order-api.service';
import { OrderService } from '../services/order.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DashboardStats } from '../api/order-api.service';

const DEFAULT_STATE: OrderState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  loadingOrder: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
  connected: false,
  total: 0,
  page: 1,
  pageSize: 20,
  filter: {},
  sort: { field: 'createdAt', direction: 'desc' },
};

@Injectable({ providedIn: 'root' })
export class OrderFacade implements OnDestroy {
  private readonly api = inject(OrderApiService);
  private readonly orderService = inject(OrderService);
  private readonly ws = inject(WebSocketService);
  private readonly notif = inject(NotificationService);

  private readonly wsUnsubscribers: Array<() => void> = [];

  // ─── Core state signal ────────────────────────────────────────────────────
  private readonly _state = signal<OrderState>(DEFAULT_STATE);

  // ─── Derived (computed) signals ───────────────────────────────────────────
  readonly orders = computed(() => this._state().orders);
  readonly selectedOrder = computed(() => this._state().selectedOrder);
  readonly loading = computed(() => this._state().loading);
  readonly loadingOrder = computed(() => this._state().loadingOrder);
  readonly creating = computed(() => this._state().creating);
  readonly updating = computed(() => this._state().updating);
  readonly deleting = computed(() => this._state().deleting);
  readonly error = computed(() => this._state().error);
  readonly connected = computed(() => this._state().connected);
  readonly total = computed(() => this._state().total);
  readonly page = computed(() => this._state().page);
  readonly pageSize = computed(() => this._state().pageSize);
  readonly filter = computed(() => this._state().filter);
  readonly sort = computed(() => this._state().sort);
  readonly totalPages = computed(() =>
    Math.ceil(this._state().total / this._state().pageSize)
  );
  readonly hasOrders = computed(() => this._state().orders.length > 0);
  readonly stats = signal<DashboardStats | null>(null);

  constructor() {
    this.listenToWebSocket();
    this.trackConnectionStatus();
  }

  // ─── Load ──────────────────────────────────────────────────────────────────
  loadOrders(): void {
    const { page, pageSize, filter, sort } = this._state();
    this._state.update(s => ({ ...s, loading: true, error: null }));

    this.api.getOrders({ page, pageSize }, filter, sort).subscribe({
      next: result => {
        this._state.update(s => ({
          ...s,
          orders: result.data,
          total: result.total,
          loading: false,
        }));
      },
      error: err => this.setError(err, false),
    });
  }

  loadOrder(id: string): void {
    this._state.update(s => ({ ...s, loadingOrder: true, error: null }));

    this.api.getOrder(id).subscribe({
      next: order => this._state.update(s => ({ ...s, selectedOrder: order, loadingOrder: false })),
      error: err => this.setError(err, true),
    });
  }

  loadDashboardStats(): void {
    this.api.getDashboardStats().subscribe({
      next: s => this.stats.set(s),
      error: () => {},
    });
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  createOrder(dto: CreateOrderDto): void {
    const validation = this.orderService.validateOrder(dto);
    if (!validation.valid) {
      this.notif.error('Validation Error', validation.errors.join(' '));
      return;
    }

    this._state.update(s => ({ ...s, creating: true, error: null }));

    this.api.createOrder(dto).subscribe({
      next: order => {
        this._state.update(s => ({
          ...s,
          creating: false,
          total: s.total + 1,
        }));
        this.notif.success('Order Created', `Order #${order.orderNumber} created successfully.`);
        this.loadOrders(); // refresh list
      },
      error: err => {
        this._state.update(s => ({ ...s, creating: false }));
        this.setError(err, false);
      },
    });
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  updateOrder(id: string, dto: UpdateOrderDto): void {
    const current = this._state().orders.find(o => o.id === id);

    // Validate status transition
    if (dto.status && current) {
      if (!this.orderService.canTransitionTo(current.status, dto.status)) {
        this.notif.error(
          'Invalid Transition',
          `Cannot move from ${current.status} to ${dto.status}`
        );
        return;
      }
    }

    // Optimistic update
    this._state.update(s => ({
      ...s,
      updating: true,
      orders: s.orders.map(o =>
        o.id === id ? { ...o, ...(dto as Partial<OrderSummary>) } : o
      ),
    }));

    this.api.updateOrder(id, dto).subscribe({
      next: order => {
        this._state.update(s => ({
          ...s,
          updating: false,
          selectedOrder: s.selectedOrder?.id === id ? order : s.selectedOrder,
          orders: s.orders.map(o =>
            o.id === id ? { ...o, status: order.status, updatedAt: order.updatedAt } : o
          ),
        }));
        this.notif.success('Order Updated', `Order #${order.orderNumber} updated.`);
      },
      error: (err) => {
        // Revert optimistic update on failure
        if (current) {
          this._state.update(s => ({
            ...s,
            updating: false,
            orders: s.orders.map(o => (o.id === id ? current : o)),
          }));
        }
        this.setError(err, false);
      },
    });
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  deleteOrder(id: string): void {
    const snapshot = this._state().orders.find(o => o.id === id);
    if (!snapshot) return;

    // Optimistic removal
    this._state.update(s => ({
      ...s,
      deleting: true,
      orders: s.orders.filter(o => o.id !== id),
      total: s.total - 1,
    }));

    this.api.deleteOrder(id).subscribe({
      next: () => {
        this._state.update(s => ({ ...s, deleting: false }));
        this.notif.success('Order Deleted', 'Order removed successfully.');
      },
      error: err => {
        // Revert
        this._state.update(s => ({
          ...s,
          deleting: false,
          orders: [...s.orders, snapshot],
          total: s.total + 1,
        }));
        this.setError(err, false);
      },
    });
  }

  // ─── Pagination / Filter / Sort ───────────────────────────────────────────
  setPage(page: number): void {
    this._state.update(s => ({ ...s, page }));
    this.loadOrders();
  }

  setPageSize(pageSize: number): void {
    this._state.update(s => ({ ...s, pageSize, page: 1 }));
    this.loadOrders();
  }

  setFilter(filter: OrderFilter): void {
    this._state.update(s => ({ ...s, filter, page: 1 }));
    this.loadOrders();
  }

  setSort(sort: OrderSort): void {
    this._state.update(s => ({ ...s, sort }));
    this.loadOrders();
  }

  clearSelectedOrder(): void {
    this._state.update(s => ({ ...s, selectedOrder: null }));
  }

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  private listenToWebSocket(): void {
    const orderUpdated = this.ws.on<OrderSummary>('order:updated', summary => {
      this._state.update(s => ({
        ...s,
        orders: s.orders.map(o => (o.id === summary.id ? summary : o)),
        selectedOrder:
          s.selectedOrder?.id === summary.id
            ? { ...s.selectedOrder, ...summary }
            : s.selectedOrder,
      }));
      this.notif.info('Live Update', `Order #${summary.orderNumber} status → ${summary.status}`);
    });

    const orderCreated = this.ws.on<OrderSummary>('order:created', summary => {
      this._state.update(s => ({
        ...s,
        orders: [summary, ...s.orders].slice(0, s.pageSize),
        total: s.total + 1,
      }));
    });

    const orderDeleted = this.ws.on<{ id: string }>('order:deleted', ({ id }) => {
      this._state.update(s => ({
        ...s,
        orders: s.orders.filter(o => o.id !== id),
        total: Math.max(0, s.total - 1),
      }));
    });

    this.wsUnsubscribers.push(orderUpdated, orderCreated, orderDeleted);
  }

  private trackConnectionStatus(): void {
    effect(() => {
      const status = this.ws.status();
      this._state.update(s => ({ ...s, connected: status === 'connected' }));
    });
  }

  private setError(err: { userMessage?: string; message?: string }, isOrderLoad: boolean): void {
    const error = err.userMessage ?? err.message ?? 'An unexpected error occurred';
    this._state.update(s => ({
      ...s,
      loading: isOrderLoad ? false : s.loading,
      loadingOrder: isOrderLoad ? false : s.loadingOrder,
      error,
    }));
    this.notif.error('Error', error);
  }

  ngOnDestroy(): void {
    this.wsUnsubscribers.forEach(unsub => unsub());
  }
}
