'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  ArrowLeft,
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit,
  Trash2,
  MapPin,
  CalendarCheck,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Supervisor {
  _id: string;
  name: string;
  email: string;
}

interface EmployeeDetail {
  _id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  department: string;
  designation: string;
  joiningDate: string;
  employmentType: string;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'RESIGNED' | 'ON_LEAVE';
  supervisorId?: {
    _id: string;
    name: string;
    email: string;
  };
  workLocation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

interface AttendanceRecord {
  _id: string;
  attendanceDate: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  workingMinutes?: number;
  notes?: string;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance'>('overview');

  // Edit Employee State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'PREFER_NOT_TO_SAY',
    department: 'Engineering',
    designation: '',
    joiningDate: '',
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    supervisorId: '',
    workLocation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    address: '',
    notes: '',
    reason: '',
  });

  const fetchEmployeeData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [empRes, attRes, supRes] = await Promise.all([
        fetch(`/api/employees/${id}`),
        fetch(`/api/attendance?employeeId=${id}`),
        fetch('/api/supervisors'),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployee(empData.employee);
      } else {
        toast.error('Employee not found');
      }

      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData.records || []);
      }

      if (supRes.ok) {
        const supData = await supRes.json();
        setSupervisors(supData.supervisors || []);
      }
    } catch {
      toast.error('Error fetching employee details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  const handleOpenEdit = () => {
    if (!employee) return;
    setEditForm({
      fullName: employee.fullName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
      gender: employee.gender || 'PREFER_NOT_TO_SAY',
      department: employee.department || 'Engineering',
      designation: employee.designation || '',
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
      employmentType: employee.employmentType || 'FULL_TIME',
      employmentStatus: employee.employmentStatus || 'ACTIVE',
      supervisorId: employee.supervisorId?._id || '',
      workLocation: employee.workLocation || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      address: employee.address || '',
      notes: employee.notes || '',
      reason: 'Admin updated employee record',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update employee');
        return;
      }

      toast.success('Employee updated successfully!');
      setIsEditOpen(false);
      fetchEmployeeData();
    } catch {
      toast.error('Error saving changes');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTerminateEmployee = async () => {
    if (!confirm('Are you sure you want to terminate this employee?')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Employee status changed to TERMINATED');
        fetchEmployeeData();
      } else {
        toast.error('Failed to terminate employee');
      }
    } catch {
      toast.error('Error terminating employee');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-400">
        Loading employee profile...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex-1 p-12 text-center text-slate-500">
        Employee record not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`${employee.fullName} (${employee.employeeCode})`}
        description={`${employee.designation} • ${employee.department}`}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
          <button
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20"
          >
            <Edit className="size-3.5" />
            Edit Employee
          </button>
          {employee.employmentStatus !== 'TERMINATED' && (
            <button
              onClick={handleTerminateEmployee}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Terminate
            </button>
          )}
        </div>
      </Header>

      <div className="p-8 space-y-6 max-w-6xl">
        {/* Profile Card Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {employee.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{employee.fullName}</h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {employee.employeeCode}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    employee.employmentStatus === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : employee.employmentStatus === 'ON_LEAVE'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {employee.employmentStatus}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Building className="size-3.5 text-slate-400" />
                  {employee.department}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5 text-slate-400" />
                  {employee.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5 text-slate-400" />
                  {employee.phone}
                </span>
                {employee.workLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-slate-400" />
                    {employee.workLocation}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="size-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Shield className="size-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Supervisor
              </div>
              <div className="text-xs font-bold text-slate-900">
                {employee.supervisorId?.name || 'Unassigned'}
              </div>
              <div className="text-[11px] text-slate-500">{employee.supervisorId?.email || ''}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="size-4" />
            Employee Details
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="size-4" />
            Attendance History ({attendance.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Employment Details</h3>
                <button
                  onClick={handleOpenEdit}
                  className="text-xs text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Edit className="size-3" /> Edit
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Designation</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{employee.designation}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Department</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{employee.department}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Employment Type</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{employee.employmentType}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Date of Joining</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {new Date(employee.joiningDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Work Location</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{employee.workLocation || 'HQ'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Status</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{employee.employmentStatus}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Personal & Emergency Contact</h3>
                <button
                  onClick={handleOpenEdit}
                  className="text-xs text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Edit className="size-3" /> Edit
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Date of Birth</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Gender</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{employee.gender || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Emergency Contact</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {employee.emergencyContactName || 'None listed'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Emergency Phone</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {employee.emergencyContactPhone || 'None listed'}
                  </dd>
                </div>
                {employee.address && (
                  <div className="col-span-2">
                    <dt className="text-slate-400 font-medium">Residential Address</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">{employee.address}</dd>
                  </div>
                )}
              </dl>
              {employee.notes && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <div className="text-slate-400 font-medium">Internal Notes:</div>
                  <div className="text-slate-700 mt-1">{employee.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Attendance History */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Historical Attendance Log
              </h3>
              <Link
                href="/admin/attendance"
                className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Mark Attendance
              </Link>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Check In</th>
                  <th className="py-2.5 px-4">Check Out</th>
                  <th className="py-2.5 px-4">Hours</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No attendance records for this employee yet.
                    </td>
                  </tr>
                ) : (
                  attendance.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {new Date(rec.attendanceDate).toISOString().split('T')[0]}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'HALF_DAY'
                              ? 'bg-amber-100 text-amber-800'
                              : rec.status === 'LEAVE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{rec.checkIn || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{rec.checkOut || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {rec.workingMinutes ? `${(rec.workingMinutes / 60).toFixed(1)} hrs` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 italic">{rec.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Employee Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="size-4 text-blue-600" />
                Edit Employee Record ({employee.employeeCode})
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
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
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Supervisor</label>
                  <select
                    required
                    value={editForm.supervisorId}
                    onChange={(e) => setEditForm({ ...editForm, supervisorId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Supervisor</option>
                    {supervisors.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={editForm.employmentType}
                    onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                  <select
                    value={editForm.employmentStatus}
                    onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="RESIGNED">RESIGNED</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Location</label>
                  <input
                    type="text"
                    value={editForm.workLocation}
                    onChange={(e) => setEditForm({ ...editForm, workLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={editForm.emergencyContactPhone}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Change</label>
                  <input
                    type="text"
                    value={editForm.reason}
                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    placeholder="e.g. Promotion, role reassignment, or details correction"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Employee Details'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
