import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Plus, Package, Edit2, Trash2, X } from 'lucide-react';
import api from '../../lib/axios';
import { Toaster, toast } from '../../components/ui/sonner';
import { normalizeAdminServiceId } from '../../lib/utils';

const EMPTY_BUNDLE = {
  _id: null,
  name: '',
  description: '',
  category_id: '',
  price: '',
  image_url: '',
  is_active: true,
  services: [
    { service_id: '', quantity: '' },
    { service_id: '', quantity: '' },
  ],
};

const AdminBundles = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bundles, setBundles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(EMPTY_BUNDLE);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bundlesRes, catsRes] = await Promise.all([
        api.get('/admin/bundles', { withCredentials: true }),
        api.get('/admin/category-management/flat', { withCredentials: true }),
      ]);
      const b = bundlesRes.data?.bundles || [];
      const rawCats =
        (Array.isArray(catsRes?.data) ? catsRes.data : catsRes?.data?.categories) || [];
      const normalizeId = (v) => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        const s = typeof v?.toString === 'function' ? v.toString() : String(v);
        const m = s.match(/^ObjectId\(\"?([0-9a-fA-F]{24})\"?\)$/);
        return m ? m[1] : s;
      };
      const c = rawCats
        .map((cat) => ({
          ...cat,
          _id: normalizeId(cat?._id ?? cat?.id ?? cat?.category_id ?? cat?.categoryId),
        }))
        .filter((cat) => cat?._id);
      setBundles(b);
      setCategories(c);
    } catch (e) {
      toast.error('Failed to load bundles');
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditing(EMPTY_BUNDLE);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (bundle) => {
    setEditing({
      _id: bundle._id,
      name: bundle.name || '',
      description: bundle.description || '',
      category_id: bundle.category_id || '',
      price: bundle.price ?? '',
      image_url: bundle.image_url || '',
      is_active: bundle.is_active !== false,
      services: (bundle.services || []).map((s) => ({
        service_id: s.service_id || '',
        quantity: s.quantity ?? '',
      })),
    });
    setOpen(true);
  };

  const handleChangeField = (field, value) => {
    setEditing((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeService = (index, field, value) => {
    setEditing((prev) => {
      const next = prev.services.slice();
      next[index] = { ...next[index], [field]: value };
      return { ...prev, services: next };
    });
  };

  const addSubServiceRow = () => {
    setEditing((prev) => {
      if (prev.services.length >= 5) return prev;
      return {
        ...prev,
        services: [...prev.services, { service_id: '', quantity: '' }],
      };
    });
  };

  const removeSubServiceRow = (index) => {
    setEditing((prev) => {
      if (prev.services.length <= 2) return prev;
      const next = prev.services.slice();
      next.splice(index, 1);
      return { ...prev, services: next };
    });
  };

  const handleSave = async () => {
    const services = editing.services
      .map((row) => ({
        service_id: normalizeAdminServiceId(row.service_id),
        quantity: Math.max(1, parseInt(row.quantity, 10) || 1),
      }))
      .filter((row) => row.service_id);
    if (services.length < 2) {
      toast.error('Enter at least two sub-services with valid service IDs.');
      return;
    }
    if (services.length > 5) {
      toast.error('Maximum five sub-services per bundle.');
      return;
    }
    const payload = {
      name: editing.name,
      description: editing.description,
      category_id: editing.category_id || null,
      price: editing.price,
      image_url: editing.image_url,
      is_active: editing.is_active,
      services,
    };
    setSaving(true);
    try {
      if (editing._id) {
        await api.put(`/admin/bundles/${editing._id}`, payload, { withCredentials: true });
        toast.success('Bundle updated');
      } else {
        await api.post('/admin/bundles', payload, { withCredentials: true });
        toast.success('Bundle created');
      }
      setOpen(false);
      resetForm();
      fetchData();
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to save bundle';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bundle) => {
    if (!window.confirm(`Disable bundle "${bundle.name}"?`)) return;
    try {
      await api.delete(`/admin/bundles/${bundle._id}`, { withCredentials: true });
      toast.success('Bundle disabled');
      fetchData();
    } catch (e) {
      toast.error('Failed to disable bundle');
    }
  };

  const categoryName = (id) => {
    if (!id) return '—';
    const c = categories.find((x) => String(x._id) === String(id) || x.category_id === id);
    return c?.name || '—';
  };

  return (
    <AdminLayout title="Bundle Packages">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package size={22} className="text-cyber-purple" />
            Bundle Packages
          </h2>
          <Button onClick={openCreate} className="bg-cyber-purple hover:bg-cyber-purple/90">
            <Plus size={18} className="mr-2" />
            Create Bundle
          </Button>
        </div>

        <Card className="glass border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <span className="text-gray-400 text-sm">
              {loading ? 'Loading bundles...' : `${bundles.length} bundles`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-gray-300">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Price (USD)</th>
                  <th className="px-4 py-3 text-left">Sub-services</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundles.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                      No bundles yet. Click &quot;Create Bundle&quot; to add one.
                    </td>
                  </tr>
                )}
                {bundles.map((bundle) => (
                  <tr key={bundle._id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white">
                      <div className="font-medium">{bundle.name}</div>
                      {bundle.description && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">
                          {bundle.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {categoryName(bundle.category_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      ${Number(bundle.price || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(bundle.services || []).map((s, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="border-cyber-purple/40 text-xs text-gray-200"
                          >
                            {s.service_name || 'Service'} · {s.quantity}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {bundle.is_active !== false ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-600/20 text-gray-300 border-gray-500/40">
                          Disabled
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-gray-300 hover:text-white"
                        onClick={() => openEdit(bundle)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(bundle)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-[#090918] border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Package size={20} className="text-cyber-purple" />
                {editing._id ? 'Edit Bundle' : 'Create Bundle'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Bundle Name
                  </label>
                  <Input
                    value={editing.name}
                    onChange={(e) => handleChangeField('name', e.target.value)}
                    placeholder="Instagram Boost Pack"
                    className="bg-[#050510] border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Category
                  </label>
                  <Select
                    value={editing.category_id || ''}
                    onValueChange={(v) => handleChangeField('category_id', v)}
                  >
                    <SelectTrigger className="bg-[#050510] border-white/10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#050510] border-white/10">
                      {categories.map((c) => (
                        <SelectItem key={c._id || c.category_id} value={String(c._id || c.category_id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Description
                </label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => handleChangeField('description', e.target.value)}
                  placeholder="Grow your post with views, likes & comments"
                  className="bg-[#050510] border-white/10 min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Fixed Price (USD)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.price}
                    onChange={(e) => handleChangeField('price', e.target.value)}
                    placeholder="2.99"
                    className="bg-[#050510] border-white/10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Image URL (optional)
                </label>
                <Input
                  value={editing.image_url}
                  onChange={(e) => handleChangeField('image_url', e.target.value)}
                  placeholder="https://..."
                  className="bg-[#050510] border-white/10"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    Sub-Services (2–5)
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-cyber-purple/40 text-cyber-purple hover:bg-cyber-purple/10"
                    onClick={addSubServiceRow}
                    disabled={editing.services.length >= 5}
                  >
                    <Plus size={14} className="mr-1" />
                    Add Sub-Service
                  </Button>
                </div>
                <div className="space-y-2">
                  {editing.services.map((s, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-[#050510] border border-white/10 rounded-lg p-2"
                    >
                      <div className="col-span-7">
                        <Select
                          value={s.service_id || ''}
                          onValueChange={(v) => handleChangeService(idx, 'service_id', v)}
                        >
                          <SelectTrigger className="bg-transparent border-white/10 text-xs">
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#050510] border-white/10 max-h-64">
                            {services.map((svc) => (
                              <SelectItem key={svc.service_id} value={String(svc.service_id)}>
                                {serviceLabel(svc.service_id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input
                          type="number"
                          min="1"
                          value={s.quantity}
                          onChange={(e) => handleChangeService(idx, 'quantity', e.target.value)}
                          placeholder="Qty per 1 bundle"
                          className="bg-transparent border-white/10 text-xs"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {editing.services.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeSubServiceRow(idx)}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/10 text-gray-300"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-cyber-purple hover:bg-cyber-purple/90"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Bundle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminBundles;
