import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OrderFacade } from '../src/features/orders/facades/order.facade';
import { OrderSummary, PaginatedResponse } from '../src/shared/models/order.model';

const MOCK_PAGE: PaginatedResponse<OrderSummary> = {
  data: [
    { id: 'o1', orderNumber: 'ORD-10001', customerName: 'Customer A', status: 'pending', priority: 'normal', total: 100, itemCount: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  total: 1, page: 1, pageSize: 20, totalPages: 1,
};

describe('OrderFacade', () => {
  let facade: OrderFacade;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrderFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    facade = TestBed.inject(OrderFacade);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should initialize with empty state', () => {
    expect(facade.orders()).toEqual([]);
    expect(facade.loading()).toBe(false);
    expect(facade.total()).toBe(0);
  });

  it('should load orders and update state', fakeAsync(() => {
    facade.loadOrders();
    expect(facade.loading()).toBe(true);

    const req = httpMock.expectOne(r => r.url.includes('/orders'));
    req.flush({ success: true, data: MOCK_PAGE });
    tick();

    expect(facade.loading()).toBe(false);
    expect(facade.orders().length).toBe(1);
    expect(facade.total()).toBe(1);
    expect(facade.orders()[0].orderNumber).toBe('ORD-10001');
  }));

  it('should set error state on load failure', fakeAsync(() => {
    facade.loadOrders();

    const req = httpMock.expectOne(r => r.url.includes('/orders'));
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
    tick();

    expect(facade.loading()).toBe(false);
    expect(facade.error()).toBeTruthy();
  }));

  it('should apply optimistic delete and revert on error', fakeAsync(() => {
    facade.loadOrders();
    const loadReq = httpMock.expectOne(r => r.url.includes('/orders'));
    loadReq.flush({ success: true, data: MOCK_PAGE });
    tick();

    expect(facade.orders().length).toBe(1);

    facade.deleteOrder('o1');
    // Optimistic removal
    expect(facade.orders().length).toBe(0);

    const deleteReq = httpMock.expectOne(r => r.url.includes('/orders/o1'));
    deleteReq.flush({ message: 'Error' }, { status: 500, statusText: 'Error' });
    tick();

    // Should revert
    expect(facade.orders().length).toBe(1);
  }));

  it('should update filter and reload', fakeAsync(() => {
    facade.setFilter({ search: 'test' });
    expect(facade.filter().search).toBe('test');
    expect(facade.page()).toBe(1);

    const req = httpMock.expectOne(r => r.url.includes('/orders'));
    req.flush({ success: true, data: MOCK_PAGE });
    tick();
  }));
});
