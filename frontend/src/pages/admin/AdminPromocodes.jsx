import React, { useEffect, useMemo, useState } from 'react';
import { Percent, Tag, Search, Plus, Loader2, Calendar, Hash, ToggleLeft, ToggleRight, Trash2, Edit3 } from 'lucide-react';
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
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  max_discount: '',
  min_order_total: '',
  max_uses: '',
  max_uses_per_user: '',
  starts_at: '',
  expires_at: '',
  scope: 'all', // 'all' | 'specific' | 'exclude'
  applicable_services: '',
  is_active: true,
};

const sampleOrderAmounts = [5, 10, 25, 50, 100];

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return `$${n.toFixed(2)}`;
}

export default function AdminPromocodes() {
  const { token } = useAuth();
  const { formatPriceWithRateDecimals } = useFormatRate();
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
  const [sampleAmount, setSampleAmount] = useState(25);

  const fetchPromos = () => {
    setLoading(true);
    api
      .get('/promocodes', { headers, withCredentials: true })
      .then((r) => {
        const data = Array.isArray(r.data?.data) ? r.data.data : r.data?.data?.items || r.data?.data || r.data || [];
        setList(data);
      })
      .catch(() => {
        toast.error('Failed to load promo codes');
        setList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    fetchPromos();
  }, [token]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return (list || []).filter((p) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !(p.code || '').toLowerCase().includes(s) &&
          !(p.description || '').toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      if (statusFilter === 'active') {
        if (p.is_active === false) return false;
        if (p.expires_at && new Date(p.expires_at).getTime() < now) return false;
        if (typeof p.usage_limit === 'number' && typeof p.used_count === 'number' && p.usage_limit > 0 && p.used_count >= p.usage_limit) {
          return false;
        }
      }
      if (statusFilter === 'inactive') {
        if (p.is_active !== false) return false;
      }
      if (statusFilter === 'expired') {
        const until = p.valid_until || p.expires_at;
        if (!until || new Date(until).getTime() >= now) return false;
      }
      return true;
    });
  }, [list, search, statusFilter]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setCreateOpen(true);
  };

  const openEdit = (promo) => {
    setEditingId(promo._id);
    const validFrom = promo.valid_from ? new Date(promo.valid_from) : null;
    const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;
    setForm({
      code: promo.code || '',
      description: promo.description || '',
      discount_type: promo.discount_type || 'percentage',
      discount_value: promo.discount_value ?? 10,
      max_discount: promo.max_discount_cap ?? '',
      min_order_total: promo.min_order_value ?? '',
      max_uses: promo.usage_limit ?? '',
      max_uses_per_user: promo.usage_per_user ?? '',
      starts_at: validFrom ? validFrom.toISOString().slice(0, 16) : '',
      expires_at: validUntil ? validUntil.toISOString().slice(0, 16) : '',
      scope: promo.applicable_to === 'specific' ? 'specific' : promo.applicable_to === 'exclude' ? 'exclude' : 'all',
      applicable_services: Array.isArray(promo.service_ids)
        ? promo.service_ids.map((id) => String(id)).join(',')
        : '',
      is_active: promo.is_active !== false,
    });
    setEditOpen(true);
  };

  const calcSampleDiscount = () => {
    const amount = Number(sampleAmount) || 0;
    if (!amount || !form.discount_value) return { final: amount, discount: 0 };
    if (form.discount_type === 'fixed') {
      const discount = Math.min(Number(form.discount_value) || 0, amount);
      return { final: amount - discount, discount };
    }
    const pct = Number(form.discount_value) || 0;
    let discount = (pct / 100) * amount;
    const cap = Number(form.max_discount) || 0;
    if (cap > 0 && discount > cap) discount = cap;
    const final = Math.max(amount - discount, 0);
    return { final, discount };
  };

  const { final: sampleFinal, discount: sampleDiscount } = calcSampleDiscount();

  const handleSave = async (e) => {
    e?.preventDefault();
    const payload = {
      code: form.code,
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      max_discount_cap: form.max_discount ? Number(form.max_discount) : undefined,
      min_order_value: form.min_order_total ? Number(form.min_order_total) : undefined,
      usage_limit: form.max_uses !== '' && form.max_uses != null ? Number(form.max_uses) : null,
      usage_per_user: form.max_uses_per_user !== '' && form.max_uses_per_user != null ? Number(form.max_uses_per_user) : 0,
      valid_from: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
      valid_until: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      is_active: !!form.is_active,
    };
    if (form.scope === 'specific' || form.scope === 'exclude') {
      const ids = (form.applicable_services || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        toast.error('Enter at least one service ID or switch Applies to back to All services.');
        return;
      }
      payload.applicable_to = form.scope === 'specific' ? 'specific' : 'exclude';
      payload.service_ids = ids;
    }
    if (!payload.code) {
      toast.error('Code is required');
      return;
    }
    if (!payload.discount_value || payload.discount_value <= 0) {
      toast.error('Discount value must be positive');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/promocodes/${editingId}`, payload, { headers, withCredentials: true });
        toast.success('Promo updated');
        setEditOpen(false);
      } else {
        await api.post('/promocodes', payload, { headers, withCredentials: true });
        toast.success('Promo created');
        setCreateOpen(false);
      }
      fetchPromos();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save promo';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (promo) => {
    try {
      await api.put(`/promocodes/${promo._id}/toggle`, {}, { headers, withCredentials: true });
      fetchPromos();
    } catch {
      toast.error('Failed to toggle promo');
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete promo code ${promo.code}?`)) return;
    try {
      await api.delete(`/promocodes/${promo._id}`, { headers, withCredentials: true });
      toast.success('Promo deleted');
      fetchPromos();
    } catch {
      toast.error('Failed to delete promo');
    }
  };

  return (
    <AdminLayout title="Promo Codes">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search by code or description..."
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
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate} className="bg-electric-blue text-black font-semibold">
              <Plus size={16} className="mr-2" />
              New Promo Code
            </Button>
          </div>

          <Card className="glass border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-electric-blue" />
                <h2 className="font-exo font-semibold text-white text-sm sm:text-base">Promo Codes</h2>
              </div>
              {loading && <Loader2 size={18} className="animate-spin text-gray-400" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-gray-400">
                  <tr>
                    <th className="text-left px-3 py-2">Code</th>
                    <th className="text-left px-3 py-2">Discount</th>
                    <th className="text-left px-3 py-2 hidden md:table-cell">Conditions</th>
                    <th className="text-left px-3 py-2 hidden lg:table-cell">Usage</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        {loading ? 'Loading promo codes…' : 'No promo codes found.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => {
                      const isExpired = (p.valid_until || p.expires_at) && new Date(p.valid_until || p.expires_at).getTime() < Date.now();
                      const usage =
                        typeof p.used_count === 'number'
                          ? `${p.used_count}${p.usage_limit ? ` / ${p.usage_limit}` : ''}`
                          : p.usage_limit
                          ? `0 / ${p.usage_limit}`
                          : '—';
                      const typeLabel =
                        p.discount_type === 'fixed'
                          ? `${formatPriceWithRateDecimals(p.discount_value || 0)} off`
                          : `${p.discount_value ?? 0}% off`;
                      return (
                        <tr key={p._id || p.code} className="border-t border-white/5">
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col">
                              <span className="font-mono text-white text-sm">{(p.code || '').toUpperCase()}</span>
                              {p.description && (
                                <span className="text-xs text-gray-400 truncate max-w-xs">{p.description}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-gray-200">
                            <div className="flex flex-col gap-0.5">
                              <span>{typeLabel}</span>
                              {p.max_discount ? (
                                <span className="text-xs text-gray-400">
                                  Max discount {formatPriceWithRateDecimals(p.max_discount)}
                                </span>
                              ) : null}
                              {p.min_order_total ? (
                                <span className="text-xs text-gray-400">
                                  Min order {formatPriceWithRateDecimals(p.min_order_total)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-gray-400 hidden md:table-cell">
                            {p.applicable_service_ids && p.applicable_service_ids.length > 0 ? (
                              <div className="space-y-0.5">
                                <div>Services: {p.applicable_service_ids.length}</div>
                                <div className="text-[11px] opacity-80">
                                  {p.applicable_service_ids.slice(0, 3).join(', ')}
                                  {p.applicable_service_ids.length > 3 ? '…' : ''}
                                </div>
                              </div>
                            ) : (
                              <span>All services</span>
                            )}
                            {(p.starts_at || p.expires_at) && (
                              <div className="mt-1 space-y-0.5">
                                {p.starts_at && (
                                  <div>
                                    <span className="text-gray-500 mr-1">From</span>
                                    {new Date(p.starts_at).toLocaleDateString()}
                                  </div>
                                )}
                                {p.expires_at && (
                                  <div>
                                    <span className="text-gray-500 mr-1">Until</span>
                                    {new Date(p.expires_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-gray-300 hidden lg:table-cell">
                            <div>Uses: {usage}</div>
                            {typeof p.usage_per_user === 'number' && p.usage_per_user > 0 && (
                              <div>Per user: {p.usage_per_user}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col gap-1">
                              <Badge
                                className={
                                  p.is_active === false || isExpired
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }
                              >
                                {isExpired ? 'Expired' : p.is_active === false ? 'Inactive' : 'Active'}
                              </Badge>
                              {p.used_count > 0 && (
                                <span className="text-[11px] text-gray-400">
                                  Last used {p.last_used_at ? new Date(p.last_used_at).toLocaleDateString() : 'recently'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-300 hover:text-white"
                                onClick={() => openEdit(p)}
                                title="Edit"
                              >
                                <Edit3 size={15} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-300 hover:text-white"
                                onClick={() => handleToggle(p)}
                                title={p.is_active === false ? 'Activate' : 'Deactivate'}
                              >
                                {p.is_active === false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-400 hover:text-red-300"
                                onClick={() => handleDelete(p)}
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

        {/* Live calculator + tips */}
        <Card className="glass border-cyber-purple/40 w-full lg:w-80 self-start lg:sticky lg:top-24">
          <div className="px-4 py-2.5 border-b border-cyber-purple/40 flex items-center gap-2">
            <Percent size={18} className="text-cyber-purple" />
            <h3 className="font-exo font-semibold text-white text-sm">Live Discount Preview</h3>
          </div>
          <div className="p-4 space-y-3 text-xs sm:text-sm">
            <div>
              <Label className="text-gray-400 text-[11px] uppercase tracking-wide">Sample order amount</Label>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Input
                  type="number"
                  min="1"
                  value={sampleAmount}
                  onChange={(e) => setSampleAmount(e.target.value)}
                  className="bg-deep-navy border-white/10 h-8 w-24 text-xs"
                />
                <div className="flex flex-wrap gap-1">
                  {sampleOrderAmounts.map((a) => (
                    <Button
                      key={a}
                      variant="outline"
                      size="sm"
                      className={`h-8 px-2 text-[11px] border-white/15 ${
                        Number(sampleAmount) === a ? 'bg-white/10 text-white' : 'text-gray-300'
                      }`}
                      onClick={() => setSampleAmount(a)}
                    >
                      {formatMoney(a)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-black/40 border border-white/10 p-3 space-y-1 text-[11px]">
              <div className="flex justify-between text-gray-400">
                <span>Original</span>
                <span className="text-white font-medium">{formatMoney(Number(sampleAmount) || 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-300">
                <span>Discount from promo</span>
                <span className="font-medium">-{formatMoney(sampleDiscount)}</span>
              </div>
              <div className="flex justify-between text-gray-300 border-t border-white/10 pt-1 mt-1">
                <span>Final after promo</span>
                <span className="text-electric-blue font-semibold">
                  {formatMoney(sampleFinal)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              Uses the values from the promo form on the left to preview how much a customer would pay after discount.
            </p>
          </div>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={createOpen || editOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateOpen(false);
          setEditOpen(false);
        }
      }}>
        <DialogContent className="glass border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Tag size={18} className="text-electric-blue" />
              {editingId ? 'Edit Promo Code' : 'Create Promo Code'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="mt-1 bg-deep-navy border-white/10 font-mono uppercase"
                  placeholder="WELCOME10"
                />
              </div>
              <div>
                <Label className="text-gray-300">Discount type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v }))}
                >
                  <SelectTrigger className="mt-1 bg-deep-navy border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-navy border-white/10">
                    <SelectItem value="percentage">Percentage %</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">
                  Discount value {form.discount_type === 'percentage' ? '(%)' : '(amount)'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-300">Max discount (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_discount}
                  onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="No cap"
                />
              </div>
              <div>
                <Label className="text-gray-300">Min order total (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_order_total}
                  onChange={(e) => setForm((f) => ({ ...f, min_order_total: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-gray-300">Global usage limit (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.max_uses}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="0 = unlimited"
                />
              </div>
              <div>
                <Label className="text-gray-300">Per-user limit (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.max_uses_per_user}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses_per_user: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="0 = unlimited"
                />
              </div>
              <div>
                <Label className="text-gray-300 flex items-center gap-1">
                  <Calendar size={14} />
                  Starts at (optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-300 flex items-center gap-1">
                  <Calendar size={14} />
                  Expires at (optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-300 flex items-center gap-1">
                  <Hash size={14} />
                  Applies to
                </Label>
                <Select
                  value={form.scope}
                  onValueChange={(v) => setForm((f) => ({ ...f, scope: v }))}
                >
                  <SelectTrigger className="mt-1 bg-deep-navy border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-navy border-white/10">
                    <SelectItem value="all">All services</SelectItem>
                    <SelectItem value="specific">Only these services</SelectItem>
                    <SelectItem value="exclude">All except these services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.scope !== 'all' && (
                <div className="sm:col-span-2">
                  <Label className="text-gray-300 flex items-center gap-1">
                    <Hash size={14} />
                    Service IDs (MongoDB _id, comma separated)
                  </Label>
                  <Input
                    value={form.applicable_services}
                    onChange={(e) => setForm((f) => ({ ...f, applicable_services: e.target.value }))}
                    className="mt-1 bg-deep-navy border-white/10 font-mono text-xs"
                    placeholder="e.g. 65f1a..., 65f1b..."
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Paste service `_id` values from the admin Services page.
                    {form.scope === 'specific'
                      ? ' This promo will work only on those services.'
                      : ' This promo will work on all services except those listed.'}
                  </p>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label className="text-gray-300">Description (shown in admin only)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="Internal note, e.g. Launch week 20% off"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3 mt-2">
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
                  {form.is_active ? 'Promo is active' : 'Promo is disabled'}
                </span>
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
                  'Save Promo'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

