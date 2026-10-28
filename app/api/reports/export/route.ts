import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';
import { apiError } from '@/lib/utils/helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'attendance'; // 'attendance' | 'employees'

    await connectDB();

    if (type === 'employees') {
      const query: Record<string, unknown> = {};
      if (session.user.role === 'SUPERVISOR') {
        query.supervisorId = session.user.id;
      }

      const employees = await Employee.find(query)
        .populate('supervisorId', 'name email')
        .sort({ employeeCode: 1 })
        .lean();

      const headers = [
        'Employee Code',
        'Full Name',
        'Email',
        'Phone',
        'Department',
        'Designation',
        'Employment Type',
        'Status',
        'Joining Date',
        'Supervisor Name',
        'Work Location',
      ];

      const rows = employees.map((e) => [
        `"${e.employeeCode}"`,
        `"${e.fullName}"`,
        `"${e.email}"`,
        `"${e.phone}"`,
        `"${e.department}"`,
        `"${e.designation}"`,
        `"${e.employmentType}"`,
        `"${e.employmentStatus}"`,
        `"${new Date(e.joiningDate).toISOString().split('T')[0]}"`,
        `"${(e.supervisorId as { name?: string })?.name || ''}"`,
        `"${e.workLocation || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="employees-export-${Date.now()}.csv"`,
        },
      });
    } else {
      // Attendance export
      const query: Record<string, unknown> = {};
      if (session.user.role === 'SUPERVISOR') {
        const myEmps = await Employee.find({ supervisorId: session.user.id }).select('_id').lean();
        query.employeeId = { $in: myEmps.map((e) => e._id) };
      }

      const records = await Attendance.find(query)
        .populate('employeeId', 'employeeCode fullName department')
        .populate('markedBy', 'name')
        .sort({ attendanceDate: -1 })
        .lean();

      const headers = [
        'Date',
        'Employee Code',
        'Employee Name',
        'Department',
        'Status',
        'Check-In',
        'Check-Out',
        'Working Minutes',
        'Marked By',
        'Notes',
      ];

      const rows = records.map((r) => {
        const emp = r.employeeId as { employeeCode?: string; fullName?: string; department?: string } | null;
        const marker = r.markedBy as { name?: string } | null;
        return [
          `"${new Date(r.attendanceDate).toISOString().split('T')[0]}"`,
          `"${emp?.employeeCode || ''}"`,
          `"${emp?.fullName || ''}"`,
          `"${emp?.department || ''}"`,
          `"${r.status}"`,
          `"${r.checkIn || ''}"`,
          `"${r.checkOut || ''}"`,
          `"${r.workingMinutes ?? ''}"`,
          `"${marker?.name || ''}"`,
          `"${(r.notes || '').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance-export-${Date.now()}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return apiError('Internal server error', 500);
  }
}
