'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Search, Eye, Building, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface EmployeeItem {
  _id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  employmentType: string;
  employmentStatus: string;
  workLocation?: string;
}

export default function SupervisorTeamPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadTeam() {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
        }
      } catch {
        toast.error('Failed to load team');
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    emp.designation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="My Supervised Team"
        description="Direct reports under your supervisory allocation"
      />

      <div className="p-8 space-y-6 max-w-6xl">
        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs max-w-md">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search team member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-xs text-slate-400">
              Loading team directory...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-xs text-slate-400">
              No team members found.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp._id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {emp.employeeCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        emp.employmentStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {emp.employmentStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {emp.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{emp.fullName}</h4>
                      <p className="text-xs text-slate-500">{emp.designation}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-slate-400" />
                      <span>{emp.phone}</span>
                    </div>
                    {emp.workLocation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-slate-400" />
                        <span className="truncate">{emp.workLocation}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/supervisor/employees/${emp._id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100 transition-colors"
                >
                  <Eye className="size-3.5" />
                  View Profile & Attendance
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
