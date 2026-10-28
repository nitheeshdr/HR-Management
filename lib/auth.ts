import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import connectDB from './mongodb';
import User from '@/models/User';
import type { SessionUser, Session } from '@/types/auth';

const SESSION_COOKIE_NAME = 'hrms_session';
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION || '28800', 10); // 8 hours default
const SALT_ROUNDS = 12;

// In-memory session store. For production, use Redis or a database-backed store.
// This is acceptable for a single-instance deployment.
interface SessionData {
  user: SessionUser;
  expiresAt: Date;
  createdAt: Date;
}

declare global {
  // eslint-disable-next-line no-var
  var sessionStore: Map<string, SessionData> | undefined;
}

const sessionStore = global.sessionStore ?? new Map<string, SessionData>();
if (!global.sessionStore) {
  global.sessionStore = sessionStore;
}

// --- Password Hashing ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- Session Management ---

export async function createSession(user: SessionUser): Promise<string> {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  sessionStore.set(sessionId, {
    user,
    expiresAt,
    createdAt: new Date(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });

  return sessionId;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  const sessionData = sessionStore.get(sessionCookie.value);

  if (!sessionData) {
    return null;
  }

  // Check expiration
  if (sessionData.expiresAt < new Date()) {
    sessionStore.delete(sessionCookie.value);
    return null;
  }

  // Verify user is still active in database
  await connectDB();
  const dbUser = await User.findById(sessionData.user.id).select('isActive').lean();
  if (!dbUser || !dbUser.isActive) {
    sessionStore.delete(sessionCookie.value);
    return null;
  }

  return {
    user: sessionData.user,
    expiresAt: sessionData.expiresAt,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    sessionStore.delete(sessionCookie.value);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Invalidate all sessions for a given user (e.g., when deactivated)
export function invalidateUserSessions(userId: string): void {
  for (const [key, data] of sessionStore.entries()) {
    if (data.user.id === userId) {
      sessionStore.delete(key);
    }
  }
}

// --- Authentication ---

export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+passwordHash')
    .lean();

  if (!user) {
    // Constant-time comparison to prevent timing attacks
    await bcrypt.hash('dummy-password', SALT_ROUNDS);
    return null;
  }

  if (!user.isActive) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// --- Rate Limiting (simple in-memory) ---

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

declare global {
  // eslint-disable-next-line no-var
  var rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = global.rateLimitStore ?? new Map<string, RateLimitEntry>();
if (!global.rateLimitStore) {
  global.rateLimitStore = rateLimitStore;
}

const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterMs?: number } {
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < new Date()) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW),
    });
    return { allowed: true };
  }

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt.getTime() - Date.now(),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// --- Route-level auth helper for API routes ---

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new AuthError('Unauthorized', 401);
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'ADMIN') {
    throw new AuthError('Forbidden: Admin access required', 403);
  }
  return session;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}
