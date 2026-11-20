import mongoose from 'mongoose';
import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import { apiError } from '@/lib/utils/helpers';
import { generateEmployeeFormPdf } from '@/lib/pdf/employee-form';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/employees/:id/form-pdf
 * Returns the filled "AKASHGANGA Employee Details Form" PDF for an employee.
 * Admins can download any employee's form; supervisors only their assigned employees.
 */
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const { id } = await props.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid employee ID', 400);
    }

    await connectDB();
    const employee = await Employee.findById(id).lean();
    if (!employee) {
      return apiError('Employee not found', 404);
    }

    if (
      session.user.role === 'SUPERVISOR' &&
      employee.supervisorId?.toString() !== session.user.id
    ) {
      return apiError('Forbidden: You are not assigned to this employee', 403);
    }

    const pdfBytes = await generateEmployeeFormPdf(employee);

    const safeName = employee.fullName.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const filename = `${employee.employeeCode}_${safeName || 'Employee'}_Details_Form.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Failed to generate employee form PDF:', error);
    return apiError('Failed to generate employee form PDF', 500);
  }
}
