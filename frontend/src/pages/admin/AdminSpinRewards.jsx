import React, { useState, useEffect } from 'react';
import { Gift, Plus, Edit, Trash2 } from 'lucide-react';
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

const DEFAULT_PRIZES = [
  { id: 1, label: '$0.50 Credit', type: 'credit', value: 0.5, probability: 30, color: '#22c55e' },
  { id: 2, label: '$1.00 Credit', type: 'credit', value: 1, probability: 20, color: '#3b82f6' },
  { id: 3, label: '$2.00 Credit', type: 'credit', value: 2, probability: 10, color: '#8b5cf6' },
  { id: 4, label: '5% Discount', type: 'discount', value: 5, probability: 20, color: '#f59e0b' },
  { id: 5, label: '10% Discount', type: 'discount', value: 10, probability: 10, color: '#ef4444' },
  { id: 6, label: '50 Free Views', type: 'free_order', value: 50, probability: 7, color: '#06b6d4' },
  { id: 7, label: '$5.00 Credit', type: 'credit', value: 5, probability: 2, color: '#f97316' },
  { id: 8, label: '$10 JACKPOT!', type: 'credit', value: 10, probability: 1, color: '#ffd700' },
];

const PRIZE_TYPES = [
  { value: 'credit', label: 'Balance credit ($)' },
  { value: 'discount', label: 'Discount (%)' },
  { value: 'free_order', label: 'Free order (e.g. views)' },
];

const AdminSpinRewards = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spinEnabled, setSpinEnabled] = useState(true);
  const [prizes, setPrizes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({
    label: '',
    type: 'credit',
    value: '',
    probability: '10',
    color: '#22c55e',
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings', { headers, withCredentials: true });
      const data = res.data || {};
      setSpinEnabled(data.spin_enabled !== false);
      const list = Array.isArray(data.spin_prizes) && data.spin_prizes.length > 0
        ? data.spin_prizes
        : DEFAULT_PRIZES;
      setPrizes(list.map((p) => ({ ...p, id: p.id ?? 0 })));
    } catch (e) {
      toast.error('Failed to load settings');
      setPrizes(DEFAULT_PRIZES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const saveSettings = async (newPrizes, newSpinEnabled) => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        spin_prizes: newPrizes,
        spin_enabled: newSpinEnabled,
      }, { headers, withCredentials: true });
      setPrizes(newPrizes);
      setSpinEnabled(newSpinEnabled);
      toast.success('Spin rewards saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (checked) => {
    await saveSettings(prizes, checked);
  };

  const resetForm = () => {
    setForm({
      label: '',
      type: 'credit',
      value: '',
      probability: '10',
      color: '#22c55e',
    });
    setEditingIndex(null);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (index) => {
    const p = prizes[index];
    setForm({
      label: p.label || '',
      type: p.type || 'credit',
      value: String(p.value ?? ''),
      probability: String(p.probability ?? 10),
      color: p.color || '#22c55e',
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const valueNum = parseFloat(form.value);
    const probabilityNum = Math.max(0, parseInt(form.probability, 10) || 0);
    if (!form.label.trim()) {
      toast.error('Label is required');
      return;
    }
    const newPrize = {
      id: editingIndex !== null ? prizes[editingIndex].id : Math.max(0, ...prizes.map((p) => p.id)) + 1,
      label: form.label.trim(),
      type: form.type,
      value: valueNum,
      probability: probabilityNum,
      color: form.color || '#22c55e',
    };
    const newPrizes = editingIndex !== null
      ? prizes.map((p, i) => (i === editingIndex ? newPrize : p))
      : [...prizes, newPrize];
    saveSettings(newPrizes, spinEnabled);
    setShowModal(false);
    resetForm();
  };

  const deletePrize = (index) => {
    if (!confirm('Remove this reward from the wheel?')) return;
    const newPrizes = prizes.filter((_, i) => i !== index);
    if (newPrizes.length === 0) {
      toast.error('Keep at least one reward');
      return;
    }
    saveSettings(newPrizes, spinEnabled);
  };

  const totalWeight = prizes.reduce((s, p) => s + (p.probability || 0), 0);

  if (loading) {
    return (
      <AdminLayout title="Spin Rewards">
        <div className="flex items-center justify-center p-12 text-gray-400">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Spin Rewards">
      <Card className="p-6 border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-400" />
              Daily Spin Wheel Rewards
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Customize prizes shown on the wheel. Probability is relative weight (higher = more likely).
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="spin-enabled" className="text-gray-400 text-sm">Spin enabled</Label>
              <Switch
                id="spin-enabled"
                checked={spinEnabled}
                onCheckedChange={handleToggleEnabled}
                disabled={saving}
              />
            </div>
            <Button onClick={openAdd} className="bg-cyber-purple hover:bg-cyber-purple/90">
              <Plus className="h-4 w-4 mr-2" />
              Add reward
            </Button>
          </div>
        </div>

        {totalWeight > 0 && (
          <p className="text-gray-500 text-sm mb-4">
            Total weight: {totalWeight} (relative chances: {prizes.map((p) => `${Math.round((p.probability / totalWeight) * 100)}%`).join(', ')})
          </p>
        )}

        {prizes.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">
            No rewards yet. Add at least one to use the spin wheel.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Color</TableHead>
                  <TableHead className="text-gray-400">Label</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Value</TableHead>
                  <TableHead className="text-gray-400">Weight</TableHead>
                  <TableHead className="text-gray-400 w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prizes.map((p, i) => (
                  <TableRow key={p.id ?? i} className="border-white/10">
                    <TableCell>
                      <div
                        className="w-8 h-8 rounded border border-white/20"
                        style={{ backgroundColor: p.color || '#22c55e' }}
                      />
                    </TableCell>
                    <TableCell className="text-white font-medium">{p.label}</TableCell>
                    <TableCell className="text-gray-400 capitalize">{p.type?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-white">{p.value}</TableCell>
                    <TableCell className="text-gray-400">{p.probability}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(i)}>
                          <Edit className="h-4 w-4 text-cyan-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePrize(i)}
                          disabled={prizes.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); resetForm(); } }}>
        <DialogContent className="glass border-cyber-purple/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingIndex !== null ? 'Edit reward' : 'Add reward'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-400">Label (shown on wheel)</Label>
              <Input
                className="mt-1 bg-white/5 border-white/10 text-white"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. $5.00 Credit"
              />
            </div>
            <div>
              <Label className="text-gray-400">Type</Label>
              <select
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {PRIZE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-400">
                Value {form.type === 'credit' ? '($)' : form.type === 'discount' ? '(%)' : '(number e.g. views)'}
              </Label>
              <Input
                type="number"
                step={form.type === 'credit' ? 0.01 : 1}
                min={0}
                className="mt-1 bg-white/5 border-white/10 text-white"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === 'credit' ? '0.5' : form.type === 'discount' ? '5' : '50'}
              />
            </div>
            <div>
              <Label className="text-gray-400">Probability (relative weight)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1 bg-white/5 border-white/10 text-white"
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-gray-500 mt-1">Higher = more likely to be won</p>
            </div>
            <div>
              <Label className="text-gray-400">Segment color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  className="h-10 w-14 rounded border border-white/20 cursor-pointer"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <Input
                  className="flex-1 bg-white/5 border-white/10 text-white font-mono"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="#22c55e"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }} className="border-white/20">
                Cancel
              </Button>
              <Button type="submit" className="bg-cyber-purple hover:bg-cyber-purple/90" disabled={saving}>
                {saving ? 'Saving…' : editingIndex !== null ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSpinRewards;
