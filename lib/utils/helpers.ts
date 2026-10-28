import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';

/**
 * Generates a unique employee code in the format: EMP-XXXX
 * Auto-increments based on the highest existing code.
 */
export async function generateEmployeeCode(): Promise<string> {
  await connectDB();

  const lastEmployee = await Employee.findOne({})
    .sort({ employeeCode: -1 })
    .select('employeeCode')
    .lean();

  let nextNumber = 1;

  if (lastEmployee?.employeeCode) {
    const match = lastEmployee.employeeCode.match(/EMP-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const code = `EMP-${String(nextNumber).padStart(4, '0')}`;

  // Verify uniqueness (race condition protection)
  const exists = await Employee.findOne({ employeeCode: code }).lean();
  if (exists) {
    // Retry with next number
    return `EMP-${String(nextNumber + 1).padStart(4, '0')}`;
  }

  return code;
}

/**
 * Formats a date to business timezone date string (YYYY-MM-DD)
 */
export function toBusinessDate(date: Date): string {
  const tz = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
  return date.toLocaleDateString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD
}

/**
 * Parses a date (string YYYY-MM-DD or Date object) into a Date object representing UTC midnight
 * guaranteed to align with the business timezone.
 */
export function parseDateToUtcMidnight(dateInput: string | Date): Date {
  const tz = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
  let dateStr: string;
  if (dateInput instanceof Date) {
    dateStr = dateInput.toLocaleDateString('en-CA', { timeZone: tz });
  } else if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      dateStr = new Date(dateInput).toLocaleDateString('en-CA', { timeZone: tz });
    } else {
      dateStr = dateInput;
    }
  } else {
    dateStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/**
 * Gets today's date in business timezone
 */
export function getBusinessToday(): string {
  return toBusinessDate(new Date());
}

/**
 * Standard API response helper
 */
export function apiResponse(
  data: unknown,
  status: number = 200
): Response {
  return Response.json(data, { status });
}

export function apiError(
  message: string,
  status: number = 400,
  errors?: Record<string, string[]>
): Response {
  return Response.json(
    { error: message, ...(errors && { errors }) },
    { status }
  );
}
