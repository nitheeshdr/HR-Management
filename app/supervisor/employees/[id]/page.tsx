'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  CalendarCheck,
  User,
  MapPin,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SupervisorEmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [employee, setEmployee] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch(`/api/employees/${id}`),
        fetch(`/api/attendance?employeeId=${id}`),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployee(empData.employee);
      } else {
        toast.error('Unable to access employee record');
      }

      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData.records || []);
      }
    } catch {
      toast.error('Error loading employee information');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        Record not accessible or not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`${employee.fullName} (${employee.employeeCode})`}
        description={`${employee.designation} • ${employee.department}`}
      >
        <Link
          href="/supervisor/employees"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="size-3.5" />
          Back to Team
        </Link>
      </Header>

      <div className="p-8 space-y-6 max-w-5xl">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center">
            {employee.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{employee.fullName}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                {employee.employeeCode}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Building className="size-3.5" />
                {employee.department}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" />
                {employee.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" />
                {employee.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="size-4 text-blue-600" />
              Attendance History Log
            </h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Check-In</th>
                <th className="py-2.5 px-4">Check-Out</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No attendance records for this team member yet.
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
      </div>
    </div>
  );
}
