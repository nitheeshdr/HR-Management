'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import {
  History,
  Shield,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogItem {
  _id: string;
  actorId?: {
    name?: string;
    email?: string;
    role?: string;
  };
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected log for inspecting details
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch {
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('UPDATE') || action.includes('CORRECT')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('TERMINATE') || action.includes('DELETE')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="System Audit Logs"
        description="Append-only immutable record of all HR modifications, permissions, and attendance entries"
      />

      <div className="p-8 space-y-6 max-w-7xl">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE_EMPLOYEE">CREATE_EMPLOYEE</option>
              <option value="UPDATE_EMPLOYEE">UPDATE_EMPLOYEE</option>
              <option value="MARK_ATTENDANCE">MARK_ATTENDANCE</option>
              <option value="CORRECT_ATTENDANCE">CORRECT_ATTENDANCE</option>
              <option value="CREATE_SUPERVISOR">CREATE_SUPERVISOR</option>
              <option value="UPDATE_SUPERVISOR">UPDATE_SUPERVISOR</option>
              <option value="UPDATE_ONBOARDING">UPDATE_ONBOARDING</option>
              <option value="TERMINATE_EMPLOYEE">TERMINATE_EMPLOYEE</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Entity:</span>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="ATTENDANCE">ATTENDANCE</option>
              <option value="USER">USER</option>
              <option value="ONBOARDING">ONBOARDING</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Reason / Details</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                      No audit logs found matching criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-900">
                        {log.actorId?.name || 'System / Service'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-sans px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {log.actorRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-sans inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.entityType} ({log.entityId ? log.entityId.slice(-6) : '—'})
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate">
                        {log.reason || 'Operation recorded'}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="size-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {totalPages} ({totalCount} entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code className="size-4 text-blue-600" />
                Audit Log Payload: {selectedLog.action}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-4 text-slate-600">
                <span>Actor: <strong>{selectedLog.actorId?.name || selectedLog.actorRole}</strong></span>
                <span>Entity: <strong>{selectedLog.entityType} ({selectedLog.entityId})</strong></span>
              </div>
              {selectedLog.reason && (
                <div className="p-2.5 rounded bg-blue-50 text-blue-900 font-medium">
                  Reason: {selectedLog.reason}
                </div>
              )}

              {selectedLog.before && (
                <div>
                  <div className="font-bold text-slate-700 mb-1">State Before:</div>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto text-[11px] font-mono max-h-48">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <div className="font-bold text-slate-700 mb-1">State After:</div>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto text-[11px] font-mono max-h-48">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
