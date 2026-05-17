import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Twitter'];
const PLATFORM_COLORS = {
  YouTube: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error)]/30',
  Instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  TikTok: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border)]',
  Facebook: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  Twitter: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    platform: 'YouTube',
    account_name: '',
    account_url: '',
    account_username: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data?.accounts || []);
    } catch {
      setAccounts([]);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      platform: 'YouTube',
      account_name: '',
      account_url: '',
      account_username: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (acc) => {
    setEditingId(acc.id);
    setForm({
      platform: acc.platform || 'YouTube',
      account_name: acc.account_name || '',
      account_url: acc.account_url || '',
      account_username: acc.account_username || '',
      notes: acc.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.account_name?.trim() && !form.account_url?.trim() && !form.account_username?.trim()) {
      toast.error('Enter account name, URL or username');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/accounts/${editingId}`, form);
        toast.success('Account updated');
      } else {
        await api.post('/accounts', form);
        toast.success('Account added');
      }
      setModalOpen(false);
      fetchAccounts();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/accounts/${id}`);
      toast.success('Account removed');
      fetchAccounts();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout title="My Accounts">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-[var(--text-muted)] text-sm">Save up to 20 accounts for quick ordering. Max 20.</p>
          <Button onClick={openAdd} className="bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30">
            <Plus size={18} className="mr-2" />
            Add Account
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="p-8 text-center text-[var(--text-muted)]">
            No saved accounts. Add one to quickly place orders.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <Card key={acc.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${PLATFORM_COLORS[acc.platform] || 'bg-[var(--bg-hover)]'}`}>
                    {acc.platform}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(acc)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(acc.id)}
                      disabled={deletingId === acc.id}
                      className="text-[var(--error)] hover:text-[var(--error)]"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex-1">
                  <div className="font-medium text-[var(--text-primary)]">{acc.account_name || acc.account_username || 'Unnamed'}</div>
                  {(acc.account_url || acc.account_username) && (
                    <div className="text-[var(--text-muted)] text-sm truncate">{acc.account_url || `@${acc.account_username}`}</div>
                  )}
                  {acc.notes && <div className="text-[var(--text-muted)] text-xs mt-1 line-clamp-2">{acc.notes}</div>}
                </div>
                <Link to={`/dashboard/new-order?link=${encodeURIComponent(acc.account_url || acc.account_username || '')}`} className="mt-3">
                  <Button variant="outline" size="sm" className="w-full border-neon-green/30 text-neon-green hover:bg-neon-green/10">
                    <ShoppingCart size={14} className="mr-2" />
                    Quick Order
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="glass border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">{editingId ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[var(--text-muted)]">Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger className="bg-deep-navy border-[var(--border)] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[var(--text-muted)]">Account Name (label)</Label>
              <Input
                value={form.account_name}
                onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                placeholder="e.g. Main Channel"
                className="bg-deep-navy border-[var(--border)] mt-1"
              />
            </div>
            <div>
              <Label className="text-[var(--text-muted)]">Account URL or Username</Label>
              <Input
                value={form.account_url}
                onChange={(e) => setForm((f) => ({ ...f, account_url: e.target.value }))}
                placeholder="https://... or @username"
                className="bg-deep-navy border-[var(--border)] mt-1"
              />
            </div>
            <div>
              <Label className="text-[var(--text-muted)]">Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                className="bg-deep-navy border-[var(--border)] mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-[var(--border)]">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30">
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
