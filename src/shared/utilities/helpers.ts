import { OrderStatus, OrderPriority } from '../models/order.model';

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending: 'orange',
    confirmed: 'blue',
    processing: 'purple',
    shipped: 'cyan',
    delivered: 'green',
    cancelled: 'red',
    refunded: 'gray',
  };
  return colors[status];
}

export function getPriorityColor(priority: OrderPriority): string {
  const colors: Record<OrderPriority, string> = {
    low: 'gray',
    normal: 'blue',
    high: 'orange',
    urgent: 'red',
  };
  return colors[priority];
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
