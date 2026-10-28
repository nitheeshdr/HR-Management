import mongoose from 'mongoose';
import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Employee from '@/models/Employee';
import { createAttendanceSchema, bulkAttendanceSchema } from '@/lib/validations/schemas';
import { apiError, apiResponse, getBusinessToday, parseDateToUtcMidnight, toBusinessDate } from '@/lib/utils/helpers';
import { createAuditLog } from '@/lib/services/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month'); // YYYY-MM
    const department = searchParams.get('department');
    const supervisorId = searchParams.get('supervisorId');

    await connectDB();

    const query: Record<string, unknown> = {};

    // Date filtering (supports single date, month, or all dates if dateParam is empty or 'ALL')
    if (dateParam && dateParam !== 'ALL') {
      const targetDate = parseDateToUtcMidnight(dateParam);
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      query.attendanceDate = { $gte: targetDate, $lt: nextDay };
    } else if (month) {
      const [year, m] = month.split('-').map(Number);
      const startOfMonth = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0));
      query.attendanceDate = { $gte: startOfMonth, $lt: endOfMonth };
    }

    // Role-based or supervisorId filtering
    if (session.user.role === 'SUPERVISOR') {
      const supervisedEmployees = await Employee.find({ supervisorId: session.user.id })
        .select('_id')
        .lean();
      const ids = supervisedEmployees.map((e) => e._id);

      if (employeeId) {
        if (!ids.some((id) => id.toString() === employeeId)) {
          return apiError('Forbidden: Employee is not assigned to you', 403);
        }
        query.employeeId = employeeId;
      } else {
        query.employeeId = { $in: ids };
      }
    } else if (session.user.role === 'ADMIN' && supervisorId) {
      const supEmployees = await Employee.find({ supervisorId }).select('_id').lean();
      const supIds = supEmployees.map((e) => e._id);
      query.employeeId = { $in: supIds };
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    // If department filter requested, query matching employees
    if (department && session.user.role === 'ADMIN') {
      const deptEmployees = await Employee.find({ department }).select('_id').lean();
      const deptIds = deptEmployees.map((e) => e._id);
      if (query.employeeId && typeof query.employeeId === 'object' && '$in' in query.employeeId) {
        const existing = (query.employeeId as { $in: unknown[] }).$in;
        query.employeeId = {
          $in: existing.filter((id) => deptIds.some((d) => d.toString() === id?.toString())),
        };
      } else {
        query.employeeId = { $in: deptIds };
      }
    }

    const records = await Attendance.find(query)
      .populate('employeeId', 'employeeCode fullName email department designation supervisorId')
      .populate('markedBy', 'name email role')
      .sort({ attendanceDate: -1, createdAt: -1 })
      .lean();

    // Standardize attendanceDate to clean YYYY-MM-DD string in business timezone
    const formattedRecords = records.map((rec: any) => {
      const d = rec.attendanceDate instanceof Date ? rec.attendanceDate : new Date(rec.attendanceDate);
      const dateStr = toBusinessDate(d);
      return {
        ...rec,
        attendanceDate: dateStr,
        dateStr,
      };
    });

    return apiResponse({ records: formattedRecords });
  } catch (error) {
    console.error('Failed to get attendance:', error);
    return apiError('Internal server error', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    await connectDB();

    // Check if bulk or single
    if (body.entries && Array.isArray(body.entries)) {
      const validated = bulkAttendanceSchema.safeParse(body);
      if (!validated.success) {
        return apiError('Validation failed', 400);
      }

      const { attendanceDate, entries, lock, unlock } = validated.data;
      const targetDate = parseDateToUtcMidnight(attendanceDate);

      // Verify permissions & block rules for supervisor
      if (session.user.role === 'SUPERVISOR') {
        const todayStr = getBusinessToday();
        const reqDateStr = attendanceDate.split('T')[0];
        if (reqDateStr !== todayStr) {
          return apiError(
            "Past and future dates are blocked for supervisors. Only today's attendance is open.",
            403
          );
        }

        const supervisedEmployees = await Employee.find({ supervisorId: session.user.id })
          .select('_id')
          .lean();
        const allowedIds = new Set(supervisedEmployees.map((e) => e._id.toString()));

        for (const entry of entries) {
          if (!allowedIds.has(entry.employeeId)) {
            return apiError(`Forbidden: Employee ${entry.employeeId} not under your supervision`, 403);
          }
        }

        // Check if already locked (covers entire 24h of the business day)
        const nextDay = new Date(targetDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const existingLocked = await Attendance.findOne({
          employeeId: { $in: supervisedEmployees.map((e) => e._id) },
          attendanceDate: { $gte: targetDate, $lt: nextDay },
          isLocked: true,
        }).lean();

        if (existingLocked) {
          return apiError(
            "Attendance for today has already been finalized and locked. You cannot edit it anymore.",
            403
          );
        }
      }

      const results = [];
      for (const entry of entries) {
        let workingMinutes: number | undefined;
        if (entry.checkIn && entry.checkOut) {
          const [inH, inM] = entry.checkIn.split(':').map(Number);
          const [outH, outM] = entry.checkOut.split(':').map(Number);
          workingMinutes = Math.max(0, outH * 60 + outM - (inH * 60 + inM));
        }

        const updateFields: Record<string, unknown> = {
          status: entry.status,
          checkIn: entry.checkIn || undefined,
          checkOut: entry.checkOut || undefined,
          workingMinutes,
          notes: entry.notes || undefined,
          markedBy: session.user.id,
        };

        if (lock) {
          updateFields.isLocked = true;
          updateFields.lockedAt = new Date();
          updateFields.lockedBy = session.user.id;
        } else if (session.user.role === 'ADMIN' && unlock) {
          updateFields.isLocked = false;
          updateFields.lockedAt = null;
          updateFields.lockedBy = null;
        }

        const empObjectId = new mongoose.Types.ObjectId(entry.employeeId);
        const upserted = await Attendance.findOneAndUpdate(
          { employeeId: empObjectId, attendanceDate: targetDate },
          { $set: updateFields },
          { upsert: true, new: true, runValidators: true }
        );
        results.push(upserted);
      }

      await createAuditLog({
        actor: session.user,
        action: lock ? 'LOCK_ATTENDANCE' : 'MARK_ATTENDANCE',
        entityType: 'ATTENDANCE',
        entityId: attendanceDate,
        after: { count: entries.length, date: attendanceDate, isLocked: !!lock },
        reason: lock ? 'Supervisor finalized and locked daily attendance' : 'Bulk attendance recorded',
      });

      return apiResponse({ message: 'Attendance records saved', count: results.length, isLocked: !!lock });
    } else {
      // Single entry
      const validated = createAttendanceSchema.safeParse(body);
      if (!validated.success) {
        return apiError('Validation failed', 400, validated.error.flatten().fieldErrors);
      }

      const { employeeId, attendanceDate, status, checkIn, checkOut, notes, lock, unlock } = validated.data;

      // Verify permissions & block rules for supervisor
      if (session.user.role === 'SUPERVISOR') {
        const todayStr = getBusinessToday();
        const reqDateStr = attendanceDate.split('T')[0];
        if (reqDateStr !== todayStr) {
          return apiError(
            "Past and future dates are blocked for supervisors. Only today's attendance is open.",
            403
          );
        }

        const emp = await Employee.findById(employeeId).lean();
        if (!emp || emp.supervisorId.toString() !== session.user.id) {
          return apiError('Forbidden: Employee is not assigned to you', 403);
        }

        const targetDateCheck = parseDateToUtcMidnight(attendanceDate);

        const nextDayCheck = new Date(targetDateCheck);
        nextDayCheck.setUTCDate(nextDayCheck.getUTCDate() + 1);

        const supervisedEmployees = await Employee.find({ supervisorId: session.user.id })
          .select('_id')
          .lean();

        const existingLocked = await Attendance.findOne({
          employeeId: { $in: supervisedEmployees.map((e) => e._id) },
          attendanceDate: { $gte: targetDateCheck, $lt: nextDayCheck },
          isLocked: true,
        }).lean();

        if (existingLocked) {
          return apiError(
            "Attendance for today has already been locked. You cannot edit it anymore.",
            403
          );
        }
      }

      const targetDate = parseDateToUtcMidnight(attendanceDate);

      let workingMinutes: number | undefined;
      if (checkIn && checkOut) {
        const [inH, inM] = checkIn.split(':').map(Number);
        const [outH, outM] = checkOut.split(':').map(Number);
        workingMinutes = Math.max(0, outH * 60 + outM - (inH * 60 + inM));
      }

      const updateFields: Record<string, unknown> = {
        status,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        workingMinutes,
        notes,
        markedBy: session.user.id,
      };

      if (lock) {
        updateFields.isLocked = true;
        updateFields.lockedAt = new Date();
        updateFields.lockedBy = session.user.id;
      } else if (session.user.role === 'ADMIN' && unlock) {
        updateFields.isLocked = false;
        updateFields.lockedAt = null;
        updateFields.lockedBy = null;
      }

      const empObjectId = new mongoose.Types.ObjectId(employeeId);
      const attendance = await Attendance.findOneAndUpdate(
        { employeeId: empObjectId, attendanceDate: targetDate },
        { $set: updateFields },
        { upsert: true, new: true, runValidators: true }
      );

      await createAuditLog({
        actor: session.user,
        action: 'MARK_ATTENDANCE',
        entityType: 'ATTENDANCE',
        entityId: attendance._id.toString(),
        after: attendance.toJSON(),
        reason: 'Daily attendance marked',
      });

      const doc = attendance.toJSON ? attendance.toJSON() : attendance;
      const dateStr = toBusinessDate(doc.attendanceDate);
      return apiResponse({ ...doc, attendanceDate: dateStr, dateStr }, 201);
    }
  } catch (error) {
    console.error('Failed to mark attendance:', error);
    return apiError('Internal server error', 500);
  }
}
