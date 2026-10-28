export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'RESIGNED' | 'ON_LEAVE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface Employee {
  _id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: Gender;
  department: string;
  designation: string;
  joiningDate: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  supervisorId: string;
  workLocation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  employmentStatus?: string;
  supervisorId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Legal',
  'Customer Support',
] as const;

export const DESIGNATIONS = [
  'Intern',
  'Junior Engineer',
  'Engineer',
  'Senior Engineer',
  'Lead Engineer',
  'Engineering Manager',
  'Director',
  'VP',
  'Analyst',
  'Senior Analyst',
  'Associate',
  'Senior Associate',
  'Manager',
  'Senior Manager',
  'Executive',
] as const;
