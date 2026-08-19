import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login/login.component').then(m => m.LoginComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./shell/shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'orders',
        loadChildren: () =>
          import('../features/orders/routes').then(m => m.ORDER_ROUTES),
      },
    ],
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./errors/unauthorized.component').then(m => m.UnauthorizedComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./errors/not-found.component').then(m => m.NotFoundComponent),
  },
];
