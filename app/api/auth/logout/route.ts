import { destroySession, getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/services/audit';
import { apiError, apiResponse } from '@/lib/utils/helpers';

export async function POST() {
  try {
    const session = await getSession();

    if (session) {
      await createAuditLog({
        actor: session.user,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: session.user.id,
      });
    }

    await destroySession();

    return apiResponse({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return apiError('An error occurred during logout', 500);
  }
}
