import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import { createEmployeeSchema } from '@/lib/validations/schemas';
import { generateEmployeeCode, apiError, apiResponse } from '@/lib/utils/helpers';
import { createAuditLog } from '@/lib/services/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const supervisorId = searchParams.get('supervisorId') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    await connectDB();

    // Query filter
    const query: Record<string, unknown> = {};

    // Role-based scoping: Supervisors can only view assigned employees
    if (session.user.role === 'SUPERVISOR') {
      query.supervisorId = session.user.id;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.employmentStatus = status;
    }

    if (search.trim()) {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { employeeCode: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { designation: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .populate('supervisorId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee.countDocuments(query),
    ]);

    return apiResponse({
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    return apiError('Internal server error', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    // Only Admin can create employees
    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden: Only Admins can create employees', 403);
    }

    const body = await request.json();
    const validatedData = createEmployeeSchema.safeParse(body);

    if (!validatedData.success) {
      return apiError('Validation failed', 400, validatedData.error.flatten().fieldErrors as any);
    }

    await connectDB();

    // Check if email already in use
    const existing = await Employee.findOne({ email: validatedData.data.email }).lean();
    if (existing) {
      return apiError('An employee with this email address already exists', 409);
    }

    const employeeCode = await generateEmployeeCode();

    const employee = await Employee.create({
      ...validatedData.data,
      employeeCode,
      dateOfBirth: validatedData.data.dateOfBirth ? new Date(validatedData.data.dateOfBirth) : undefined,
      joiningDate: new Date(validatedData.data.joiningDate),
      createdBy: session.user.id,
    });

    // Audit log
    await createAuditLog({
      actor: session.user,
      action: 'CREATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: employee._id.toString(),
      after: employee.toJSON(),
      reason: 'New employee created by admin',
    });

    return apiResponse(employee, 201);
  } catch (error) {
    console.error('Failed to create employee:', error);
    return apiError('Internal server error', 500);
  }
}
