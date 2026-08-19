import { TestBed } from '@angular/core/testing';
import { OrderService } from '../src/features/orders/services/order.service';
import { OrderItem, OrderStatus, CreateOrderDto } from '../src/shared/models/order.model';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OrderService] });
    service = TestBed.inject(OrderService);
  });

  describe('calculateItemTotal', () => {
    it('should calculate total without discount', () => {
      expect(service.calculateItemTotal({ unitPrice: 100, quantity: 3, discount: 0 })).toBe(300);
    });

    it('should apply percentage discount', () => {
      expect(service.calculateItemTotal({ unitPrice: 100, quantity: 2, discount: 10 })).toBe(180);
    });

    it('should never return negative total', () => {
      expect(service.calculateItemTotal({ unitPrice: 10, quantity: 1, discount: 200 })).toBe(0);
    });
  });

  describe('calculateOrderTotals', () => {
    const items: OrderItem[] = [
      { id: '1', productId: 'P1', productName: 'P1', sku: 'S1', quantity: 2, unitPrice: 100, discount: 0, total: 200 },
      { id: '2', productId: 'P2', productName: 'P2', sku: 'S2', quantity: 1, unitPrice: 50, discount: 0, total: 50 },
    ];

    it('should compute subtotal, tax, shipping and total', () => {
      const result = service.calculateOrderTotals(items, 0.1, 0.05);
      expect(result.subtotal).toBe(250);
      expect(result.tax).toBe(25);
      expect(result.shipping).toBe(12.5);
      expect(result.total).toBe(287.5);
    });

    it('should waive shipping for orders > $500', () => {
      const bigItems: OrderItem[] = [
        { ...items[0], quantity: 5, unitPrice: 200, total: 1000 },
      ];
      const result = service.calculateOrderTotals(bigItems);
      expect(result.shipping).toBe(0);
    });
  });

  describe('applyBulkDiscount', () => {
    const baseItem: OrderItem = {
      id: '1', productId: 'P1', productName: 'P1', sku: 'S1',
      quantity: 10, unitPrice: 100, discount: 0, total: 1000
    };

    it('should apply 5% for qty >= 10', () => {
      const result = service.applyBulkDiscount(baseItem);
      expect(result.discount).toBe(5);
    });

    it('should apply 10% for qty >= 20', () => {
      const result = service.applyBulkDiscount({ ...baseItem, quantity: 20 });
      expect(result.discount).toBe(10);
    });

    it('should apply 20% for qty >= 50', () => {
      const result = service.applyBulkDiscount({ ...baseItem, quantity: 50 });
      expect(result.discount).toBe(20);
    });

    it('should not reduce existing higher discount', () => {
      const result = service.applyBulkDiscount({ ...baseItem, quantity: 10, discount: 15 });
      expect(result.discount).toBe(15);
    });
  });

  describe('validateOrder', () => {
    const valid: CreateOrderDto = {
      customerId: 'C1',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      priority: 'normal',
      items: [{ productId: 'P1', productName: 'Product', sku: 'S1', quantity: 2, unitPrice: 50, discount: 0 }],
      shippingAddress: { street: '123 Main', city: 'NY', state: 'NY', zip: '10001', country: 'US' },
    };

    it('should pass for a valid order', () => {
      expect(service.validateOrder(valid).valid).toBe(true);
    });

    it('should fail when customerName is empty', () => {
      const result = service.validateOrder({ ...valid, customerName: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Customer name'))).toBe(true);
    });

    it('should fail for invalid email', () => {
      const result = service.validateOrder({ ...valid, customerEmail: 'not-an-email' });
      expect(result.valid).toBe(false);
    });

    it('should fail when items is empty', () => {
      const result = service.validateOrder({ ...valid, items: [] });
      expect(result.valid).toBe(false);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow pending → confirmed', () => {
      expect(service.canTransitionTo('pending', 'confirmed')).toBe(true);
    });
    it('should allow confirmed → processing', () => {
      expect(service.canTransitionTo('confirmed', 'processing')).toBe(true);
    });
    it('should deny delivered → processing', () => {
      expect(service.canTransitionTo('delivered', 'processing')).toBe(false);
    });
    it('should deny cancelled → any', () => {
      expect(service.canTransitionTo('cancelled', 'pending')).toBe(false);
    });
  });

  describe('getNextStatuses', () => {
    it('should return [confirmed, cancelled] for pending', () => {
      expect(service.getNextStatuses('pending')).toEqual(['confirmed', 'cancelled']);
    });
    it('should return [] for cancelled', () => {
      expect(service.getNextStatuses('cancelled')).toEqual([]);
    });
  });
});
