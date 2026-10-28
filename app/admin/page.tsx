'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  Users,
  UserCheck,
  CalendarCheck,
  ShieldCheck,
  UserPlus,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Building,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardData {
  kpi: {
    totalEmployees: number;
    activeEmployees: number;
    presentToday: number;
    leaveToday: number;
    absentToday: number;
    totalSupervisors: number;
  };
  departmentDistribution: Array<{ name: string; value: number }>;
  weeklyTrend: Array<{ date: string; present: number; absent: number; leave: number }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const kpi = data?.kpi || {
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    leaveToday: 0,
    absentToday: 0,
    totalSupervisors: 0,
  };

  const attendanceRate =
    kpi.totalEmployees > 0
      ? Math.round((kpi.presentToday / kpi.totalEmployees) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Admin Dashboard"
        description="Real-time company workforce overview and attendance metrics"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <CalendarCheck className="size-3.5 text-blue-600" />
            Mark Attendance
          </Link>
          <Link
            href="/admin/employees/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20"
          >
            <UserPlus className="size-3.5" />
            Add Employee
          </Link>
        </div>
      </Header>

      <div className="p-8 space-y-8 max-w-7xl">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Employees */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Employees
              </span>
              <div className="size-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {loading ? '...' : kpi.totalEmployees}
              </span>
              <span className="text-xs font-medium text-emerald-600">
                {kpi.activeEmployees} active
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Workforce Roster</span>
              <Link href="/admin/employees" className="text-blue-600 hover:underline inline-flex items-center">
                View list <ArrowUpRight className="size-3 ml-0.5" />
              </Link>
            </div>
          </div>

          {/* Today's Attendance */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Present Today
              </span>
              <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {loading ? '...' : kpi.presentToday}
              </span>
              <span className="text-xs font-medium text-emerald-600">
                {attendanceRate}% present
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>{kpi.leaveToday} on leave</span>
              <Link href="/admin/attendance" className="text-blue-600 hover:underline inline-flex items-center">
                Attendance <ArrowUpRight className="size-3 ml-0.5" />
              </Link>
            </div>
          </div>

          {/* Supervisors Active */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Supervisors
              </span>
              <div className="size-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {loading ? '...' : kpi.totalSupervisors}
              </span>
              <span className="text-xs font-medium text-purple-600">Active</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Team Leaders</span>
              <Link href="/admin/supervisors" className="text-blue-600 hover:underline inline-flex items-center">
                Manage <ArrowUpRight className="size-3 ml-0.5" />
              </Link>
            </div>
          </div>

          {/* On Leave / Absent */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Off-Duty Today
              </span>
              <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {loading ? '...' : kpi.leaveToday + kpi.absentToday}
              </span>
              <span className="text-xs font-medium text-amber-600">
                {kpi.leaveToday} leave, {kpi.absentToday} absent
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Attendance Status</span>
              <Link href="/admin/attendance" className="text-blue-600 hover:underline inline-flex items-center">
                View Log <ArrowUpRight className="size-3 ml-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Attendance Trend */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-600" />
                  Weekly Attendance Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily presence and absence counts across workforce
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              {loading || !data?.weeklyTrend?.length ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {loading ? 'Loading trend data...' : 'No historical records logged yet this week.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#FFF',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="present" name="Present" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leave" name="On Leave" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Department Distribution */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="size-4 text-blue-600" />
                Department Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Active team member count by unit</p>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3">
              {loading || !data?.departmentDistribution?.length ? (
                <div className="text-center text-xs text-slate-400 py-8">
                  {loading ? 'Loading departments...' : 'No department records.'}
                </div>
              ) : (
                data.departmentDistribution.map((dept) => {
                  const percentage =
                    kpi.totalEmployees > 0
                      ? Math.round((dept.value / kpi.totalEmployees) * 100)
                      : 0;
                  return (
                    <div key={dept.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{dept.name}</span>
                        <span className="text-slate-500 font-medium">
                          {dept.value} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">HR Management Hub</h3>
              <p className="text-xs text-slate-300 mt-1">
                Maintain accurate records, manage employee onboarding, and review daily audit logs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/admin/employees/new"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
              >
                Onboard Employee
              </Link>
              <Link
                href="/admin/attendance"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors backdrop-blur-xs"
              >
                Mark Daily Attendance
              </Link>
              <Link
                href="/admin/supervisors"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors backdrop-blur-xs"
              >
                Supervisor Settings
              </Link>
              <Link
                href="/admin/reports"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors backdrop-blur-xs"
              >
                Export Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
