import React, { useState, useEffect } from 'react';
import { Crown, Plus, Edit, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { useCurrency } from '../../context/CurrencyContext';

const AdminVipTiers = () => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    min_total_spend: '',
    discount_percent: '',
    is_active: true,
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchTiers = async () => {
    try {
      const res = await api.get('/admin/vip-tiers', { headers, withCredentials: true });
      setTiers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error('Failed to load VIP tiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, [token]);

  const resetForm = () => {
    setForm({ name: '', min_total_spend: '', discount_percent: '', is_active: true });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name || 'VIP',
        min_total_spend: parseFloat(form.min_total_spend) || 0,
        discount_percent: parseFloat(form.discount_percent) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        await api.put(`/admin/vip-tiers/${editing.vip_id}`, payload, { headers, withCredentials: true });
        toast.success('VIP tier updated');
      } else {
        await api.post('/admin/vip-tiers', payload, { headers, withCredentials: true });
        toast.success('VIP tier created');
      }
      setShowModal(false);
      resetForm();
      fetchTiers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (vipId) => {
    if (!confirm('Delete this VIP tier?')) return;
    try {
      await api.delete(`/admin/vip-tiers/${vipId}`, { headers, withCredentials: true });
      toast.success('Tier deleted');
      fetchTiers();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (tier) => {
    setEditing(tier);
    setForm({
      name: tier.name || '',
      min_total_spend: tier.min_total_spend ?? '',
      discount_percent: tier.discount_percent ?? '',
      is_active: tier.is_active !== false,
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <AdminLayout title="VIP Tiers">
        <div className="flex items-center justify-center p-12 text-gray-400">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="VIP Tiers">
      <Card className="glass p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-white font-exo font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-400" />
            VIP Tiers (Order Pricing)
          </h2>
          <Button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-electric-blue text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add tier
          </Button>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Users get a discount on orders based on their lifetime spend. Higher tiers apply when user total spend reaches min amount.
        </p>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Min total spend</TableHead>
              <TableHead className="text-gray-400">Discount %</TableHead>
              <TableHead className="text-gray-400">Active</TableHead>
              <TableHead className="text-gray-400 w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-gray-500 text-center py-8">
                  No VIP tiers yet. Add one to give discounts based on spend.
                </TableCell>
              </TableRow>
            ) : (
              tiers.map((t) => (
                <TableRow key={t.vip_id} className="border-white/10">
                  <TableCell className="text-white">{t.name}</TableCell>
                  <TableCell className="text-white">{formatPrice(t.min_total_spend || 0)}</TableCell>
                  <TableCell className="text-white">{t.discount_percent ?? 0}%</TableCell>
                  <TableCell className="text-white">{t.is_active !== false ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTier(t.vip_id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-deep-navy border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit VIP tier' : 'Add VIP tier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-400">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 bg-dark-bg border-white/10"
                placeholder="e.g. Gold"
              />
            </div>
            <div>
              <Label className="text-gray-400">Min total spend (lifetime)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.min_total_spend}
                onChange={(e) => setForm({ ...form, min_total_spend: e.target.value })}
                className="mt-1 bg-dark-bg border-white/10"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-gray-400">Discount % (0–100)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                className="mt-1 bg-dark-bg border-white/10"
                placeholder="5"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label className="text-gray-400">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-electric-blue text-black">{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminVipTiers;
