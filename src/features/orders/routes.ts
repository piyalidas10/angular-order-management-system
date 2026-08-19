import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../../core/guards/auth.guard';

export const ORDER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../pages/order-list/order-list.page').then(m => m.OrderListPageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('../pages/order-form/order-form.page').then(m => m.OrderFormPageComponent),
    canActivate: [authGuard, roleGuard('admin', 'manager')],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('../pages/order-detail/order-detail.page').then(m => m.OrderDetailPageComponent),
    canActivate: [authGuard],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('../pages/order-form/order-form.page').then(m => m.OrderFormPageComponent),
    canActivate: [authGuard, roleGuard('admin', 'manager')],
  },
];
