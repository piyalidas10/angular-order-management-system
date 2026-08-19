export type UserRole = 'admin' | 'manager' | 'viewer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  lastLogin?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
