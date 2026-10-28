export type UserRole = 'ADMIN' | 'SUPERVISOR';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Session {
  user: SessionUser;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
