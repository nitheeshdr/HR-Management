import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import { createSupervisorSchema } from '@/lib/validations/schemas';
import { hashPassword } from '@/lib/auth';
import { apiError, apiResponse } from '@/lib/utils/helpers';
import { createAuditLog } from '@/lib/services/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden: Admin access required', 403);
    }

    await connectDB();

    const supervisors = await User.find({ role: 'SUPERVISOR' })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    // Get assigned employee counts for each supervisor
    const supervisorIds = supervisors.map((s) => s._id);
    const counts = await Employee.aggregate([
      { $match: { supervisorId: { $in: supervisorIds } } },
      { $group: { _id: '$supervisorId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const result = supervisors.map((s) => ({
      ...s,
      assignedCount: countMap.get(s._id.toString()) || 0,
    }));

    return apiResponse({ supervisors: result });
  } catch (error) {
    console.error('Failed to get supervisors:', error);
    return apiError('Internal server error', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden: Admin access required', 403);
    }

    const body = await request.json();
    const validated = createSupervisorSchema.safeParse(body);

    if (!validated.success) {
      return apiError('Validation failed', 400, validated.error.flatten().fieldErrors);
    }

    await connectDB();

    // Check if email exists
    const existing = await User.findOne({ email: validated.data.email.toLowerCase() }).lean();
    if (existing) {
      return apiError('A user with this email address already exists', 409);
    }

    const passwordHash = await hashPassword(validated.data.password);

    const supervisor = await User.create({
      name: validated.data.name,
      email: validated.data.email.toLowerCase(),
      passwordHash,
      role: 'SUPERVISOR',
      isActive: true,
    });

    await createAuditLog({
      actor: session.user,
      action: 'CREATE_SUPERVISOR',
      entityType: 'USER',
      entityId: supervisor._id.toString(),
      after: {
        name: supervisor.name,
        email: supervisor.email,
        role: supervisor.role,
      },
      reason: 'Admin provisioned new supervisor',
    });

    return apiResponse(
      {
        _id: supervisor._id,
        name: supervisor.name,
        email: supervisor.email,
        role: supervisor.role,
        isActive: supervisor.isActive,
        createdAt: supervisor.createdAt,
      },
      201
    );
  } catch (error) {
    console.error('Failed to create supervisor:', error);
    return apiError('Internal server error', 500);
  }
}
