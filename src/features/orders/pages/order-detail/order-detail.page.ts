import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { OrderFacade } from '../../facades/order.facade';
import { OrderService } from '../../services/order.service';
import { OrderStatusBadgeComponent } from '../../components/order-status-badge/order-status-badge.component';
import { OrderStatus } from '../../../../shared/models/order.model';
import { formatCurrency, formatDate } from '../../../../shared/utilities/helpers';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    OrderStatusBadgeComponent,
  ],
  template: `
    <div class="page-container">
      <!-- Back navigation -->
      <button mat-button routerLink="/orders" class="back-btn">
        <mat-icon>arrow_back</mat-icon> Orders
      </button>

      <!-- Loading -->
      @if (facade.loadingOrder()) {
        <div class="loading-center"><mat-spinner diameter="56" /></div>
      }

      <!-- Error -->
      @if (facade.error() && !facade.loadingOrder()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>{{ facade.error() }}</p>
          <button mat-raised-button (click)="reload()">Retry</button>
        </div>
      }

      <!-- Order Detail -->
      @let order = facade.selectedOrder();
      @if (order && !facade.loadingOrder()) {
        <div class="detail-grid">
          <!-- Header Card -->
          <mat-card class="header-card">
            <mat-card-header>
              <mat-card-title>Order #{{ order.orderNumber }}</mat-card-title>
              <mat-card-subtitle>{{ formatDate(order.createdAt) }}</mat-card-subtitle>
              <div class="header-actions">
                <app-order-status-badge [status]="order.status" />
                <button mat-icon-button [matMenuTriggerFor]="actionsMenu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #actionsMenu>
                  <button mat-menu-item [routerLink]="['/orders', order.id, 'edit']">
                    <mat-icon>edit</mat-icon> Edit Order
                  </button>
                  @for (next of nextStatuses(order.status); track next) {
                    <button mat-menu-item (click)="updateStatus(order.id, next)">
                      <mat-icon>sync</mat-icon> Mark as {{ next | titlecase }}
                    </button>
                  }
                  <mat-divider />
                  <button mat-menu-item class="danger" (click)="deleteOrder(order.id)">
                    <mat-icon>delete</mat-icon> Delete
                  </button>
                </mat-menu>
              </div>
            </mat-card-header>
          </mat-card>

          <!-- Customer Info -->
          <mat-card>
            <mat-card-header><mat-card-title>Customer</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="info-row"><span class="label">Name</span><span>{{ order.customerName }}</span></div>
              <div class="info-row"><span class="label">Email</span><span>{{ order.customerEmail }}</span></div>
              <mat-divider />
              <p class="section-label">Shipping Address</p>
              <address>
                {{ order.shippingAddress.street }}<br />
                {{ order.shippingAddress.city }}, {{ order.shippingAddress.state }} {{ order.shippingAddress.zip }}<br />
                {{ order.shippingAddress.country }}
              </address>
            </mat-card-content>
          </mat-card>

          <!-- Items -->
          <mat-card class="items-card">
            <mat-card-header><mat-card-title>Items ({{ order.items.length }})</mat-card-title></mat-card-header>
            <mat-card-content>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of order.items; track item.id) {
                    <tr>
                      <td>{{ item.productName }}</td>
                      <td class="sku">{{ item.sku }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ formatCurrency(item.unitPrice) }}</td>
                      <td>{{ item.discount }}%</td>
                      <td class="amount">{{ formatCurrency(item.total) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <mat-divider />
              <div class="totals">
                <div class="total-row"><span>Subtotal</span><span>{{ formatCurrency(order.subtotal) }}</span></div>
                <div class="total-row"><span>Tax</span><span>{{ formatCurrency(order.tax) }}</span></div>
                <div class="total-row"><span>Shipping</span><span>{{ formatCurrency(order.shipping) }}</span></div>
                @if (order.discount > 0) {
                  <div class="total-row discount"><span>Discount</span><span>-{{ formatCurrency(order.discount) }}</span></div>
                }
                <mat-divider />
                <div class="total-row grand-total"><span>Total</span><span>{{ formatCurrency(order.total) }}</span></div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Notes -->
          @if (order.notes) {
            <mat-card>
              <mat-card-header><mat-card-title>Notes</mat-card-title></mat-card-header>
              <mat-card-content><p>{{ order.notes }}</p></mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .back-btn { margin-bottom: 16px; }
    .loading-center { display: flex; justify-content: center; padding: 64px; }
    .error-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px; color: #d32f2f; }
    .detail-grid { display: grid; gap: 20px; }
    .header-card mat-card-header { display: flex; align-items: center; }
    .header-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .info-row { display: flex; gap: 12px; padding: 6px 0; }
    .label { color: #757575; min-width: 80px; }
    .section-label { color: #757575; font-size: 13px; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    address { font-style: normal; line-height: 1.7; }
    .items-card { grid-column: 1 / -1; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th { text-align: left; padding: 8px 12px; background: #f5f5f5; font-weight: 600; font-size: 13px; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #eeeeee; }
    .items-table .sku { color: #757575; font-size: 12px; }
    .items-table .amount { font-weight: 500; text-align: right; }
    .totals { padding: 12px 0; max-width: 320px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .total-row.discount { color: #388e3c; }
    .total-row.grand-total { font-size: 17px; font-weight: 700; padding-top: 8px; }
    .danger { color: #d32f2f; }
  `]
})
export class OrderDetailPageComponent implements OnInit, OnDestroy {
  readonly facade = inject(OrderFacade);
  readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.facade.loadOrder(id);
  }

  reload(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.facade.loadOrder(id);
  }

  nextStatuses(status: OrderStatus): OrderStatus[] {
    return this.orderService.getNextStatuses(status);
  }

  updateStatus(id: string, status: OrderStatus): void {
    this.facade.updateOrder(id, { status });
  }

  deleteOrder(id: string): void {
    const order = this.facade.selectedOrder();
    if (order && confirm(`Delete order ${order.orderNumber}?`)) {
      this.facade.deleteOrder(id);
      this.router.navigate(['/orders']);
    }
  }

  ngOnDestroy(): void {
    this.facade.clearSelectedOrder();
  }
}
