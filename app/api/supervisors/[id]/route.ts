import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { updateSupervisorSchema } from '@/lib/validations/schemas';
import { hashPassword } from '@/lib/auth';
import { apiError, apiResponse } from '@/lib/utils/helpers';
import { createAuditLog } from '@/lib/services/audit';
import mongoose from 'mongoose';

import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden: Admin access required', 403);
    }

    const { id } = await props.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid supervisor ID', 400);
    }

    await connectDB();

    const supervisor = await User.findById(id).select('-passwordHash').lean();
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      return apiError('Supervisor not found', 404);
    }

    const employees = await Employee.find({ supervisorId: id })
      .sort({ fullName: 1 })
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const empIds = employees.map((e) => e._id);
    const todayAttendance = await Attendance.find({
      employeeId: { $in: empIds },
      attendanceDate: { $gte: today, $lt: tomorrow },
    }).lean();

    const attendanceMap: Record<string, any> = {};
    todayAttendance.forEach((att) => {
      attendanceMap[att.employeeId.toString()] = att;
    });

    const employeesWithTodayStatus = employees.map((emp) => ({
      ...emp,
      todayAttendance: attendanceMap[emp._id.toString()] || null,
    }));

    return apiResponse({
      supervisor,
      employees: employeesWithTodayStatus,
      totalAssigned: employees.length,
      presentToday: todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length,
      leaveToday: todayAttendance.filter((a) => a.status === 'LEAVE').length,
      absentToday: todayAttendance.filter((a) => a.status === 'ABSENT').length,
    });
  } catch (error) {
    console.error('Failed to get supervisor details:', error);
    return apiError('Internal server error', 500);
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden: Admin access required', 403);
    }

    const { id } = await props.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid supervisor ID', 400);
    }

    const body = await request.json();
    const validated = updateSupervisorSchema.safeParse(body);
    if (!validated.success) {
      return apiError('Validation failed', 400, validated.error.flatten().fieldErrors);
    }

    await connectDB();

    const supervisor = await User.findById(id);
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      return apiError('Supervisor not found', 404);
    }

    const beforeState = supervisor.toJSON();

    if (validated.data.name) supervisor.name = validated.data.name;
    if (validated.data.email) supervisor.email = validated.data.email.toLowerCase();
    if (validated.data.isActive !== undefined) supervisor.isActive = validated.data.isActive;
    if (validated.data.password) {
      supervisor.passwordHash = await hashPassword(validated.data.password);
    }

    await supervisor.save();

    await createAuditLog({
      actor: session.user,
      action: 'UPDATE_SUPERVISOR',
      entityType: 'USER',
      entityId: id,
      before: beforeState,
      after: supervisor.toJSON(),
      reason: validated.data.reason || 'Admin updated supervisor record',
    });

    return apiResponse(supervisor);
  } catch (error) {
    console.error('Failed to update supervisor:', error);
    return apiError('Internal server error', 500);
  }
}
