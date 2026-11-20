import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import { correctAttendanceSchema } from '@/lib/validations/schemas';
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
      return apiError('Invalid attendance ID', 400);
    }

    const body = await request.json();
    const validated = correctAttendanceSchema.safeParse(body);
    if (!validated.success) {
      return apiError('Validation failed', 400, validated.error.flatten().fieldErrors);
    }

    await connectDB();

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return apiError('Attendance record not found', 404);
    }

    // Supervisors can edit attendance only once a day (via the daily submission), so
    // after-the-fact corrections are reserved for admins.
    if (session.user.role !== 'ADMIN') {
      return apiError(
        'Forbidden: Supervisors can edit attendance only once a day. Contact an admin for corrections.',
        403
      );
    }

    const beforeState = attendance.toJSON();

    if (validated.data.status) {
      attendance.status = validated.data.status;
    }
    if (validated.data.checkIn !== undefined) {
      attendance.checkIn = validated.data.checkIn || undefined;
    }
    if (validated.data.checkOut !== undefined) {
      attendance.checkOut = validated.data.checkOut || undefined;
    }

    if (attendance.checkIn && attendance.checkOut) {
      const [inH, inM] = attendance.checkIn.split(':').map(Number);
      const [outH, outM] = attendance.checkOut.split(':').map(Number);
      attendance.workingMinutes = Math.max(0, outH * 60 + outM - (inH * 60 + inM));
    } else {
      attendance.workingMinutes = undefined;
    }

    await attendance.save();

    await createAuditLog({
      actor: session.user,
      action: 'CORRECT_ATTENDANCE',
      entityType: 'ATTENDANCE',
      entityId: id,
      before: beforeState,
      after: attendance.toJSON(),
      reason: validated.data.reason,
    });

    return apiResponse(attendance);
  } catch (error) {
    console.error('Failed to correct attendance:', error);
    return apiError('Internal server error', 500);
  }
}
