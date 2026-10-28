import { authenticateUser, createSession, checkRateLimit, resetRateLimit } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/schemas';
import { createAuditLog } from '@/lib/services/audit';
import { apiError, apiResponse } from '@/lib/utils/helpers';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid credentials', 400, 
        parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { email, password } = parsed.data;

    // Rate limiting by IP
    const headerStore = await headers();
    const ip = headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || 'unknown';
    const rateLimitKey = `login:${ip}:${email}`;
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.retryAfterMs || 0) / 1000);
      return apiError(
        `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        429
      );
    }

    // Authenticate
    const user = await authenticateUser(email, password);
    if (!user) {
      return apiError('Invalid email or password', 401);
    }

    // Create session
    await createSession(user);
    resetRateLimit(rateLimitKey);

    // Audit log
    await createAuditLog({
      actor: user,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
    });

    return apiResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return apiError('An error occurred during login', 500);
  }
}
