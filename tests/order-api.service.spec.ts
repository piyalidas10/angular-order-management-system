import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderApiService } from '../src/features/orders/api/order-api.service';
import { OrderSummary, PaginatedResponse } from '../src/shared/models/order.model';

const MOCK_SUMMARY: OrderSummary = {
  id: 'o1', orderNumber: 'ORD-10001', customerName: 'Test Customer',
  status: 'pending', priority: 'normal', total: 250, itemCount: 2,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
};

describe('OrderApiService', () => {
  let service: OrderApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OrderApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should GET orders with correct params', () => {
    const page = { page: 1, pageSize: 20 };
    const filter = { search: 'ORD' };
    const sort = { field: 'createdAt' as const, direction: 'desc' as const };

    const mockResponse: PaginatedResponse<OrderSummary> = {
      data: [MOCK_SUMMARY], total: 1, page: 1, pageSize: 20, totalPages: 1
    };

    service.getOrders(page, filter, sort).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.total).toBe(1);
    });

    const req = httpMock.expectOne(r =>
      r.url.includes('/orders') && r.params.get('search') === 'ORD'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: mockResponse });
  });

  it('should GET a single order by id', () => {
    service.getOrder('o1').subscribe(order => expect(order.id).toBe('o1'));

    const req = httpMock.expectOne(r => r.url.includes('/orders/o1'));
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { ...MOCK_SUMMARY, items: [], shippingAddress: {} } });
  });

  it('should DELETE an order', () => {
    service.deleteOrder('o1').subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/orders/o1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
