import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { WebSocketService } from '../../core/services/websocket.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Orders', icon: 'shopping_bag', route: '/orders' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <!-- Sidebar -->
      <mat-sidenav mode="side" [opened]="sidenavOpen" class="sidenav">
        <div class="sidenav-header">
          <mat-icon class="brand-icon">inventory_2</mat-icon>
          <span class="brand-name">OMS</span>
        </div>

        <mat-nav-list>
          @for (item of visibleNavItems(); track item.route) {
            <a
              mat-list-item
              [routerLink]="item.route"
              routerLinkActive="active-link"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>

        <div class="sidenav-footer">
          <div class="connection-dot" [class.connected]="wsService.status() === 'connected'" 
               [matTooltip]="'WebSocket: ' + wsService.status()">
          </div>
          <span class="connection-label">{{ wsService.status() }}</span>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content>
        <!-- Top Bar -->
        <mat-toolbar class="topbar" color="primary">
          <button mat-icon-button (click)="sidenavOpen = !sidenavOpen">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="spacer"></span>

          <!-- Notifications -->
          <button
            mat-icon-button
            [matMenuTriggerFor]="notifMenu"
            [matBadge]="notifService.unreadCount()"
            [matBadgeHidden]="notifService.unreadCount() === 0"
            matBadgeColor="warn"
            matBadgeSize="small"
          >
            <mat-icon>notifications</mat-icon>
          </button>
          <mat-menu #notifMenu class="notif-menu" xPosition="before">
            <div class="notif-header" (click)="$event.stopPropagation()">
              <span>Notifications</span>
              <button mat-button (click)="notifService.markAllRead()">Mark all read</button>
            </div>
            @if (notifService.notifications().length === 0) {
              <p class="notif-empty">No notifications</p>
            }
            @for (n of notifService.notifications(); track n.id) {
              <button mat-menu-item [class.unread]="!n.read" (click)="notifService.markRead(n.id)">
                <mat-icon [class]="'notif-icon notif-' + n.type">
                  {{ n.type === 'success' ? 'check_circle' : n.type === 'error' ? 'error' : 'info' }}
                </mat-icon>
                <span class="notif-content">
                  <strong>{{ n.title }}</strong><br />
                  <small>{{ n.message }}</small>
                </span>
              </button>
            }
          </mat-menu>

          <!-- User Menu -->
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
            <mat-icon>account_circle</mat-icon>
            <span>{{ auth.user()?.firstName }}</span>
            <mat-icon>arrow_drop_down</mat-icon>
          </button>
          <mat-menu #userMenu xPosition="before">
            <div class="user-info" (click)="$event.stopPropagation()">
              <strong>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</strong>
              <small>{{ auth.user()?.email }}</small>
              <small class="role-badge">{{ auth.user()?.role | uppercase }}</small>
            </div>
            <mat-divider />
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Sign Out
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Router Outlet -->
        <div class="content-area">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container { height: 100vh; }
    .sidenav { width: 240px; background: #1a237e; color: white; display: flex; flex-direction: column; }
    .sidenav-header { display: flex; align-items: center; gap: 10px; padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .brand-icon { color: #90caf9; font-size: 28px; width: 28px; height: 28px; }
    .brand-name { font-size: 20px; font-weight: 700; color: white; }
    mat-nav-list a { color: rgba(255,255,255,0.8) !important; border-radius: 8px; margin: 2px 8px; }
    mat-nav-list a:hover { color: white !important; background: rgba(255,255,255,0.1) !important; }
    .active-link { background: rgba(255,255,255,0.15) !important; color: white !important; }
    .sidenav-footer { margin-top: auto; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 8px; }
    .connection-dot { width: 10px; height: 10px; border-radius: 50%; background: #f44336; }
    .connection-dot.connected { background: #4caf50; }
    .connection-label { font-size: 12px; color: rgba(255,255,255,0.6); text-transform: capitalize; }
    .topbar { box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; }
    .spacer { flex: 1; }
    .user-btn { color: white; }
    .content-area { padding: 0; min-height: calc(100vh - 64px); background: #f5f7fa; }
    .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; font-weight: 600; }
    .notif-empty { padding: 16px; color: #757575; text-align: center; }
    .unread { background: #e3f2fd; }
    .notif-icon { font-size: 18px; width: 18px; height: 18px; }
    .notif-info { color: #1976d2; }
    .notif-success { color: #388e3c; }
    .notif-warning { color: #e65100; }
    .notif-error { color: #c62828; }
    .notif-content { display: flex; flex-direction: column; }
    .user-info { padding: 12px 16px; display: flex; flex-direction: column; gap: 2px; }
    .role-badge { color: #1976d2; font-weight: 600; margin-top: 4px; }
  `]
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly notifService = inject(NotificationService);
  readonly wsService = inject(WebSocketService);
  private readonly router = inject(Router);

  sidenavOpen = true;

  readonly visibleNavItems = computed(() => {
    const role = this.auth.currentRole();
    return NAV_ITEMS.filter(item => !item.roles || (role && item.roles.includes(role)));
  });

  logout(): void {
    this.auth.logout();
  }
}
