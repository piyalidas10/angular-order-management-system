import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Order,
  OrderSummary,
  CreateOrderDto,
  UpdateOrderDto,
  OrderFilter,
  OrderSort,
  PaginationParams,
  PaginatedResponse,
} from '../../../shared/models/order.model';
import { ApiResponse } from '../../../shared/models/api.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/orders`;

  getOrders(
    pagination: PaginationParams,
    filter: OrderFilter,
    sort: OrderSort
  ): Observable<PaginatedResponse<OrderSummary>> {
    let params = new HttpParams()
      .set('page', pagination.page)
      .set('pageSize', pagination.pageSize)
      .set('sortField', sort.field as string)
      .set('sortDir', sort.direction);

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status?.length) params = params.set('status', filter.status.join(','));
    if (filter.priority?.length) params = params.set('priority', filter.priority.join(','));
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);

    return this.http
      .get<ApiResponse<PaginatedResponse<OrderSummary>>>(this.base, { params })
      .pipe(map(r => r.data));
  }

  getOrder(id: string): Observable<Order> {
    return this.http
      .get<ApiResponse<Order>>(`${this.base}/${id}`)
      .pipe(map(r => r.data));
  }

  createOrder(dto: CreateOrderDto): Observable<Order> {
    return this.http
      .post<ApiResponse<Order>>(this.base, dto)
      .pipe(map(r => r.data));
  }

  updateOrder(id: string, dto: UpdateOrderDto): Observable<Order> {
    return this.http
      .patch<ApiResponse<Order>>(`${this.base}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http
      .get<ApiResponse<DashboardStats>>(`${environment.apiUrl}/dashboard/stats`)
      .pipe(map(r => r.data));
  }
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredToday: number;
  revenue: number;
  revenueGrowth: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: { date: string; revenue: number }[];
}
