import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../../shared/models/user.model';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login']);
};

export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasRole(...roles)) {
      return true;
    }
    return router.createUrlTree(['/unauthorized']);
  };
}

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
