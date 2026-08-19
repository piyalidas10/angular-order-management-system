import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus } from '../../../../shared/models/order.model';

const STATUS_CONFIG: Record<OrderStatus, { label: string; class: string }> = {
  pending:    { label: 'Pending',    class: 'status-pending' },
  confirmed:  { label: 'Confirmed',  class: 'status-confirmed' },
  processing: { label: 'Processing', class: 'status-processing' },
  shipped:    { label: 'Shipped',    class: 'status-shipped' },
  delivered:  { label: 'Delivered',  class: 'status-delivered' },
  cancelled:  { label: 'Cancelled',  class: 'status-cancelled' },
  refunded:   { label: 'Refunded',   class: 'status-refunded' },
};

@Component({
  selector: 'app-order-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="config.class">{{ config.label }}</span>
  `,
  styles: [`
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: capitalize;
    }
    .status-pending    { background: #fff8e1; color: #f57f17; }
    .status-confirmed  { background: #e3f2fd; color: #1565c0; }
    .status-processing { background: #f3e5f5; color: #6a1b9a; }
    .status-shipped    { background: #e0f7fa; color: #00695c; }
    .status-delivered  { background: #e8f5e9; color: #2e7d32; }
    .status-cancelled  { background: #ffebee; color: #b71c1c; }
    .status-refunded   { background: #f5f5f5; color: #616161; }
  `]
})
export class OrderStatusBadgeComponent {
  @Input({ required: true }) status!: OrderStatus;

  get config() {
    return STATUS_CONFIG[this.status] ?? { label: this.status, class: '' };
  }
}
