import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrderFacade } from '../../facades/order.facade';
import { OrderSort, OrderStatus, OrderPriority, OrderSummary } from '../../../../shared/models/order.model';
import { getStatusColor, getPriorityColor, formatCurrency, formatDate } from '../../../../shared/utilities/helpers';
import { OrderStatusBadgeComponent } from '../../components/order-status-badge/order-status-badge.component';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    OrderStatusBadgeComponent,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="page-title">
          <h1>Orders</h1>
          <span class="total-badge">{{ facade.total() }} total</span>
          @if (facade.connected()) {
            <span class="live-badge">● Live</span>
          }
        </div>
        <button mat-raised-button color="primary" routerLink="/orders/new">
          <mat-icon>add</mat-icon> New Order
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search</mat-label>
          <input matInput [ngModel]="searchValue()" (ngModelChange)="onSearch($event)" placeholder="Order #, customer…" />
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select multiple [value]="selectedStatuses()" (selectionChange)="onStatusFilter($event.value)">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s | titlecase }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select multiple [value]="selectedPriorities()" (selectionChange)="onPriorityFilter($event.value)">
            @for (p of priorities; track p) {
              <mat-option [value]="p">{{ p | titlecase }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button (click)="clearFilters()">
          <mat-icon>clear</mat-icon> Clear
        </button>
      </div>

      <!-- Loading -->
      @if (facade.loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="48" />
        </div>
      }

      <!-- Empty State -->
      @if (!facade.loading() && !facade.hasOrders()) {
        <div class="empty-state">
          <mat-icon class="empty-icon">inbox</mat-icon>
          <h3>No orders found</h3>
          <p>Try adjusting your filters or create a new order.</p>
          <button mat-raised-button color="primary" routerLink="/orders/new">Create Order</button>
        </div>
      }

      <!-- Table -->
      @if (facade.hasOrders()) {
        <div class="table-container mat-elevation-z2">
          <table mat-table [dataSource]="facade.orders()" matSort (matSortChange)="onSort($event)">

            <ng-container matColumnDef="orderNumber">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Order #</th>
              <td mat-cell *matCellDef="let row">
                <a [routerLink]="['/orders', row.id]" class="order-link">{{ row.orderNumber }}</a>
              </td>
            </ng-container>

            <ng-container matColumnDef="customerName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Customer</th>
              <td mat-cell *matCellDef="let row">{{ row.customerName }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let row">
                <app-order-status-badge [status]="row.status" />
              </td>
            </ng-container>

            <ng-container matColumnDef="priority">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Priority</th>
              <td mat-cell *matCellDef="let row">
                <span class="priority-chip" [class]="'priority-' + row.priority">
                  {{ row.priority | titlecase }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="itemCount">
              <th mat-header-cell *matHeaderCellDef>Items</th>
              <td mat-cell *matCellDef="let row">{{ row.itemCount }}</td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Total</th>
              <td mat-cell *matCellDef="let row">{{ formatCurrency(row.total) }}</td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
              <td mat-cell *matCellDef="let row">{{ formatDate(row.createdAt) }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button [matMenuTriggerFor]="rowMenu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #rowMenu>
                  <button mat-menu-item [routerLink]="['/orders', row.id]">
                    <mat-icon>visibility</mat-icon> View
                  </button>
                  <button mat-menu-item [routerLink]="['/orders', row.id, 'edit']">
                    <mat-icon>edit</mat-icon> Edit
                  </button>
                  <button mat-menu-item class="danger" (click)="deleteOrder(row)">
                    <mat-icon>delete</mat-icon> Delete
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              class="order-row"
              [routerLink]="['/orders', row.id]"
            ></tr>
          </table>

          <mat-paginator
            [length]="facade.total()"
            [pageSize]="facade.pageSize()"
            [pageIndex]="facade.page() - 1"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
          />
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { display: flex; align-items: center; gap: 12px; }
    .page-title h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .total-badge { background: #e3f2fd; color: #1976d2; padding: 2px 10px; border-radius: 12px; font-size: 13px; }
    .live-badge { background: #e8f5e9; color: #388e3c; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; }
    .filters-row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; }
    .search-field { min-width: 240px; }
    .loading-overlay { display: flex; justify-content: center; padding: 48px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; color: #bdbdbd; }
    .table-container { overflow: hidden; border-radius: 8px; }
    table { width: 100%; }
    .order-row { cursor: pointer; transition: background 0.15s; }
    .order-row:hover { background: #f5f5f5; }
    .order-link { color: #1976d2; text-decoration: none; font-weight: 500; }
    .priority-chip { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .priority-low { background: #f5f5f5; color: #757575; }
    .priority-normal { background: #e3f2fd; color: #1976d2; }
    .priority-high { background: #fff3e0; color: #e65100; }
    .priority-urgent { background: #ffebee; color: #c62828; }
    .danger { color: #d32f2f; }
  `]
})
export class OrderListPageComponent implements OnInit {
  readonly facade = inject(OrderFacade);

  readonly displayedColumns = [
    'orderNumber', 'customerName', 'status', 'priority', 'itemCount', 'total', 'createdAt', 'actions'
  ];

  readonly statuses: OrderStatus[] = [
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  ];
  readonly priorities: OrderPriority[] = ['low', 'normal', 'high', 'urgent'];

  readonly searchValue = signal('');
  readonly selectedStatuses = signal<OrderStatus[]>([]);
  readonly selectedPriorities = signal<OrderPriority[]>([]);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  ngOnInit(): void {
    this.facade.loadOrders();
  }

  onSearch(value: string): void {
    this.searchValue.set(value);
    this.facade.setFilter({ ...this.facade.filter(), search: value || undefined });
  }

  onStatusFilter(status: OrderStatus[]): void {
    this.selectedStatuses.set(status);
    this.facade.setFilter({ ...this.facade.filter(), status: status.length ? status : undefined });
  }

  onPriorityFilter(priority: OrderPriority[]): void {
    this.selectedPriorities.set(priority);
    this.facade.setFilter({ ...this.facade.filter(), priority: priority.length ? priority : undefined });
  }

  onSort(sort: Sort): void {
    this.facade.setSort({
      field: (sort.active as keyof typeof this.facade.orders[0]) || 'createdAt',
      direction: (sort.direction as 'asc' | 'desc') || 'desc',
    } as OrderSort);
  }

  onPage(event: PageEvent): void {
    this.facade.setPage(event.pageIndex + 1);
    this.facade.setPageSize(event.pageSize);
  }

  clearFilters(): void {
    this.searchValue.set('');
    this.selectedStatuses.set([]);
    this.selectedPriorities.set([]);
    this.facade.setFilter({});
  }

  deleteOrder(order: OrderSummary): void {
    if (confirm(`Delete order ${order.orderNumber}?`)) {
      this.facade.deleteOrder(order.id);
    }
  }
}
