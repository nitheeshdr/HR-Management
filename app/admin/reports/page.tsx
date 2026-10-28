'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import {
  FileText,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (type: string) => {
    setDownloading(type);
    toast.info(`Preparing ${type} export...`);
    window.open(`/api/reports/export?type=${type}`, '_blank');
    setTimeout(() => setDownloading(null), 1000);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Reports & Analytics"
        description="Generate enterprise workforce audits, attendance statements, and export data in CSV format"
      />

      <div className="p-8 space-y-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Directory Report */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="size-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Workforce Master Roster</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete roster containing employee codes, department allocations, designations,
                contract types, reporting supervisors, joining dates, and contact information.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">Format: CSV</span>
              <button
                onClick={() => handleDownload('employees')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20"
              >
                <Download className="size-3.5" />
                Export Employees CSV
              </button>
            </div>
          </div>

          {/* Attendance Log Report */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Historical Attendance Records</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete log of check-in and check-out timestamps, calculated working minutes,
                absence flags, authorized leaves, and supervisor signatures for payroll audits.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">Format: CSV</span>
              <button
                onClick={() => handleDownload('attendance')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs shadow-emerald-500/20"
              >
                <Download className="size-3.5" />
                Export Attendance CSV
              </button>
            </div>
          </div>
        </div>

        {/* Regulatory & Compliance Note */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-2 border border-slate-800">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
            <FileSpreadsheet className="size-4" />
            Compliance & Payroll Export Standards
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All exported CSV files are encoded in standard UTF-8 format and compliant with standard
            enterprise payroll engines. Timestamp records reflect business operating hours in the configured
            system timezone.
          </p>
        </div>
      </div>
    </div>
  );
}
