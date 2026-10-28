import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { apiError, apiResponse } from '@/lib/utils/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (session.user.role === 'ADMIN') {
      // 1. Employee counts
      const [totalEmployees, activeEmployees, totalSupervisors] =
        await Promise.all([
          Employee.countDocuments(),
          Employee.countDocuments({ employmentStatus: 'ACTIVE' }),
          User.countDocuments({ role: 'SUPERVISOR', isActive: true }),
        ]);

      // 2. Today's attendance breakdown
      const todayAttendance = await Attendance.find({
        attendanceDate: { $gte: today, $lt: tomorrow },
      }).lean();

      const presentToday = todayAttendance.filter(
        (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
      ).length;
      const leaveToday = todayAttendance.filter((a) => a.status === 'LEAVE').length;
      const absentToday = todayAttendance.filter((a) => a.status === 'ABSENT').length;

      // 3. Department breakdown
      const deptBreakdown = await Employee.aggregate([
        { $match: { employmentStatus: 'ACTIVE' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $project: { name: '$_id', value: '$count', _id: 0 } },
      ]);

      // 4. Last 7 days attendance trend
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const pastWeekAttendance = await Attendance.aggregate([
        { $match: { attendanceDate: { $gte: sevenDaysAgo, $lt: tomorrow } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$attendanceDate' },
            },
            present: {
              $sum: {
                $cond: [{ $in: ['$status', ['PRESENT', 'HALF_DAY']] }, 1, 0],
              },
            },
            absent: {
              $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] },
            },
            leave: {
              $sum: { $cond: [{ $eq: ['$status', 'LEAVE'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return apiResponse({
        role: 'ADMIN',
        kpi: {
          totalEmployees,
          activeEmployees,
          presentToday,
          leaveToday,
          absentToday,
          totalSupervisors,
        },
        departmentDistribution: deptBreakdown,
        weeklyTrend: pastWeekAttendance.map((item) => ({
          date: item._id.slice(5), // MM-DD
          present: item.present,
          absent: item.absent,
          leave: item.leave,
        })),
      });
    } else {
      // SUPERVISOR DASHBOARD
      const supervisedEmployees = await Employee.find({ supervisorId: session.user.id })
        .select('_id department')
        .lean();
      const myEmployeeIds = supervisedEmployees.map((e) => e._id);

      const totalMyEmployees = myEmployeeIds.length;

      const todayAttendance = await Attendance.find({
        employeeId: { $in: myEmployeeIds },
        attendanceDate: { $gte: today, $lt: tomorrow },
      }).lean();

      const markedEmployeeIds = new Set(todayAttendance.map((a) => a.employeeId.toString()));
      const pendingMarkingCount = Math.max(0, totalMyEmployees - markedEmployeeIds.size);

      const presentToday = todayAttendance.filter(
        (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
      ).length;
      const leaveToday = todayAttendance.filter((a) => a.status === 'LEAVE').length;
      const absentToday = todayAttendance.filter((a) => a.status === 'ABSENT').length;

      return apiResponse({
        role: 'SUPERVISOR',
        kpi: {
          assignedEmployees: totalMyEmployees,
          presentToday,
          leaveToday,
          absentToday,
          pendingMarkingCount,
        },
      });
    }
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return apiError('Internal server error', 500);
  }
}
