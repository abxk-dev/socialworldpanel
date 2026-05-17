import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, Plus, Loader2, DollarSign, Percent, ToggleLeft, ToggleRight, Trash2, Edit3, Hash } from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import api from '../../lib/axios';
import { useAuth } from '../../App';
import { useFormatRate } from '../../hooks/useFormatRate';

const defaultForm = {
  username: '',
  service_id: '',
  pricing_type: 'percentage',
  pricing_value: 10,
  note: '',
  allow_promo_stack: false,
  is_active: true,
};

export default function AdminUserPricing() {
  const { token } = useAuth();
  const { formatRate } = useFormatRate();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    api
      .get('/admin/user-pricing', { headers, withCredentials: true })
      .then((r) => {
        const data = Array.isArray(r.data?.data) ? r.data.data : r.data?.data?.items || r.data?.data || r.data || [];
        setList(data);
      })
      .catch((err) => {
        const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to load custom pricing';
        toast.error(msg);
        setList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    fetchAll();
  }, [token]);

  const filtered = useMemo(() => {
    return (list || []).filter((p) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !(p.username || '').toLowerCase().includes(s) &&
          !(p.service_name || '').toLowerCase().includes(s) &&
          !(String(p.service_id || '')).toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      return true;
    });
  }, [list, search, statusFilter]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setCreateOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      username: row.username || '',
      service_id: row.service_id ? String(row.service_id) : '',
      pricing_type: row.pricing_type || 'percentage',
      pricing_value: row.pricing_value ?? 10,
      note: row.note || '',
      allow_promo_stack: !!row.allow_promo_stack,
      is_active: row.is_active !== false,
    });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.username || !form.service_id) {
      toast.error('Username and service_id are required');
      return;
    }
    const payload = {
      username: form.username,
      service_id: form.service_id,
      pricing_type: form.pricing_type,
      pricing_value: Number(form.pricing_value) || 0,
      note: form.note || undefined,
      allow_promo_stack: !!form.allow_promo_stack,
      is_active: !!form.is_active,
    };
    if (!payload.pricing_value || payload.pricing_value <= 0) {
      toast.error('Pricing value must be positive');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/user-pricing/${editingId}`, payload, { headers, withCredentials: true });
        toast.success('Custom pricing updated');
        setEditOpen(false);
      } else {
        await api.post('/admin/user-pricing', payload, { headers, withCredentials: true });
        toast.success('Custom pricing created');
        setCreateOpen(false);
      }
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row) => {
    try {
      await api.put(`/admin/user-pricing/${row._id}/toggle`, {}, { headers, withCredentials: true });
      fetchAll();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete custom pricing for ${row.username}?`)) return;
    try {
      await api.delete(`/admin/user-pricing/${row._id}`, { headers, withCredentials: true });
      toast.success('Deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <AdminLayout title="User Custom Pricing">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search by username, service name, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-deep-navy border-white/10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-deep-navy border-white/10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-deep-navy border-white/10">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openCreate} className="bg-electric-blue text-black font-semibold">
            <Plus size={16} className="mr-2" />
            New Custom Price
          </Button>
        </div>

        <Card className="glass border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-electric-blue" />
              <h2 className="font-exo font-semibold text-white text-sm sm:text-base">Per-user Pricing</h2>
            </div>
            {loading && <Loader2 size={18} className="animate-spin text-gray-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-left px-3 py-2">Service</th>
                  <th className="text-left px-3 py-2">Pricing</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">Meta</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {loading ? 'Loading custom pricing…' : 'No custom pricing entries found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const base = row.original_price ?? 0;
                    const final = row.final_price ?? base;
                    const diff = base - final;
                    const pct =
                      base > 0 && diff > 0 ? Math.round((diff / base) * 100) : row.pricing_type === 'percentage'
                        ? row.pricing_value
                        : null;
                    return (
                      <tr key={row._id} className="border-t border-white/5">
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col">
                            <span className="text-white text-sm">{row.username}</span>
                            {row.user_email && (
                              <span className="text-xs text-gray-400 truncate max-w-[160px]">
                                {row.user_email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-gray-200">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-white truncate max-w-[200px]">
                              {row.service_name || 'Service'}
                            </span>
                            <span className="font-mono text-[11px] text-gray-400">
                              <Hash size={11} className="inline mr-1" />
                              {String(row.service_id || '').slice(0, 10)}…
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-0.5 text-xs text-gray-200">
                            <div>
                              <span className="text-gray-400 mr-1">Base:</span>
                              <span className="line-through text-gray-500">
                                {formatRate(base)}/1000
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 mr-1">Custom:</span>
                              <span className="text-neon-green font-semibold">
                                {formatRate(final)}/1000
                              </span>
                            </div>
                            {diff > 0 && (
                              <div className="text-emerald-300">
                                -{formatRate(diff)}/1000 {pct ? `(${pct}% off)` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-gray-400 hidden md:table-cell">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              {row.pricing_type === 'fixed' ? (
                                <DollarSign size={11} className="text-cyan-400" />
                              ) : (
                                <Percent size={11} className="text-cyan-400" />
                              )}
                              <span>
                                {row.pricing_type === 'fixed'
                                  ? `Fixed price: ${formatRate(row.pricing_value)}/1000`
                                  : `Discount: ${row.pricing_value ?? 0}%`}
                              </span>
                            </div>
                            {row.allow_promo_stack && (
                              <div>
                                <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40 text-[10px]">
                                  Promo stacking allowed
                                </Badge>
                              </div>
                            )}
                            {row.note && (
                              <div className="text-[11px] text-gray-500 line-clamp-2">{row.note}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Badge
                            className={
                              row.is_active
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-500/20 text-red-300 border-red-500/40'
                            }
                          >
                            {row.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {row.updated_at && (
                            <div className="text-[11px] text-gray-500 mt-1">
                              Updated {new Date(row.updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-300 hover:text-white"
                              onClick={() => openEdit(row)}
                              title="Edit"
                            >
                              <Edit3 size={15} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-300 hover:text-white"
                              onClick={() => handleToggle(row)}
                              title={row.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {row.is_active ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(row)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={createOpen || editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditOpen(false);
          }
        }}
      >
        <DialogContent className="glass border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <DollarSign size={18} className="text-electric-blue" />
              {editingId ? 'Edit Custom Pricing' : 'Create Custom Pricing'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Username or User ID</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.trim() }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="exact username or numeric user ID"
                />
              </div>
              <div>
                <Label className="text-gray-300 flex items-center gap-1">
                  <Hash size={14} />
                  Service ID (number shown in Services list, or Mongo _id)
                </Label>
                <Input
                  value={form.service_id}
                  onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value.trim() }))}
                  className="mt-1 bg-deep-navy border-white/10 font-mono text-xs"
                  placeholder="e.g. 4862 (the # in the Services table) or Mongo _id"
                />
              </div>
              <div>
                <Label className="text-gray-300">Pricing type</Label>
                <Select
                  value={form.pricing_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, pricing_type: v }))}
                >
                  <SelectTrigger className="mt-1 bg-deep-navy border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-navy border-white/10">
                    <SelectItem value="percentage">Percentage discount</SelectItem>
                    <SelectItem value="fixed">Fixed price per 1k</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">
                  {form.pricing_type === 'percentage' ? 'Percent off %' : 'Fixed price per 1000'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pricing_value}
                  onChange={(e) => setForm((f) => ({ ...f, pricing_value: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-gray-300">Internal note (optional)</Label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="Why this user has special pricing"
                />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      form.allow_promo_stack ? 'bg-purple-500' : 'bg-white/20'
                    }`}
                    onClick={() => setForm((f) => ({ ...f, allow_promo_stack: !f.allow_promo_stack }))}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        form.allow_promo_stack ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-300">Allow stacking with promo codes</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      form.is_active ? 'bg-emerald-500' : 'bg-white/20'
                    }`}
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-300">
                    {form.is_active ? 'Pricing is active' : 'Pricing is disabled'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setEditOpen(false);
                }}
                className="border-white/20 text-gray-200"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-electric-blue text-black">
                {saving ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

