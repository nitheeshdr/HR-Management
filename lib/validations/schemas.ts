import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const createEmployeeSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(150).trim(),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  phone: z.string().min(5, 'Phone number is required').max(20).trim(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  department: z.string().min(1, 'Department is required').trim(),
  designation: z.string().min(1, 'Designation is required').trim(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'RESIGNED', 'ON_LEAVE']).default('ACTIVE'),
  supervisorId: z.string().min(1, 'Supervisor is required'),
  workLocation: z.string().max(200).trim().optional(),
  emergencyContactName: z.string().max(100).trim().optional(),
  emergencyContactPhone: z.string().max(20).trim().optional(),
  address: z.string().max(500).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  reason: z.string().min(1, 'Reason for update is required').max(500).optional(),
});

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  attendanceDate: z.string().min(1, 'Attendance date is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKLY_OFF']),
  checkIn: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Check-in must be in HH:mm format')
    .optional()
    .or(z.literal('')),
  checkOut: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Check-out must be in HH:mm format')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(500).trim().optional(),
  lock: z.boolean().optional(),
  unlock: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.checkIn && data.checkOut) {
      return data.checkOut > data.checkIn;
    }
    return true;
  },
  {
    message: 'Check-out time must be after check-in time',
    path: ['checkOut'],
  }
);

export const bulkAttendanceSchema = z.object({
  attendanceDate: z.string().min(1, 'Attendance date is required'),
  lock: z.boolean().optional(),
  unlock: z.boolean().optional(),
  entries: z.array(
    z.object({
      employeeId: z.string().min(1),
      status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKLY_OFF']),
      checkIn: z.string().optional().or(z.literal('')),
      checkOut: z.string().optional().or(z.literal('')),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one attendance entry is required'),
});

export const correctAttendanceSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKLY_OFF']).optional(),
  checkIn: z.string().optional().or(z.literal('')),
  checkOut: z.string().optional().or(z.literal('')),
  reason: z.string().min(1, 'Reason for correction is required').max(500),
});

export const createSupervisorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const updateSupervisorSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

export const updateOnboardingSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']),
  notes: z.string().max(1000).trim().optional(),
  reason: z.string().max(500).trim().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;
export type CreateSupervisorInput = z.infer<typeof createSupervisorSchema>;
export type UpdateSupervisorInput = z.infer<typeof updateSupervisorSchema>;
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;
