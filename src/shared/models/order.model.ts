export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface OrderAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  priority: OrderPriority;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress: OrderAddress;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  priority: OrderPriority;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  customerId: string;
  customerName: string;
  customerEmail: string;
  priority: OrderPriority;
  items: Omit<OrderItem, 'id' | 'total'>[];
  shippingAddress: OrderAddress;
  notes?: string;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  priority?: OrderPriority;
  notes?: string;
  shippingAddress?: OrderAddress;
}

export interface OrderFilter {
  search?: string;
  status?: OrderStatus[];
  priority?: OrderPriority[];
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

export interface OrderSort {
  field: keyof OrderSummary;
  direction: 'asc' | 'desc';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderState {
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
