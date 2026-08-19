import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { StorageService } from '../../shared/utilities/storage.service';
import { User, AuthTokens, LoginDto, AuthState, JwtPayload } from '../../shared/models/user.model';
import { ApiResponse } from '../../shared/models/api.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);

  private readonly _state = signal<AuthState>({
    user: null,
    tokens: null,
    loading: false,
    error: null,
    initialized: false,
  });

  readonly user = computed(() => this._state().user);
  readonly tokens = computed(() => this._state().tokens);
  readonly loading = computed(() => this._state().loading);
  readonly error = computed(() => this._state().error);
  readonly isAuthenticated = computed(() => !!this._state().user && !!this._state().tokens);
  readonly isInitialized = computed(() => this._state().initialized);
  readonly currentRole = computed(() => this._state().user?.role ?? null);

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const tokens = this.storage.get<AuthTokens>('tokens');
    const user = this.storage.get<User>('user');

    if (tokens && user && !this.isTokenExpired(tokens.accessToken)) {
      this._state.update(s => ({ ...s, tokens, user, initialized: true }));
      this.scheduleRefresh(tokens);
    } else if (tokens?.refreshToken) {
      this.refreshTokens(tokens.refreshToken).subscribe({
        next: () => this._state.update(s => ({ ...s, initialized: true })),
        error: () => {
          this.clearAuth();
          this._state.update(s => ({ ...s, initialized: true }));
        },
      });
    } else {
      this._state.update(s => ({ ...s, initialized: true }));
    }
  }

  login(dto: LoginDto): Observable<User> {
    this._state.update(s => ({ ...s, loading: true, error: null }));

    return this.http
      .post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
        `${environment.apiUrl}/auth/login`,
        dto
      )
      .pipe(
        map(res => res.data),
        tap(({ user, tokens }) => {
          this.setAuth(user, tokens);
        }),
        map(({ user }) => user),
        catchError(err => {
          this._state.update(s => ({
            ...s,
            loading: false,
            error: err.error?.message ?? 'Login failed',
          }));
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    const tokens = this.tokens();
    if (tokens?.accessToken) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { token: tokens.refreshToken })
        .subscribe({ error: () => {} });
    }
    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  refreshTokens(refreshToken: string): Observable<AuthTokens> {
    return this.http
      .post<ApiResponse<AuthTokens>>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        map(res => res.data),
        tap(tokens => {
          const user = this.user();
          if (user) this.setAuth(user, tokens);
        }),
        catchError(err => {
          this.clearAuth();
          return throwError(() => err);
        })
      );
  }

  hasRole(...roles: string[]): boolean {
    const role = this.currentRole();
    return role ? roles.includes(role) : false;
  }

  getAccessToken(): string | null {
    return this.tokens()?.accessToken ?? null;
  }

  private setAuth(user: User, tokens: AuthTokens): void {
    this.storage.set('tokens', tokens);
    this.storage.set('user', user);
    this._state.update(s => ({ ...s, user, tokens, loading: false, error: null }));
    this.scheduleRefresh(tokens);
  }

  private clearAuth(): void {
    this.storage.remove('tokens');
    this.storage.remove('user');
    this._state.update(s => ({ ...s, user: null, tokens: null }));
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      return Date.now() / 1000 > payload.exp - 60;
    } catch {
      return true;
    }
  }

  private scheduleRefresh(tokens: AuthTokens): void {
    const expiresIn = tokens.expiresIn * 1000;
    const refreshIn = Math.max(expiresIn - 60_000, 0);

    timer(refreshIn)
      .pipe(switchMap(() => this.refreshTokens(tokens.refreshToken)))
      .subscribe({ error: () => {} });
  }
}
