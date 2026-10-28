'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  UserCheck,
  CalendarCheck,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Building,
  Phone,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface AssignedEmployee {
  _id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  employmentType: string;
  employmentStatus: string;
  todayAttendance?: {
    status: string;
    checkIn?: string;
    checkOut?: string;
  } | null;
}

interface SupervisorDetail {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function SupervisorDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [supervisor, setSupervisor] = useState<SupervisorDetail | null>(null);
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    presentToday: 0,
    leaveToday: 0,
    absentToday: 0,
  });

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
  });

  const fetchSupervisorData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/supervisors/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSupervisor(data.supervisor);
        setEmployees(data.employees || []);
        setStats({
          totalAssigned: data.totalAssigned || 0,
          presentToday: data.presentToday || 0,
          leaveToday: data.leaveToday || 0,
          absentToday: data.absentToday || 0,
        });
        setEditData({
          name: data.supervisor.name,
          email: data.supervisor.email,
          password: '',
          isActive: data.supervisor.isActive,
        });
      } else {
        toast.error('Supervisor not found');
      }
    } catch {
      toast.error('Failed to load supervisor details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSupervisorData();
  }, [fetchSupervisorData]);

  const handleUpdateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: editData.name,
        email: editData.email,
        isActive: editData.isActive,
      };
      if (editData.password.trim()) {
        payload.password = editData.password.trim();
      }

      const res = await fetch(`/api/supervisors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update supervisor');
        return;
      }

      toast.success('Supervisor account updated successfully');
      setIsEditOpen(false);
      fetchSupervisorData();
    } catch {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-400">
        Loading supervisor details & assigned workforce...
      </div>
    );
  }

  if (!supervisor) {
    return (
      <div className="flex-1 p-12 text-center text-slate-500">
        Supervisor record not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`${supervisor.name} (Supervisor)`}
        description="Assigned reporting team allocation and direct shift attendance monitoring"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/supervisors"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="size-3.5" />
            Supervisors List
          </Link>
          <Link
            href={`/admin/attendance?supervisorId=${supervisor._id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs shadow-emerald-500/20"
          >
            <CalendarCheck className="size-3.5" />
            Filter Attendance
          </Link>
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20"
          >
            <Edit className="size-3.5" />
            Edit Account
          </button>
        </div>
      </Header>

      <div className="p-8 space-y-6 max-w-6xl">
        {/* Supervisor Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-purple-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-purple-500/20">
              {supervisor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{supervisor.name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                  Supervisor
                </span>
                {supervisor.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <CheckCircle2 className="size-3" />
                    ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                    <XCircle className="size-3" />
                    INACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5 text-slate-400" />
                  {supervisor.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-slate-400" />
                  Joined: {new Date(supervisor.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Assigned Workforce
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.totalAssigned} Employees
            </div>
          </div>
        </div>

        {/* Team Attendance KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Team Headcount
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1.5">{stats.totalAssigned}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Assigned to this supervisor</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Present Today
            </div>
            <div className="text-xl font-bold text-emerald-600 mt-1.5">{stats.presentToday}</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">Checked in / on duty</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              On Leave Today
            </div>
            <div className="text-xl font-bold text-amber-600 mt-1.5">{stats.leaveToday}</div>
            <div className="text-[11px] text-amber-700 mt-0.5">Approved time off</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Absent Today
            </div>
            <div className="text-xl font-bold text-rose-600 mt-1.5">{stats.absentToday}</div>
            <div className="text-[11px] text-rose-700 mt-0.5">Unexcused / missing</div>
          </div>
        </div>

        {/* Assigned Employees Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="size-4 text-blue-600" />
              Employees Supervised by {supervisor.name} ({employees.length})
            </h3>
            <Link
              href="/admin/employees/new"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              + Add Another Employee
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Today&#39;s Attendance</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No employees are currently assigned to this supervisor.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {emp.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/admin/employees/${emp._id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600"
                            >
                              {emp.fullName}
                            </Link>
                            <div className="text-[11px] text-slate-500">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {emp.employeeCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{emp.designation}</div>
                        <div className="text-[11px] text-slate-500">{emp.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {emp.todayAttendance ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              emp.todayAttendance.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : emp.todayAttendance.status === 'HALF_DAY'
                                ? 'bg-amber-100 text-amber-800'
                                : emp.todayAttendance.status === 'LEAVE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {emp.todayAttendance.status}
                            {emp.todayAttendance.checkIn ? ` (${emp.todayAttendance.checkIn})` : ''}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not marked yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{emp.phone}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/employees/${emp._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                        >
                          <Eye className="size-3" />
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Supervisor Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="size-4 text-blue-600" />
                Edit Supervisor Account
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateSupervisor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor Name
                </label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  minLength={8}
                  placeholder="Enter new password (optional)"
                  value={editData.password}
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  value={editData.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setEditData({ ...editData, isActive: e.target.value === 'active' })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active (Can log in & mark attendance)</option>
                  <option value="inactive">Inactive (Access suspended)</option>
                </select>
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
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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
