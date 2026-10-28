export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF';

export interface Attendance {
  _id: string;
  employeeId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  workingMinutes?: number;
  markedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceFilters {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  supervisorId?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export interface Onboarding {
  _id: string;
  employeeId: string;
  status: OnboardingStatus;
  createdBy: string;
  assignedSupervisorId: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_DELETED'
  | 'EMPLOYEE_ARCHIVED'
  | 'ATTENDANCE_CREATED'
  | 'ATTENDANCE_UPDATED'
  | 'ATTENDANCE_CORRECTED'
  | 'SUPERVISOR_CREATED'
  | 'SUPERVISOR_UPDATED'
  | 'SUPERVISOR_DEACTIVATED'
  | 'SUPERVISOR_REACTIVATED'
  | 'EMPLOYEE_REASSIGNED'
  | 'ONBOARDING_CREATED'
  | 'ONBOARDING_UPDATED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PASSWORD_RESET';

export type AuditEntityType = 'EMPLOYEE' | 'ATTENDANCE' | 'ONBOARDING' | 'USER';

export interface AuditLog {
  _id: string;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  requestId?: string;
  createdAt: string;
}
