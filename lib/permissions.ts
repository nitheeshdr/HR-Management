import type { UserRole } from '@/types/auth';
import connectDB from './mongodb';
import Employee from '@/models/Employee';
import mongoose from 'mongoose';

/**
 * Permission checks — centralized so both UI and API use the same rules.
 */

// --- Role Checks ---

export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function isSupervisor(role: UserRole): boolean {
  return role === 'SUPERVISOR';
}

// --- Employee Permissions ---

export function canCreateEmployee(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPERVISOR';
}

export function canEditEmployee(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canDeleteEmployee(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canViewAllEmployees(role: UserRole): boolean {
  return role === 'ADMIN';
}

// --- Supervisor Permissions ---

export function canManageSupervisors(role: UserRole): boolean {
  return role === 'ADMIN';
}

// --- Attendance Permissions ---

export function canViewAllAttendance(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canCorrectAttendance(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canMarkAttendance(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPERVISOR';
}

// --- Audit Log Permissions ---

export function canViewAuditLogs(role: UserRole): boolean {
  return role === 'ADMIN';
}

// --- Report Permissions ---

export function canViewAllReports(role: UserRole): boolean {
  return role === 'ADMIN';
}

// --- Settings Permissions ---

export function canManageSettings(role: UserRole): boolean {
  return role === 'ADMIN';
}

// --- Scope Helpers ---

/**
 * Returns a MongoDB filter that restricts employee queries to the supervisor's authorized scope.
 * Admin gets no filter (sees all). Supervisor sees only their assigned employees.
 */
export function getEmployeeScopeFilter(
  role: UserRole,
  userId: string
): Record<string, unknown> {
  if (role === 'ADMIN') {
    return {};
  }
  // Supervisor can see employees assigned to them or created by them
  return {
    $or: [
      { supervisorId: new mongoose.Types.ObjectId(userId) },
      { createdBy: new mongoose.Types.ObjectId(userId) },
    ],
  };
}

/**
 * Server-side check: does this supervisor have access to a specific employee?
 */
export async function canAccessEmployee(
  role: UserRole,
  userId: string,
  employeeId: string
): Promise<boolean> {
  if (role === 'ADMIN') return true;

  await connectDB();
  const employee = await Employee.findById(employeeId)
    .select('supervisorId createdBy')
    .lean();

  if (!employee) return false;

  const uid = userId;
  return (
    employee.supervisorId.toString() === uid ||
    employee.createdBy.toString() === uid
  );
}

/**
 * Get the employee IDs that a supervisor can access.
 */
export async function getAuthorizedEmployeeIds(
  role: UserRole,
  userId: string
): Promise<string[] | null> {
  if (role === 'ADMIN') return null; // null means "all employees"

  await connectDB();
  const employees = await Employee.find({
    $or: [
      { supervisorId: new mongoose.Types.ObjectId(userId) },
      { createdBy: new mongoose.Types.ObjectId(userId) },
    ],
  })
    .select('_id')
    .lean();

  return employees.map((e) => e._id.toString());
}
