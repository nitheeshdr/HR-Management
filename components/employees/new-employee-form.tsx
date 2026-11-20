'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ArrowLeft, UserPlus, Loader2, Building, User, Phone } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  EmployeeFormDetailsFields,
  emptyEmployeeFormDetails,
  employeeFormDetailsToPayload,
  downloadEmployeeForm,
  type EmployeeFormDetails,
} from '@/components/employees/employee-form-details';

interface Supervisor {
  _id: string;
  name: string;
  email: string;
}

interface NewEmployeeFormProps {
  role: 'ADMIN' | 'SUPERVISOR';
}

/**
 * Employee registration form shared by Admin and Supervisor portals.
 * Captures every field of the AKASHGANGA Employee Details Form and, once the employee is
 * saved, downloads the filled PDF automatically.
 */
export function NewEmployeeForm({ role }: NewEmployeeFormProps) {
  const router = useRouter();
  const isAdmin = role === 'ADMIN';
  const basePath = isAdmin ? '/admin/employees' : '/supervisor/employees';
  const [details, setDetails] = useState<EmployeeFormDetails>(emptyEmployeeFormDetails);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'PREFER_NOT_TO_SAY',
    department: 'Engineering',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    supervisorId: '',
    workLocation: '',
    emergencyContactName: '',
    notes: '',
  });

  useEffect(() => {
    // Supervisors always add employees to their own team, so they don't pick one
    if (!isAdmin) return;
    async function fetchSupervisors() {
      try {
        const res = await fetch('/api/supervisors');
        if (res.ok) {
          const data = await res.json();
          setSupervisors(data.supervisors || []);
          if (data.supervisors?.length > 0) {
            setFormData((prev) => ({ ...prev, supervisorId: data.supervisors[0]._id }));
          }
        }
      } catch (err) {
        console.error('Failed to load supervisors:', err);
      }
    }
    fetchSupervisors();
  }, [isAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ...employeeFormDetailsToPayload(details) }),
      });

      const result = await res.json();

      if (!res.ok) {
        const fieldErrors = result.errors
          ? Object.entries(result.errors as Record<string, string[]>)
              .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
              .join(' • ')
          : '';
        toast.error(fieldErrors ? `${result.error}: ${fieldErrors}` : result.error || 'Failed to create employee');
        return;
      }

      toast.success(`Employee ${result.fullName} (${result.employeeCode}) created successfully!`);

      try {
        await downloadEmployeeForm(result._id);
        toast.success('Employee Details Form PDF downloaded');
      } catch (err) {
        toast.error(
          `${err instanceof Error ? err.message : 'PDF download failed'} — you can download it from the employee profile.`
        );
      }

      router.push(`${basePath}/${result._id}`);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Onboard New Employee"
        description={
          isAdmin
            ? 'Fill the Employee Details Form — the filled PDF downloads after saving'
            : 'Add an employee to your team — the filled Employee Details Form PDF downloads after saving'
        }
      >
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="size-3.5" />
          Back to Directory
        </Link>
      </Header>

      <div className="p-3 sm:p-6 lg:p-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="size-4 text-blue-600" />
              Personal & Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="As per Aadhar card"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  name="gender"
                  required
                  value={formData.gender === 'PREFER_NOT_TO_SAY' ? '' : formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Location
                </label>
                <input
                  type="text"
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleChange}
                  placeholder="Site / client location"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Employment Details */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="size-4 text-blue-600" />
              Employment & Role Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  name="department"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Position Desired / Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="designation"
                  required
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Security Guard, Housekeeping, Driver"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Joining <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  required
                  value={formData.joiningDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employment Type <span className="text-rose-500">*</span>
                </label>
                <select
                  name="employmentType"
                  required
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              {isAdmin && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reporting Supervisor <span className="text-rose-500">*</span>
                </label>
                <select
                  name="supervisorId"
                  required
                  value={formData.supervisorId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a Supervisor</option>
                  {supervisors.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supervisors can mark daily attendance and manage onboarding steps for assigned employees.
                </p>
              </div>
              )}
            </div>
          </div>

          <EmployeeFormDetailsFields value={details} onChange={setDetails} />

          {/* Remarks */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Phone className="size-4 text-blue-600" />
              Emergency Contact &amp; Remarks
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Primary contact name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Onboarding Instructions
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any specific requirements or onboarding remarks..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href={basePath}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs shadow-blue-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  Save &amp; Download Form PDF
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
