import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { OrderFacade } from '../features/orders/facades/order.facade';
import { formatCurrency } from '../shared/utilities/helpers';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
  ],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <span class="connection-badge" [class.connected]="facade.connected()">
          {{ facade.connected() ? '● Live' : '○ Offline' }}
        </span>
      </div>

      <!-- KPI Cards -->
      @let stats = facade.stats();
      @if (stats) {
        <div class="kpi-grid">
          <mat-card class="kpi-card">
            <mat-icon class="kpi-icon blue">shopping_bag</mat-icon>
            <div class="kpi-value">{{ stats.totalOrders }}</div>
            <div class="kpi-label">Total Orders</div>
          </mat-card>

          <mat-card class="kpi-card">
            <mat-icon class="kpi-icon orange">hourglass_empty</mat-icon>
            <div class="kpi-value">{{ stats.pendingOrders }}</div>
            <div class="kpi-label">Pending</div>
          </mat-card>

          <mat-card class="kpi-card">
            <mat-icon class="kpi-icon purple">sync</mat-icon>
            <div class="kpi-value">{{ stats.processingOrders }}</div>
            <div class="kpi-label">Processing</div>
          </mat-card>

          <mat-card class="kpi-card">
            <mat-icon class="kpi-icon green">local_shipping</mat-icon>
            <div class="kpi-value">{{ stats.deliveredToday }}</div>
            <div class="kpi-label">Delivered Today</div>
          </mat-card>

          <mat-card class="kpi-card revenue">
            <mat-icon class="kpi-icon green">attach_money</mat-icon>
            <div class="kpi-value">{{ formatCurrency(stats.revenue) }}</div>
            <div class="kpi-label">
              Revenue
              <span class="growth" [class.positive]="stats.revenueGrowth >= 0">
                {{ stats.revenueGrowth >= 0 ? '+' : '' }}{{ stats.revenueGrowth }}%
              </span>
            </div>
          </mat-card>

          <mat-card class="kpi-card">
            <mat-icon class="kpi-icon blue">trending_up</mat-icon>
            <div class="kpi-value">{{ formatCurrency(stats.avgOrderValue) }}</div>
            <div class="kpi-label">Avg. Order Value</div>
          </mat-card>
        </div>

        <!-- Status Distribution -->
        <div class="charts-row">
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Orders by Status</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="status-bars">
                @for (entry of statusEntries(stats.ordersByStatus); track entry.key) {
                  <div class="bar-row">
                    <span class="bar-label">{{ entry.key | titlecase }}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [style.width.%]="barPercent(entry.value, stats.totalOrders)"
                        [class]="'bar-' + entry.key"
                      ></div>
                    </div>
                    <span class="bar-value">{{ entry.value }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Recent Orders shortcut -->
          <mat-card class="recent-card">
            <mat-card-header><mat-card-title>Quick Actions</mat-card-title></mat-card-header>
            <mat-card-content class="quick-actions">
              <button mat-stroked-button routerLink="/orders">
                <mat-icon>list</mat-icon> View All Orders
              </button>
              <button mat-stroked-button routerLink="/orders/new" color="primary">
                <mat-icon>add</mat-icon> Create Order
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      } @else {
        <div class="loading-center"><mat-spinner /></div>
      }
    </div>
  `,
  styles: [`
    .dashboard { padding: 24px; }
    .dashboard-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .dashboard-header h1 { margin: 0; font-size: 26px; font-weight: 600; }
    .connection-badge { font-size: 13px; font-weight: 600; padding: 3px 10px; border-radius: 12px; background: #ffebee; color: #c62828; }
    .connection-badge.connected { background: #e8f5e9; color: #2e7d32; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { padding: 20px; display: flex; flex-direction: column; gap: 8px; }
    .kpi-icon { font-size: 32px; width: 32px; height: 32px; }
    .kpi-icon.blue { color: #1976d2; }
    .kpi-icon.green { color: #388e3c; }
    .kpi-icon.orange { color: #e65100; }
    .kpi-icon.purple { color: #7b1fa2; }
    .kpi-value { font-size: 28px; font-weight: 700; line-height: 1; }
    .kpi-label { font-size: 13px; color: #757575; display: flex; align-items: center; gap: 6px; }
    .growth { font-weight: 600; }
    .growth.positive { color: #388e3c; }
    .charts-row { display: grid; grid-template-columns: 1fr 280px; gap: 20px; }
    .chart-card, .recent-card { padding: 8px; }
    .status-bars { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .bar-row { display: flex; align-items: center; gap: 12px; }
    .bar-label { width: 90px; font-size: 13px; color: #616161; text-transform: capitalize; }
    .bar-track { flex: 1; height: 12px; background: #eeeeee; border-radius: 6px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; transition: width 0.4s; }
    .bar-pending { background: #ffa726; }
    .bar-confirmed { background: #42a5f5; }
    .bar-processing { background: #ab47bc; }
    .bar-shipped { background: #26c6da; }
    .bar-delivered { background: #66bb6a; }
    .bar-cancelled { background: #ef5350; }
    .bar-value { width: 32px; text-align: right; font-size: 13px; font-weight: 600; }
    .quick-actions { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .loading-center { display: flex; justify-content: center; padding: 64px; }
    @media (max-width: 768px) {
      .charts-row { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly facade = inject(OrderFacade);
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    this.facade.loadDashboardStats();
  }

  statusEntries(map: Record<string, number>): { key: string; value: number }[] {
    return Object.entries(map).map(([key, value]) => ({ key, value }));
  }

  barPercent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
