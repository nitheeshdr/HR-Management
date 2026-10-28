'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface SupervisorItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  assignedCount: number;
  createdAt: string;
}

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<SupervisorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New supervisor form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Edit supervisor form
  const [editData, setEditData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    isActive: true,
  });

  const fetchSupervisors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supervisors');
      if (res.ok) {
        const data = await res.json();
        setSupervisors(data.supervisors || []);
      }
    } catch {
      toast.error('Failed to load supervisors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/supervisors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentStatus,
          reason: `Admin changed supervisor active status to ${!currentStatus}`,
        }),
      });

      if (res.ok) {
        toast.success(`Supervisor status updated`);
        fetchSupervisors();
      } else {
        toast.error('Failed to update supervisor status');
      }
    } catch {
      toast.error('Error updating status');
    }
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create supervisor');
        return;
      }

      toast.success(`Supervisor ${data.name} created successfully!`);
      setIsCreateOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchSupervisors();
    } catch {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (sup: SupervisorItem) => {
    setEditData({
      id: sup._id,
      name: sup.name,
      email: sup.email,
      password: '',
      isActive: sup.isActive,
    });
    setIsEditOpen(true);
  };

  const handleUpdateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: editData.name,
        email: editData.email,
        isActive: editData.isActive,
      };
      if (editData.password && editData.password.trim()) {
        payload.password = editData.password.trim();
      }

      const res = await fetch(`/api/supervisors/${editData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update supervisor');
        return;
      }

      toast.success(`Supervisor ${data.name} updated successfully!`);
      setIsEditOpen(false);
      fetchSupervisors();
    } catch {
      toast.error('Failed to update supervisor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Supervisor Management"
        description="Admin full access: provision, edit accounts, reset passwords, and manage allocations"
      >
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20"
        >
          <UserPlus className="size-3.5" />
          Add Supervisor
        </button>
      </Header>

      <div className="p-8 space-y-6 max-w-6xl">
        {/* Supervisor Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Supervisor Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Team</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading supervisors...
                  </td>
                </tr>
              ) : supervisors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No supervisors provisioned yet. Click &quot;Add Supervisor&quot; above to create one.
                  </td>
                </tr>
              ) : (
                supervisors.map((sup) => (
                  <tr key={sup._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                          {sup.name.slice(0, 2).toUpperCase()}
                        </div>
                        <Link
                          href={`/admin/supervisors/${sup._id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {sup.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{sup.email}</td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/supervisors/${sup._id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold text-[11px] border border-slate-200 transition-colors"
                      >
                        <Users className="size-3 text-blue-600" />
                        {sup.assignedCount} employees
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      {sup.isActive ? (
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
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(sup.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/supervisors/${sup._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                        >
                          <Users className="size-3" />
                          View Team
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                        >
                          <Edit className="size-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(sup._id, sup.isActive)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                            sup.isActive
                              ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                              : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {sup.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supervisor Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="size-5 text-blue-600" />
                Provision New Supervisor
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSupervisor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex.rivera@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temporary Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
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
                      Creating...
                    </>
                  ) : (
                    'Create Supervisor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  Supervisor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditData({ ...editData, isActive: e.target.value === 'active' })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
