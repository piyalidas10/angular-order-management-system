import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../src/core/auth/auth.service';
import { User, AuthTokens } from '../src/shared/models/user.model';

const MOCK_USER: User = {
  id: 'u1', email: 'admin@oms.dev', firstName: 'Alice', lastName: 'Admin', role: 'admin'
};

// Generate a non-expired JWT-shaped token
function makeToken(expiresInSecs = 900): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSecs;
  const payload = btoa(JSON.stringify({ sub: 'u1', email: 'admin@oms.dev', role: 'admin', iat: 0, exp }));
  return `${header}.${payload}.signature`;
}

const MOCK_TOKENS: AuthTokens = {
  accessToken: makeToken(),
  refreshToken: makeToken(604800),
  expiresIn: 900,
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should start unauthenticated when no stored tokens', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('should authenticate on successful login', fakeAsync(() => {
    let result: User | undefined;
    service.login({ email: 'admin@oms.dev', password: 'password' }).subscribe(u => (result = u));

    const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
    req.flush({ success: true, data: { user: MOCK_USER, tokens: MOCK_TOKENS } });
    tick();

    expect(result).toEqual(MOCK_USER);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()).toEqual(MOCK_USER);
    expect(service.currentRole()).toBe('admin');
  }));

  it('should set error on failed login', fakeAsync(() => {
    service.login({ email: 'x@x.com', password: 'wrong' }).subscribe({ error: () => {} });

    const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
    req.flush({ success: false, message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.error()).toBe('Invalid credentials');
  }));

  it('should report correct roles via hasRole()', fakeAsync(() => {
    service.login({ email: 'admin@oms.dev', password: 'password' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
    req.flush({ success: true, data: { user: MOCK_USER, tokens: MOCK_TOKENS } });
    tick();

    expect(service.hasRole('admin')).toBe(true);
    expect(service.hasRole('viewer')).toBe(false);
    expect(service.hasRole('admin', 'manager')).toBe(true);
  }));

  it('should clear auth state on logout', fakeAsync(() => {
    service.login({ email: 'admin@oms.dev', password: 'password' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
    req.flush({ success: true, data: { user: MOCK_USER, tokens: MOCK_TOKENS } });
    tick();

    service.logout();
    const logoutReq = httpMock.expectOne(r => r.url.includes('/auth/logout'));
    logoutReq.flush({});
    tick();

    expect(service.isAuthenticated()).toBe(false);
  }));
});
