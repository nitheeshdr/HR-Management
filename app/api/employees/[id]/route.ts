import { getSession } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import { updateEmployeeSchema } from '@/lib/validations/schemas';
import { apiError, apiResponse } from '@/lib/utils/helpers';
import { createAuditLog } from '@/lib/services/audit';
import mongoose from 'mongoose';

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

    const { id } = await props.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid employee ID', 400);
    }

    await connectDB();

    const employee = await Employee.findById(id)
      .populate('supervisorId', 'name email role')
      .populate('createdBy', 'name email')
      .lean();

    if (!employee) {
      return apiError('Employee not found', 404);
    }

    // Role-based check: Supervisors can only view assigned employees
    if (
      session.user.role === 'SUPERVISOR' &&
      employee.supervisorId?._id?.toString() !== session.user.id
    ) {
      return apiError('Forbidden: You are not assigned to this employee', 403);
    }

    return apiResponse({ employee });
  } catch (error) {
    console.error('Failed to get employee:', error);
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

    // Only Admin can modify employee profiles
    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden: Only Admins can modify employee records', 403);
    }

    const { id } = await props.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid employee ID', 400);
    }

    const body = await request.json();
    const validatedData = updateEmployeeSchema.safeParse(body);

    if (!validatedData.success) {
      return apiError('Validation failed', 400, validatedData.error.flatten().fieldErrors as any);
    }

    await connectDB();

    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      return apiError('Employee not found', 404);
    }

    const beforeState = existingEmployee.toJSON();

    const updatePayload: Record<string, unknown> = { ...validatedData.data };
    delete updatePayload.reason;

    if (validatedData.data.dateOfBirth) {
      updatePayload.dateOfBirth = new Date(validatedData.data.dateOfBirth);
    }
    if (validatedData.data.joiningDate) {
      updatePayload.joiningDate = new Date(validatedData.data.joiningDate);
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate('supervisorId', 'name email role')
      .lean();

    // Audit log
    await createAuditLog({
      actor: session.user,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      before: beforeState,
      after: updatedEmployee as any,
      reason: validatedData.data.reason || 'Admin updated employee information',
    });

    return apiResponse(updatedEmployee);
  } catch (error) {
    console.error('Failed to update employee:', error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden: Only Admins can terminate/delete employees', 403);
    }

    const { id } = await props.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid employee ID', 400);
    }

    await connectDB();

    const employee = await Employee.findById(id);
    if (!employee) {
      return apiError('Employee not found', 404);
    }

    const beforeState = employee.toJSON();

    // Soft delete / terminate employment status
    employee.employmentStatus = 'TERMINATED';
    await employee.save();

    await createAuditLog({
      actor: session.user,
      action: 'TERMINATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      before: beforeState,
      after: employee.toJSON(),
      reason: 'Employee terminated by admin',
    });

    return apiResponse({ message: 'Employee terminated successfully' });
  } catch (error) {
    console.error('Failed to delete employee:', error);
    return apiError('Internal server error', 500);
  }
}
