'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ShieldCheck,
  FileText,
  History,
  Building2,
  ChevronRight,
  LogOut,
  UserCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  role: 'ADMIN' | 'SUPERVISOR';
  onCloseMobile?: () => void;
}

export function Sidebar({ role, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const adminLinks = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Employees', href: '/admin/employees', icon: Users },
    { name: 'Attendance', href: '/admin/attendance', icon: CalendarCheck },
    { name: 'Supervisors', href: '/admin/supervisors', icon: ShieldCheck },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
  ];

  const supervisorLinks = [
    { name: 'Dashboard', href: '/supervisor', icon: LayoutDashboard },
    { name: 'My Team', href: '/supervisor/employees', icon: Users },
    { name: 'Mark Attendance', href: '/supervisor/attendance', icon: CalendarCheck },
  ];

  const links = role === 'ADMIN' ? adminLinks : supervisorLinks;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight tracking-tight">HRMS Core</h1>
            <p className="text-[11px] text-blue-400 font-medium uppercase tracking-wider">
              {role === 'ADMIN' ? 'Enterprise Admin' : 'Supervisor Portal'}
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden size-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
            aria-label="Close mobile sidebar"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Management
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== '/admin' && link.href !== '/supervisor' && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`size-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{link.name}</span>
              </div>
              <ChevronRight
                className={`size-3.5 transition-transform ${
                  isActive ? 'text-white/70 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                }`}
              />
            </Link>
          );
        })}
      </div>

      {/* User Section at bottom */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 text-xs font-semibold shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'HR'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.name || 'User'}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email || ''}</div>
            </div>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
              role === 'ADMIN'
                ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
            }`}
          >
            {role}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 transition-colors"
        >
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
