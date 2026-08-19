import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        return handle401(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  const refreshToken = authService.tokens()?.refreshToken;

  if (!refreshToken) {
    authService.logout();
    return throwError(() => new Error('No refresh token'));
  }

  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter(t => t !== null),
      take(1),
      switchMap(token => next(addToken(req, token!)))
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return authService.refreshTokens(refreshToken).pipe(
    switchMap(tokens => {
      isRefreshing = false;
      refreshTokenSubject.next(tokens.accessToken);
      return next(addToken(req, tokens.accessToken));
    }),
    catchError(err => {
      isRefreshing = false;
      authService.logout();
      return throwError(() => err);
    })
  );
}
