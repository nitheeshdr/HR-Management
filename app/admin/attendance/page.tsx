'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  Clock,
  Filter,
  Loader2,
  History,
  Shield,
  Search,
  Lock,
  Unlock,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { toast } from 'sonner';

type StatusType = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF';

interface AttendanceEntry {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  supervisorName?: string;
  supervisorId?: string;
  status: StatusType;
  checkIn: string;
  checkOut: string;
  notes: string;
  isLocked?: boolean;
}

interface HistoricalRecord {
  _id: string;
  attendanceDate: string;
  employeeId?: {
    _id: string;
    employeeCode: string;
    fullName: string;
    department: string;
    supervisorId?: {
      name: string;
    };
  };
  status: string;
  checkIn?: string;
  checkOut?: string;
  workingMinutes?: number;
  markedBy?: {
    name: string;
    role: string;
  };
  notes?: string;
  isLocked?: boolean;
}

interface MonthAttendanceDoc {
  _id: string;
  employeeId: {
    _id: string;
    employeeCode: string;
    fullName: string;
    department: string;
    supervisorId?: {
      _id: string;
      name: string;
    };
  } | string;
  attendanceDate: string;
  status: StatusType;
  checkIn?: string;
  checkOut?: string;
  isLocked?: boolean;
}

export default function AdminAttendancePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'daily' | 'history'>('grid');

  // Stable initial dates for prerender, updated on client mount in useEffect
  const [todayStr, setTodayStr] = useState<string>('2026-10-28');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-28');

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    setTodayStr(today);
    setSelectedMonth(today.slice(0, 7));
    setSelectedDate(today);
  }, []);

  // Filters
  const [department, setDepartment] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Data states
  const [supervisors, setSupervisors] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Grid view data
  const [employees, setEmployees] = useState<Array<{
    _id: string;
    employeeCode: string;
    fullName: string;
    department: string;
    supervisorName: string;
    supervisorId: string;
  }>>([]);
  const [monthRecords, setMonthRecords] = useState<MonthAttendanceDoc[]>([]);
  // Local pending modifications in grid: Map of "empId_dateStr" -> StatusType
  const [gridPendingEdits, setGridPendingEdits] = useState<Map<string, StatusType>>(new Map());

  // Daily entries state (local state, saved on button click)
  const [dailyEntries, setDailyEntries] = useState<AttendanceEntry[]>([]);
  const [hasDailyChanges, setHasDailyChanges] = useState(false);

  // History records state
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    const nextY = d.getUTCFullYear();
    const nextM = String(d.getUTCMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    const nextY = d.getUTCFullYear();
    const nextM = String(d.getUTCMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(todayStr.slice(0, 7));
  };

  // Month Display Title (e.g. "October 2026")
  const monthDisplayTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }, [selectedMonth]);

  // Days in month
  const monthDays = useMemo(() => {
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, monthNum, 0).getDate();
    const cols = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(Date.UTC(year, monthNum - 1, day));
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      cols.push({
        dateStr,
        dayNumber: day,
        dayName,
        isToday: dateStr === todayStr,
      });
    }
    return cols;
  }, [selectedMonth, todayStr]);

  // Fetch supervisors once
  useEffect(() => {
    async function fetchSupervisors() {
      try {
        const res = await fetch('/api/supervisors');
        if (res.ok) {
          const d = await res.json();
          setSupervisors(d.supervisors || []);
        }
      } catch (e) {
        console.error('Failed to load supervisors list', e);
      }
    }
    fetchSupervisors();
  }, []);

  // Load attendance data based on current viewMode
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const empParams = new URLSearchParams({ limit: '200' });
      if (selectedSupervisor) empParams.set('supervisorId', selectedSupervisor);
      if (department) empParams.set('department', department);

      if (viewMode === 'grid') {
        const [empRes, attRes] = await Promise.all([
          fetch(`/api/employees?${empParams.toString()}`),
          fetch(`/api/attendance?month=${selectedMonth}${selectedSupervisor ? `&supervisorId=${selectedSupervisor}` : ''}${department ? `&department=${department}` : ''}`),
        ]);

        if (empRes.ok) {
          const empData = await empRes.json();
          const list = (empData.employees || []).map((e: any) => ({
            _id: e._id,
            employeeCode: e.employeeCode,
            fullName: e.fullName,
            department: e.department,
            supervisorName: e.supervisorId?.name || 'Unassigned',
            supervisorId: e.supervisorId?._id || '',
          }));
          setEmployees(list);
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          setMonthRecords(attData.records || []);
        }
        setGridPendingEdits(new Map());
      } else if (viewMode === 'daily') {
        const [empRes, attRes] = await Promise.all([
          fetch(`/api/employees?${empParams.toString()}`),
          fetch(`/api/attendance?date=${selectedDate}${selectedSupervisor ? `&supervisorId=${selectedSupervisor}` : ''}${department ? `&department=${department}` : ''}`),
        ]);

        if (!empRes.ok) throw new Error('Failed to load employees');

        const empData = await empRes.json();
        const attData = attRes.ok ? await attRes.json() : { records: [] };

        const attMap = new Map();
        attData.records?.forEach((rec: any) => {
          const empId = rec.employeeId?._id || rec.employeeId;
          attMap.set(empId?.toString(), rec);
        });

        const list: AttendanceEntry[] = (empData.employees || []).map((emp: any) => {
          const existing = attMap.get(emp._id.toString());
          return {
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            department: emp.department,
            supervisorName: emp.supervisorId?.name || 'Unassigned',
            supervisorId: emp.supervisorId?._id || '',
            status: existing ? existing.status : 'PRESENT',
            checkIn: existing?.checkIn || '09:00',
            checkOut: existing?.checkOut || '18:00',
            notes: existing?.notes || '',
            isLocked: existing?.isLocked || false,
          };
        });

        setDailyEntries(list);
        setHasDailyChanges(false);
      } else {
        // history mode
        const params = new URLSearchParams({ date: 'ALL' });
        if (selectedSupervisor) params.set('supervisorId', selectedSupervisor);
        if (department) params.set('department', department);

        const res = await fetch(`/api/attendance?${params.toString()}`);
        if (res.ok) {
          const d = await res.json();
          setHistoricalRecords(d.records || []);
        }
      }
    } catch {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedMonth, selectedDate, selectedSupervisor, department]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Month grid map: "empId_dateStr" -> MonthAttendanceDoc
  const serverGridMap = useMemo(() => {
    const map = new Map<string, MonthAttendanceDoc>();
    monthRecords.forEach((rec) => {
      const empId =
        typeof rec.employeeId === 'object' && rec.employeeId !== null
          ? rec.employeeId._id
          : rec.employeeId;
      const dateStr = new Date(rec.attendanceDate).toISOString().split('T')[0];
      map.set(`${empId}_${dateStr}`, rec);
    });
    return map;
  }, [monthRecords]);

  // Cycle status: PRESENT -> HALF_DAY -> LEAVE -> ABSENT -> PRESENT
  const getNextStatus = (current?: string): StatusType => {
    if (!current || current === 'ABSENT') return 'PRESENT';
    if (current === 'PRESENT') return 'HALF_DAY';
    if (current === 'HALF_DAY') return 'LEAVE';
    if (current === 'LEAVE') return 'ABSENT';
    return 'PRESENT';
  };

  const getEffectiveGridStatus = (empId: string, dateStr: string): string | undefined => {
    const key = `${empId}_${dateStr}`;
    if (gridPendingEdits.has(key)) {
      return gridPendingEdits.get(key);
    }
    return serverGridMap.get(key)?.status;
  };

  // Admin Grid Cell Click: cycles status locally (NO real-time background sync)
  const handleGridCellClick = (empId: string, dateStr: string) => {
    const current = getEffectiveGridStatus(empId, dateStr);
    const next = getNextStatus(current);
    const key = `${empId}_${dateStr}`;

    setGridPendingEdits((prev) => {
      const nextMap = new Map(prev);
      nextMap.set(key, next);
      return nextMap;
    });
  };

  // Save all Grid pending edits in batch
  const handleSaveGridChanges = async () => {
    if (gridPendingEdits.size === 0) return;
    setSaving(true);
    try {
      // Group pending edits by dateStr
      const dateMap = new Map<string, Array<{ employeeId: string; status: StatusType }>>();
      gridPendingEdits.forEach((status, key) => {
        const [empId, dateStr] = key.split('_');
        const list = dateMap.get(dateStr) || [];
        list.push({ employeeId: empId, status });
        dateMap.set(dateStr, list);
      });

      // Execute batch updates per date
      const promises = Array.from(dateMap.entries()).map(([dateStr, entries]) => {
        return fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendanceDate: dateStr,
            entries,
          }),
        });
      });

      await Promise.all(promises);
      toast.success(`Saved changes for ${gridPendingEdits.size} attendance records!`);
      setGridPendingEdits(new Map());
      await loadData();
    } catch {
      toast.error('Failed to save grid changes');
    } finally {
      setSaving(false);
    }
  };

  // Daily Mode: Status change locally (NO real-time auto sync)
  const handleDailyStatusChange = (index: number, newStatus: StatusType) => {
    setDailyEntries((prev) => {
      const copy = [...prev];
      const target = copy[index];
      let newIn = target.checkIn;
      let newOut = target.checkOut;

      if (newStatus === 'ABSENT' || newStatus === 'LEAVE') {
        newIn = '';
        newOut = '';
      } else if (!newIn) {
        newIn = '09:00';
        newOut = '18:00';
      }

      copy[index] = {
        ...target,
        status: newStatus,
        checkIn: newIn,
        checkOut: newOut,
      };
      return copy;
    });
    setHasDailyChanges(true);
  };

  const handleDailyTimeChange = (index: number, field: 'checkIn' | 'checkOut', val: string) => {
    setDailyEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
    setHasDailyChanges(true);
  };

  const handleDailyNotesChange = (index: number, notes: string) => {
    setDailyEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes };
      return copy;
    });
    setHasDailyChanges(true);
  };

  // Save All Records in Daily Mode
  const handleSaveDailyAll = async () => {
    setSaving(true);
    try {
      const payload = {
        attendanceDate: selectedDate,
        entries: dailyEntries.map((e) => ({
          employeeId: e.employeeId,
          status: e.status,
          checkIn: e.checkIn || undefined,
          checkOut: e.checkOut || undefined,
          notes: e.notes || undefined,
        })),
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save attendance');
      }

      toast.success(`Attendance records successfully saved for ${selectedDate}`);
      setHasDailyChanges(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  // Filtered employees for grid view
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          emp.fullName.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, search]);

  // Filtered daily entries
  const filteredDailyEntries = useMemo(() => {
    return dailyEntries.filter((e) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.fullName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dailyEntries, search]);

  // Filtered historical records
  const filteredHistoricalRecords = useMemo(() => {
    return historicalRecords.filter((rec) => {
      const emp = rec.employeeId;
      if (statusFilter && rec.status !== statusFilter) return false;
      if (search.trim() && emp) {
        const q = search.toLowerCase();
        return (
          emp.fullName?.toLowerCase().includes(q) ||
          emp.employeeCode?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [historicalRecords, statusFilter, search]);

  const getBadgeStyle = (status?: string) => {
    if (!status) return 'bg-slate-50 text-slate-400 border border-dashed border-slate-200';
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-600 text-white font-bold shadow-xs';
      case 'HALF_DAY':
        return 'bg-amber-500 text-white font-bold shadow-xs';
      case 'LEAVE':
        return 'bg-blue-600 text-white font-bold shadow-xs';
      case 'ABSENT':
        return 'bg-rose-500 text-white font-bold shadow-xs';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  const getShortLabel = (status?: string) => {
    if (!status) return '—';
    if (status === 'PRESENT') return 'P';
    if (status === 'HALF_DAY') return 'HD';
    if (status === 'LEAVE') return 'L';
    if (status === 'ABSENT') return 'A';
    return status.slice(0, 2);
  };

  return (
    <div className="flex-1 flex flex-col font-sans pb-16 sm:pb-8">
      <Header
        title="Workforce Attendance Hub"
        description="Month-at-a-glance matrix grid, supervisor filters, and daily shift records"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => window.open('/api/reports/export?type=attendance', '_blank')}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {viewMode === 'grid' && gridPendingEdits.size > 0 && (
            <button
              onClick={handleSaveGridChanges}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs shadow-blue-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span className="hidden sm:inline">Save Grid Changes</span> ({gridPendingEdits.size})
                </>
              )}
            </button>
          )}

          {viewMode === 'daily' && (
            <button
              onClick={handleSaveDailyAll}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs shadow-blue-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Save All</span>
                </>
              )}
            </button>
          )}
        </div>
      </Header>

      <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full">
        {/* View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LayoutGrid className="size-3.5" />
              Monthly Grid
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                viewMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <List className="size-3.5" />
              Daily Shift
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                viewMode === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <History className="size-3.5" />
              History Log
            </button>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500">
            Click <strong>Save</strong> button to commit any updates.
          </div>
        </div>

        {/* Global Controls & Filters Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Month Picker (Grid Mode) */}
            {viewMode === 'grid' && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="size-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) setSelectedMonth(e.target.value);
                  }}
                  className="px-2 py-0.5 text-xs font-bold bg-transparent border-0 cursor-pointer focus:ring-0"
                />
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="size-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
                >
                  <ChevronRight className="size-3.5" />
                </button>
                {selectedMonth !== todayStr.slice(0, 7) && (
                  <button
                    type="button"
                    onClick={handleCurrentMonth}
                    className="px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Current
                  </button>
                )}
              </div>
            )}

            {/* Date Picker (Daily Mode) */}
            {viewMode === 'daily' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Supervisor Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Supervisor:</span>
              <select
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Supervisors</option>
                {supervisors.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Department:</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
          </div>

          {/* Quick Info & Pending Changes */}
          <div className="flex items-center gap-3">
            {viewMode === 'grid' && (
              <span className="text-xs text-slate-500">
                Viewing <strong>{monthDisplayTitle}</strong> ({monthDays.length} days)
              </span>
            )}
            {viewMode === 'grid' && gridPendingEdits.size > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                {gridPendingEdits.size} uncommitted edits
              </span>
            )}
            {viewMode === 'daily' && hasDailyChanges && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                Unsaved daily changes
              </span>
            )}
          </div>
        </div>

        {/* View 1: Monthly Matrix Grid */}
        {viewMode === 'grid' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    {/* Sticky Employee Header */}
                    <th className="sticky left-0 z-20 bg-slate-100 py-3.5 px-4 text-left min-w-[220px] border-r border-slate-200 shadow-xs">
                      Employee / Supervisor
                    </th>

                    {/* All Days of Month */}
                    {monthDays.map((col) => (
                      <th
                        key={col.dateStr}
                        className={`py-3 px-2 min-w-[65px] border-l border-slate-200 ${
                          col.isToday
                            ? 'bg-blue-100/90 text-blue-950 border-b-2 border-b-blue-600 font-extrabold'
                            : 'text-slate-500'
                        }`}
                      >
                        <div className="text-[11px] font-bold leading-tight">{col.dayNumber}</div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500 mt-0.5">
                          {col.dayName}
                        </div>
                        {col.isToday && (
                          <div className="text-[9px] uppercase font-bold text-blue-800 mt-1">
                            Today
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={monthDays.length + 1} className="py-20 text-center text-slate-400">
                        <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading monthly matrix grid...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={monthDays.length + 1} className="py-20 text-center text-slate-400">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Sticky Employee Row */}
                        <td className="sticky left-0 z-10 bg-white py-3 px-4 text-left border-r border-slate-200 shadow-xs">
                          <div className="font-bold text-slate-900">{emp.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {emp.employeeCode} • {emp.department}
                          </div>
                          <div className="text-[10px] text-purple-700 font-medium flex items-center gap-1 mt-0.5">
                            <Shield className="size-2.5" />
                            {emp.supervisorName}
                          </div>
                        </td>

                        {/* Day Cells */}
                        {monthDays.map((col) => {
                          const status = getEffectiveGridStatus(emp._id, col.dateStr);
                          const isEdited = gridPendingEdits.has(`${emp._id}_${col.dateStr}`);
                          const serverRec = serverGridMap.get(`${emp._id}_${col.dateStr}`);

                          return (
                            <td
                              key={col.dateStr}
                              className={`py-2 px-1 border-l border-slate-100 ${
                                col.isToday ? 'bg-blue-50/30' : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleGridCellClick(emp._id, col.dateStr)}
                                title={`Click to cycle: ${status || 'Unmarked'}${
                                  serverRec?.isLocked ? ' (Supervisor Locked)' : ''
                                }`}
                                className={`size-8 rounded-lg transition-all mx-auto flex items-center justify-center text-[11px] font-bold relative hover:scale-105 active:scale-95 cursor-pointer ${getBadgeStyle(
                                  status
                                )}`}
                              >
                                {getShortLabel(status)}
                                {isEdited && (
                                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-white" />
                                )}
                                {serverRec?.isLocked && (
                                  <Lock className="absolute -bottom-1 -right-1 size-2.5 text-slate-700 bg-white rounded-full p-0.5 shadow-xs" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 2: Daily Shift List */}
        {viewMode === 'daily' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Supervisor</th>
                    <th className="py-3 px-4">Status Selection</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <Loader2 className="size-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading daily attendance records...
                      </td>
                    </tr>
                  ) : filteredDailyEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyEntries.map((entry, idx) => (
                      <tr key={entry.employeeId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{entry.fullName}</div>
                          <div className="text-[11px] text-slate-400">
                            {entry.employeeCode} • {entry.department}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <Shield className="size-3 text-purple-600" />
                            {entry.supervisorName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                            {(['PRESENT', 'HALF_DAY', 'LEAVE', 'ABSENT'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleDailyStatusChange(idx, st)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                  entry.status === st
                                    ? st === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : st === 'HALF_DAY'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : st === 'LEAVE'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="time"
                            disabled={entry.status === 'ABSENT' || entry.status === 'LEAVE'}
                            value={entry.checkIn}
                            onChange={(e) => handleDailyTimeChange(idx, 'checkIn', e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-slate-200 bg-white font-mono disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="time"
                            disabled={entry.status === 'ABSENT' || entry.status === 'LEAVE'}
                            value={entry.checkOut}
                            onChange={(e) => handleDailyTimeChange(idx, 'checkOut', e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-slate-200 bg-white font-mono disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Add note..."
                            value={entry.notes}
                            onChange={(e) => handleDailyNotesChange(idx, e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 3: Complete History Log */}
        {viewMode === 'history' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="size-4 text-blue-600" />
                Historical Attendance Statement ({filteredHistoricalRecords.length} records)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Supervisor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Verified By</th>
                    <th className="py-3 px-4">Lock</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <Loader2 className="size-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading history...
                      </td>
                    </tr>
                  ) : filteredHistoricalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        No historical attendance records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoricalRecords.map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {new Date(rec.attendanceDate).toISOString().split('T')[0]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {rec.employeeId?.fullName || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rec.employeeId?.employeeCode} • {rec.employeeId?.department}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {rec.employeeId?.supervisorId?.name || '—'}
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
                        <td className="py-3 px-4 text-slate-500">
                          {rec.markedBy?.name || 'Supervisor / Admin'}
                        </td>
                        <td className="py-3 px-4">
                          {rec.isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                              <Lock className="size-3" /> Locked
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Open</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                          {rec.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
