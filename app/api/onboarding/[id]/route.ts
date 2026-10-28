import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Onboarding from '@/models/Onboarding';
import { updateOnboardingSchema } from '@/lib/validations/schemas';
import { apiError, apiResponse } from '@/lib/utils/helpers';
import { createAuditLog } from '@/lib/services/audit';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const { id } = await props.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid onboarding ID', 400);
    }

    const body = await request.json();
    const validated = updateOnboardingSchema.safeParse(body);
    if (!validated.success) {
      return apiError('Validation failed', 400, validated.error.flatten().fieldErrors);
    }

    await connectDB();

    const onboarding = await Onboarding.findById(id);
    if (!onboarding) {
      return apiError('Onboarding record not found', 404);
    }

    // Role check: Admin or assigned supervisor
    if (
      session.user.role === 'SUPERVISOR' &&
      onboarding.assignedSupervisorId.toString() !== session.user.id
    ) {
      return apiError('Forbidden: Not assigned to this employee onboarding', 403);
    }

    const beforeState = onboarding.toJSON();

    onboarding.status = validated.data.status;
    if (validated.data.notes !== undefined) {
      onboarding.notes = validated.data.notes;
    }
    if (validated.data.status === 'COMPLETED') {
      onboarding.completedAt = new Date();
    }

    onboarding.statusHistory.push({
      status: validated.data.status,
      changedBy: new mongoose.Types.ObjectId(session.user.id),
      changedAt: new Date(),
      reason: validated.data.reason || 'Status updated',
    });

    await onboarding.save();

    await createAuditLog({
      actor: session.user,
      action: 'UPDATE_ONBOARDING',
      entityType: 'ONBOARDING',
      entityId: id,
      before: beforeState,
      after: onboarding.toJSON(),
      reason: validated.data.reason || `Onboarding status set to ${validated.data.status}`,
    });

    return apiResponse(onboarding);
  } catch (error) {
    console.error('Failed to update onboarding:', error);
    return apiError('Internal server error', 500);
  }
}
