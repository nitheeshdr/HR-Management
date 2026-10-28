'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  Users,
  CalendarCheck,
  UserCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface SupervisorStats {
  kpi: {
    assignedEmployees: number;
    presentToday: number;
    leaveToday: number;
    absentToday: number;
    pendingMarkingCount: number;
  };
}

export default function SupervisorDashboardPage() {
  const [data, setData] = useState<SupervisorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load supervisor dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const kpi = data?.kpi || {
    assignedEmployees: 0,
    presentToday: 0,
    leaveToday: 0,
    absentToday: 0,
    pendingMarkingCount: 0,
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Supervisor Overview"
        description="Monitor reporting team members and log daily shift attendance"
      >
        <Link
          href="/supervisor/attendance"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20"
        >
          <CalendarCheck className="size-3.5" />
          Mark Today&#39;s Attendance
        </Link>
      </Header>

      <div className="p-8 space-y-6 max-w-6xl">
        {/* Pending Attendance Alert */}
        {kpi.pendingMarkingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Daily Attendance Pending ({kpi.pendingMarkingCount} employee
                  {kpi.pendingMarkingCount > 1 ? 's' : ''})
                </h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Some members of your assigned team haven&apos;t been marked for today.
                </p>
              </div>
            </div>
            <Link
              href="/supervisor/attendance"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
            >
              Mark Now
            </Link>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Team Size */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                My Team Size
              </span>
              <div className="size-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {loading ? '...' : kpi.assignedEmployees}
            </div>
            <div className="mt-2 text-xs text-slate-500">Supervised reporting staff</div>
          </div>

          {/* Present Today */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Present Today
              </span>
              <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {loading ? '...' : kpi.presentToday}
            </div>
            <div className="mt-2 text-xs text-emerald-600 font-medium">On duty / checked-in</div>
          </div>

          {/* On Leave */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                On Leave
              </span>
              <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {loading ? '...' : kpi.leaveToday}
            </div>
            <div className="mt-2 text-xs text-amber-600 font-medium">Approved time off</div>
          </div>

          {/* Absent */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Absent
              </span>
              <div className="size-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {loading ? '...' : kpi.absentToday}
            </div>
            <div className="mt-2 text-xs text-rose-600 font-medium">Unexcused or missing</div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/supervisor/attendance"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Mark Shift Attendance
              </h3>
              <p className="text-xs text-slate-500">
                Review check-in/out times, record shift statuses, and submit daily attendance.
              </p>
            </div>
            <ArrowRight className="size-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/supervisor/employees"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                View Supervised Team
              </h3>
              <p className="text-xs text-slate-500">
                Access profiles, contact information, and attendance histories of assigned members.
              </p>
            </div>
            <ArrowRight className="size-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
