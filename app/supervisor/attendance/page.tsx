'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from '@/components/layout/header';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

type StatusType = 'PRESENT' | 'HALF_DAY' | 'LEAVE' | 'ABSENT';

interface Employee {
  _id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
}

interface AttendanceDoc {
  _id: string;
  employeeId: {
    _id: string;
    employeeCode: string;
    fullName: string;
  } | string;
  attendanceDate: string;
  dateStr?: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF';
  checkIn?: string;
  checkOut?: string;
  isLocked?: boolean;
  lockedAt?: string;
  notes?: string;
}

export default function SupervisorAttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthAttendance, setMonthAttendance] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingLock, setSubmittingLock] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Stable initial dates for prerender, updated on client mount in useEffect
  const [todayStr, setTodayStr] = useState<string>('2026-10-28');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    setTodayStr(today);
    setSelectedMonth(today.slice(0, 7));
  }, []);

  // Local pending changes before supervisor hits "Save"
  // Map of employeeId -> StatusType
  const [pendingEdits, setPendingEdits] = useState<Map<string, StatusType>>(new Map());

  // Ref to today's column for smooth scrolling
  const todayColumnRef = useRef<HTMLTableHeaderCellElement | null>(null);

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

  const scrollToToday = () => {
    todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Month Display Title (e.g. "October 2026")
  const monthDisplayTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }, [selectedMonth]);

  // Generate date columns for all days in the selected month
  const monthDays = useMemo(() => {
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, monthNum, 0).getDate();
    const cols = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(Date.UTC(year, monthNum - 1, day));
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;

      cols.push({
        dateStr,
        dayNumber: day,
        dayName,
        label: `${dayName} ${day}`,
        isToday,
        isPast,
        isFuture,
        isBlocked: !isToday, // All days except today are blocked for supervisor
      });
    }
    return cols;
  }, [selectedMonth, todayStr]);

  // Fetch team members & month attendance data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/attendance?month=${selectedMonth}`),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      }

      if (attRes.ok) {
        const attData = await attRes.json();
        setMonthAttendance(attData.records || []);
      }
    } catch {
      toast.error('Failed to load team attendance for the selected month');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
    setPendingEdits(new Map());
  }, [loadData]);

  // Auto-scroll to today column on mobile when current month is loaded
  const isTodayInSelectedMonth = useMemo(() => {
    return selectedMonth === todayStr.slice(0, 7);
  }, [selectedMonth, todayStr]);

  useEffect(() => {
    if (isTodayInSelectedMonth && !loading) {
      const timer = setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isTodayInSelectedMonth, loading]);

  // Immediate local state tracking if today was locked in this session
  const [isLockedTodayState, setIsLockedTodayState] = useState<boolean>(false);

  // Map server attendance by "employeeId_dateStr"
  const serverAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceDoc>();
    monthAttendance.forEach((rec: any) => {
      const empId =
        typeof rec.employeeId === 'object' && rec.employeeId !== null
          ? rec.employeeId._id
          : rec.employeeId;
      
      // Standardize dateStr to business timezone YYYY-MM-DD
      let dateStr = rec.dateStr;
      if (!dateStr) {
        if (typeof rec.attendanceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rec.attendanceDate)) {
          dateStr = rec.attendanceDate;
        } else {
          dateStr = new Date(rec.attendanceDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        }
      }
      map.set(`${empId}_${dateStr}`, rec);
    });
    return map;
  }, [monthAttendance]);

  // Check if today is locked for this supervisor's team
  const isLockedToday = useMemo(() => {
    if (isLockedTodayState) return true;
    return employees.some((emp) => {
      const rec = serverAttendanceMap.get(`${emp._id}_${todayStr}`);
      return rec?.isLocked === true;
    });
  }, [isLockedTodayState, employees, serverAttendanceMap, todayStr]);

  // Status cycle: Unmarked -> PRESENT -> HALF_DAY -> LEAVE -> ABSENT -> PRESENT
  const getNextStatus = (current?: string): StatusType => {
    if (!current || current === 'ABSENT') return 'PRESENT';
    if (current === 'PRESENT') return 'HALF_DAY';
    if (current === 'HALF_DAY') return 'LEAVE';
    if (current === 'LEAVE') return 'ABSENT';
    return 'PRESENT';
  };

  // Get effective status for an employee on a date (combining server data + pending local changes)
  const getEffectiveStatus = (empId: string, dateStr: string): string | undefined => {
    if (dateStr === todayStr && !isLockedToday && pendingEdits.has(empId)) {
      return pendingEdits.get(empId);
    }
    const serverRec = serverAttendanceMap.get(`${empId}_${dateStr}`);
    return serverRec?.status;
  };

  // Handle cell click (NO real-time background sync; purely local React state)
  const handleCellClick = (employee: Employee, dateStr: string) => {
    // 1. Block if today is finalized & locked
    if (isLockedToday || isLockedTodayState) {
      toast.error('Today’s attendance is finalized and locked. You can no longer edit it.', {
        duration: 3000,
      });
      return;
    }

    // 2. Block past dates
    if (dateStr < todayStr) {
      toast.error('Past dates are blocked. Supervisors can only mark today’s attendance.', {
        duration: 2500,
      });
      return;
    }

    // 3. Block future dates
    if (dateStr > todayStr) {
      toast.error('Future dates are blocked. You can only mark today’s attendance.', {
        duration: 2500,
      });
      return;
    }

    // 4. Cycle status locally for today
    const current = getEffectiveStatus(employee._id, dateStr);
    const next = getNextStatus(current);

    setPendingEdits((prev) => {
      const updated = new Map(prev);
      updated.set(employee._id, next);
      return updated;
    });
  };

  // Handle Save and Lock: Saves today's attendance in one batch and permanently locks it
  const handleConfirmSaveAndLock = async () => {
    setSubmittingLock(true);
    try {
      const entriesToSubmit = employees.map((emp) => {
        const effectiveStatus = (getEffectiveStatus(emp._id, todayStr) || 'PRESENT') as StatusType;
        const serverRec = serverAttendanceMap.get(`${emp._id}_${todayStr}`);
        return {
          employeeId: emp._id,
          status: effectiveStatus,
          checkIn: effectiveStatus === 'ABSENT' || effectiveStatus === 'LEAVE' ? undefined : serverRec?.checkIn || '09:00',
          checkOut: effectiveStatus === 'ABSENT' || effectiveStatus === 'LEAVE' ? undefined : serverRec?.checkOut || '18:00',
        };
      });

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceDate: todayStr,
          lock: true,
          entries: entriesToSubmit,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit and lock attendance');
      }

      setIsLockedTodayState(true);
      setPendingEdits(new Map());
      setIsConfirmModalOpen(false);
      toast.success('Today’s attendance has been saved and locked permanently!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error locking attendance');
    } finally {
      setSubmittingLock(false);
    }
  };

  // Badge styling
  const getBadgeStyle = (status?: string) => {
    if (!status) {
      return 'bg-slate-50 text-slate-400 border border-dashed border-slate-200';
    }
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

  const hasUnsavedChanges = pendingEdits.size > 0;

  return (
    <div className="flex-1 flex flex-col font-sans pb-24 sm:pb-8">
      <Header
        title="Team Attendance Grid"
        description="Month-at-a-glance shift roster. Mark today's attendance: Present → Half Day → Leave → Absent."
      >
        <div className="flex items-center gap-2">
          {isLockedToday ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Lock className="size-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Today&#39;s Attendance</span> Locked
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={loading || employees.length === 0}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs shadow-blue-500/20"
            >
              <Lock className="size-3.5" />
              <span className="hidden sm:inline">Save &amp; Lock Today</span>
              <span className="sm:hidden">Save &amp; Lock</span>
            </button>
          )}
        </div>
      </Header>

      <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full">
        {/* Top Control Bar: Month Picker & Navigation */}
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="size-4 text-blue-600" />
              Month:
            </span>

            <div className="flex items-center gap-1">
              {/* Prev Month */}
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="size-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>

              {/* Month Input */}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />

              {/* Next Month */}
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="size-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Jump to Current Month Button */}
            {!isTodayInSelectedMonth && (
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                Go to Today
              </button>
            )}

            {isTodayInSelectedMonth && (
              <button
                type="button"
                onClick={scrollToToday}
                className="sm:hidden px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                Jump to Today
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              <strong className="text-slate-800">{monthDisplayTitle}</strong> ({monthDays.length}d)
            </span>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                <AlertCircle className="size-3" />
                {pendingEdits.size} uncommitted
              </span>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {isTodayInSelectedMonth && (
          <>
            {isLockedToday ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 sm:size-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      Today&#39;s Attendance Finalized &amp; Locked
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Attendance records for today have been submitted and locked. Further edits are disabled.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-8 sm:size-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">
                      Today ({todayStr}) is Open for Attendance Marking
                    </h4>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Cycle status on today&#39;s column: <strong>P</strong> → <strong>HD</strong> → <strong>L</strong> → <strong>A</strong>. Tap Save &amp; Lock when done.
                    </p>
                  </div>
                </div>
                {hasUnsavedChanges && (
                  <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="self-end sm:self-center shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                  >
                    Save &amp; Lock Now
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 text-[11px] sm:text-xs">Click Cycle:</span>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-emerald-600 text-white">
                1st: P
              </span>
              <span className="text-slate-400 text-[10px]">→</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-500 text-white">
                2nd: HD
              </span>
              <span className="text-slate-400 text-[10px]">→</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-blue-600 text-white">
                3rd: L
              </span>
              <span className="text-slate-400 text-[10px]">→</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-rose-500 text-white">
                4th: A
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-600" /> Today (Open)
            </span>
            <span className="flex items-center gap-1">
              <Lock className="size-3 text-slate-400" /> Blocked
            </span>
          </div>
        </div>

        {/* Full Month Grid Matrix Table with Mobile Responsive Scrolling */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto touch-pan-x">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  {/* Sticky Employee Header */}
                  <th className="sticky left-0 z-20 bg-slate-100 py-3 px-3 sm:px-4 text-left min-w-[140px] sm:min-w-[200px] border-r border-slate-200 shadow-xs">
                    Employee
                  </th>

                  {/* All Days of the Month Columns */}
                  {monthDays.map((col) => {
                    const isToday = col.isToday;
                    return (
                      <th
                        key={col.dateStr}
                        ref={isToday ? todayColumnRef : null}
                        className={`py-2.5 sm:py-3 px-1.5 sm:px-2 min-w-[55px] sm:min-w-[70px] border-l border-slate-200 transition-colors ${
                          isToday
                            ? 'bg-blue-100/90 text-blue-950 border-b-2 border-b-blue-600 font-extrabold shadow-inner'
                            : 'text-slate-500'
                        }`}
                      >
                        <div className="text-[11px] font-bold leading-tight">{col.dayNumber}</div>
                        <div className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-500 mt-0.5">
                          {col.dayName}
                        </div>
                        <div className="text-[9px] uppercase font-bold mt-0.5 tracking-tighter">
                          {isToday ? (
                            <span className="text-blue-800 flex items-center justify-center gap-0.5">
                              {isLockedToday ? <Lock className="size-2.5 text-blue-800" /> : null}
                              {isLockedToday ? 'Locked' : 'Today'}
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center justify-center gap-0.5">
                              <Lock className="size-2 text-slate-400" />
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={monthDays.length + 1} className="py-20 text-center text-slate-400">
                      <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Loading monthly attendance grid...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={monthDays.length + 1} className="py-20 text-center text-slate-400">
                      No assigned team members found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Sticky Employee Row */}
                      <td className="sticky left-0 z-10 bg-white py-2.5 sm:py-3 px-3 sm:px-4 text-left border-r border-slate-200 shadow-xs">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[130px] sm:max-w-none">
                          {emp.fullName}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                          {emp.employeeCode}
                        </div>
                      </td>

                      {/* Day Cells */}
                      {monthDays.map((col) => {
                        const status = getEffectiveStatus(emp._id, col.dateStr);
                        const isToday = col.isToday;
                        const isCellClickable = isToday && !isLockedToday;
                        const isPending = isToday && pendingEdits.has(emp._id);

                        return (
                          <td
                            key={col.dateStr}
                            className={`py-2 px-1 border-l border-slate-100 ${
                              isToday ? 'bg-blue-50/40' : col.isPast ? 'bg-slate-50/20' : 'bg-slate-50/50'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={!isCellClickable}
                              onClick={() => handleCellClick(emp, col.dateStr)}
                              title={
                                !isToday
                                  ? col.isPast
                                    ? 'Past date is blocked (read-only)'
                                    : 'Future date is blocked (read-only)'
                                  : isLockedToday
                                  ? 'Today is finalized & locked'
                                  : `Click to cycle status: ${status || 'Unmarked'}`
                              }
                              className={`size-8 sm:size-9 rounded-lg sm:rounded-xl transition-all mx-auto flex items-center justify-center text-[11px] sm:text-xs font-bold relative ${getBadgeStyle(
                                status
                              )} ${
                                isCellClickable
                                  ? 'hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-transparent hover:ring-blue-400'
                                  : 'cursor-not-allowed opacity-80 select-none'
                              }`}
                            >
                              {getShortLabel(status)}
                              {isPending && !isLockedToday && (
                                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-white" />
                              )}
                              {isLockedToday && isToday && (
                                <Lock className="absolute -bottom-1 -right-1 size-2.5 text-slate-800 bg-white rounded-full p-0.5 shadow-xs" />
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
      </div>

      {/* Mobile Sticky Bottom Floating Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-800 truncate">Today: {todayStr}</div>
          <div className="text-[10px] text-slate-500 truncate">
            {isLockedToday ? 'Attendance Locked' : hasUnsavedChanges ? `${pendingEdits.size} uncommitted changes` : 'Ready to mark'}
          </div>
        </div>
        <div>
          {isLockedToday ? (
            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Lock className="size-3 text-emerald-700" />
              Locked
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={loading || employees.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-xs"
            >
              <Lock className="size-3" />
              Save &amp; Lock
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal to Save & Lock Attendance */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Lock className="size-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Save &amp; Lock Attendance?
                </h3>
                <p className="text-xs text-slate-500">Date: {todayStr}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Once you click <strong>Save &amp; Lock</strong>, today&#39;s attendance will be submitted to the database and permanently locked. You will not be able to edit it anymore.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveAndLock}
                disabled={submittingLock}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingLock ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Locking...
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" />
                    Save &amp; Lock Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
