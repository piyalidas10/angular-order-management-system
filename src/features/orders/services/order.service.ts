import { Injectable } from '@angular/core';
import {
  Order,
  OrderItem,
  CreateOrderDto,
  OrderStatus,
  OrderPriority,
} from '../../../shared/models/order.model';

export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  /**
   * Calculates line item total (unit price × qty - discount)
   */
  calculateItemTotal(item: Pick<OrderItem, 'unitPrice' | 'quantity' | 'discount'>): number {
    return Math.max(0, item.unitPrice * item.quantity * (1 - item.discount / 100));
  }

  /**
   * Recalculates full order financial summary
   */
  calculateOrderTotals(items: OrderItem[], taxRate = 0.1, shippingRate = 0.05): {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const tax = +(subtotal * taxRate).toFixed(2);
    const shipping = subtotal > 500 ? 0 : +(subtotal * shippingRate).toFixed(2);
    const total = +(subtotal + tax + shipping).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), tax, shipping, total };
  }

  /**
   * Applies bulk discount if quantity threshold met
   */
  applyBulkDiscount(item: OrderItem): OrderItem {
    let discount = item.discount;
    if (item.quantity >= 50) discount = Math.max(discount, 20);
    else if (item.quantity >= 20) discount = Math.max(discount, 10);
    else if (item.quantity >= 10) discount = Math.max(discount, 5);
    const total = this.calculateItemTotal({ ...item, discount });
    return { ...item, discount, total };
  }

  /**
   * Validates an order DTO before submission
   */
  validateOrder(dto: CreateOrderDto): OrderValidationResult {
    const errors: string[] = [];

    if (!dto.customerName?.trim()) errors.push('Customer name is required.');
    if (!dto.customerEmail?.trim()) errors.push('Customer email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.customerEmail))
      errors.push('Invalid customer email.');
    if (!dto.items?.length) errors.push('Order must contain at least one item.');

    dto.items?.forEach((item, idx) => {
      if (item.quantity <= 0) errors.push(`Item ${idx + 1}: quantity must be positive.`);
      if (item.unitPrice <= 0) errors.push(`Item ${idx + 1}: unit price must be positive.`);
    });

    if (!dto.shippingAddress?.street) errors.push('Shipping street is required.');
    if (!dto.shippingAddress?.city) errors.push('Shipping city is required.');
    if (!dto.shippingAddress?.zip) errors.push('Shipping ZIP is required.');
    if (!dto.shippingAddress?.country) errors.push('Shipping country is required.');

    return { valid: errors.length === 0, errors };
  }

  /**
   * Determines whether a status transition is allowed
   */
  canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: [],
    };
    return allowed[from]?.includes(to) ?? false;
  }

  /**
   * Returns valid next statuses for a given current status
   */
  getNextStatuses(current: OrderStatus): OrderStatus[] {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: [],
    };
    return transitions[current] ?? [];
  }

  /**
   * Returns priority label with urgency indicator
   */
  getPriorityLabel(priority: OrderPriority): string {
    const labels: Record<OrderPriority, string> = {
      low: 'Low',
      normal: 'Normal',
      high: '⚡ High',
      urgent: '🔴 Urgent',
    };
    return labels[priority];
  }
}
