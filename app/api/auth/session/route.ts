import { getSession } from '@/lib/auth';
import { apiResponse } from '@/lib/utils/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ user: null }, { status: 200 });
  }

  return apiResponse({
    user: session.user,
    expiresAt: session.expiresAt,
  });
}
