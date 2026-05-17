import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, DollarSign, BarChart2, Loader2, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { useCurrency } from '../../context/CurrencyContext';

const AdminResellers = () => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [addBalanceOpen, setAddBalanceOpen] = useState(null);
  const [statsOpen, setStatsOpen] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [editOpen, setEditOpen] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [balanceAmount, setBalanceAmount] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    custom_domain: '',
    default_markup_percentage: 30,
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchResellers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/resellers', { headers, withCredentials: true });
      setResellers(res.data.resellers || []);
    } catch (err) {
      toast.error('Failed to load resellers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password || !createForm.custom_domain) {
      toast.error('Fill name, email, password, and domain');
      return;
    }
    try {
      await api.post('/admin/resellers', createForm, { headers, withCredentials: true });
      toast.success('Reseller created');
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', custom_domain: '', default_markup_percentage: 30 });
      fetchResellers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create reseller');
    }
  };

  const handleAddBalance = async () => {
    const r = addBalanceOpen;
    if (!r || !(parseFloat(balanceAmount) > 0)) return;
    try {
      await api.post(`/admin/resellers/${r._id}/add-balance`, { amount: parseFloat(balanceAmount) }, { headers, withCredentials: true });
      toast.success('Balance added');
      setAddBalanceOpen(null);
      setBalanceAmount('');
      fetchResellers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add balance');
    }
  };

  const handleSuspend = async (r) => {
    if (!window.confirm(`Suspend ${r.name}? Their domain will stop working.`)) return;
    try {
      await api.delete(`/admin/resellers/${r._id}`, { headers, withCredentials: true });
      toast.success('Reseller suspended');
      fetchResellers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to suspend');
    }
  };

  const openStats = (r) => {
    setStatsOpen(r);
    setStatsData(null);
    if (r?._id) {
      api.get(`/admin/resellers/${r._id}/stats`, { headers, withCredentials: true })
        .then((res) => setStatsData(res.data))
        .catch(() => toast.error('Failed to load stats'));
    }
  };

  const openEdit = (r) => {
    setEditOpen(r);
    setEditForm({
      name: r.name || '',
      email: r.email || '',
      custom_domain: r.custom_domain || '',
      status: r.status || 'active',
      default_markup_percentage: r.pricing?.default_markup_percentage ?? 30,
      password: '',
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editOpen?._id) return;
    const payload = {
      name: editForm.name,
      email: editForm.email,
      custom_domain: editForm.custom_domain,
      status: editForm.status,
      pricing: { markup_type: 'percentage', default_markup_percentage: editForm.default_markup_percentage },
    };
    if (editForm.password && editForm.password.length >= 6) payload.password = editForm.password;
    try {
      await api.put(`/admin/resellers/${editOpen._id}`, payload, { headers, withCredentials: true });
      toast.success('Reseller updated');
      setEditOpen(null);
      fetchResellers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <AdminLayout title="Resellers">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-exo font-bold text-white flex items-center gap-2">
            <Users size={28} className="text-cyber-purple" />
            Resellers
          </h1>
          <Button className="bg-cyber-purple hover:bg-cyber-purple/90" onClick={() => setCreateOpen(true)}>
            <Plus size={18} className="mr-2" />
            Create Reseller
          </Button>
        </div>

        <Card className="p-0 border-white/10">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 size={32} className="animate-spin text-cyber-purple" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cyber-purple/10">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Domain</th>
                    <th className="text-left p-4 text-gray-400 font-medium">DNS</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Users</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Revenue</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Profit</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Created</th>
                    <th className="p-4 text-right text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resellers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500">
                        No resellers yet. Create one to get started.
                      </td>
                    </tr>
                  ) : (
                    resellers.map((r) => (
                      <tr key={r._id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-4 font-medium text-white">
                          <button type="button" onClick={() => openStats(r)} className="hover:underline text-left flex items-center gap-1">
                            {r.name}
                            <BarChart2 size={14} className="text-cyber-purple opacity-70" />
                          </button>
                        </td>
                        <td className="p-4 text-gray-300">{r.custom_domain || '—'}</td>
                        <td className="p-4">
                          {r.domain_verified ? (
                            <span className="text-neon-green flex items-center gap-1" title="DNS verified">✅ DNS verified</span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1" title="DNS pending">⏳ DNS pending</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={r.status === 'active' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-400'}>
                            {r.status || 'active'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right text-gray-400">{r.total_users ?? 0}</td>
                        <td className="p-4 text-right text-neon-green">{formatPrice(r.total_revenue ?? 0)}</td>
                        <td className="p-4 text-right text-cyber-purple">{formatPrice(r.total_profit ?? 0)}</td>
                        <td className="p-4 text-gray-400 text-sm">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="outline" className="border-cyber-purple/40 text-cyber-purple" onClick={() => openEdit(r)}>
                              <Edit size={14} className="mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="border-cyber-purple/40 text-cyber-purple" onClick={() => { setAddBalanceOpen(r); setBalanceAmount(''); }}>
                              <DollarSign size={14} className="mr-1" /> Add balance
                            </Button>
                            {r.status === 'active' && (
                              <Button size="sm" variant="outline" className="border-red-500/40 text-red-400" onClick={() => handleSuspend(r)}>
                                Suspend
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-deep-navy border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Create Reseller</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Business name</Label>
              <Input className="mt-1 bg-deep-navy border-white/10" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="John's SMM Panel" required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" className="mt-1 bg-deep-navy border-white/10" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@johnsmmpanel.com" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" className="mt-1 bg-deep-navy border-white/10" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" required minLength={6} />
            </div>
            <div>
              <Label>Custom domain</Label>
              <Input className="mt-1 bg-deep-navy border-white/10" value={createForm.custom_domain} onChange={(e) => setCreateForm((f) => ({ ...f, custom_domain: e.target.value.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') }))} placeholder="johnsmmpanel.com" required />
            </div>
            <div>
              <Label>Default markup %</Label>
              <Input type="number" min={0} step={1} className="mt-1 bg-deep-navy border-white/10" value={createForm.default_markup_percentage} onChange={(e) => setCreateForm((f) => ({ ...f, default_markup_percentage: parseInt(e.target.value, 10) || 30 }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-cyber-purple hover:bg-cyber-purple/90">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addBalanceOpen} onOpenChange={(open) => !open && setAddBalanceOpen(null)}>
        <DialogContent className="bg-deep-navy border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Add balance to {addBalanceOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" min={0.01} step={0.01} className="mt-1 bg-deep-navy border-white/10" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="0.00" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddBalanceOpen(null)}>Cancel</Button>
              <Button className="bg-cyber-purple hover:bg-cyber-purple/90" onClick={handleAddBalance} disabled={!(parseFloat(balanceAmount) > 0)}>Add</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statsOpen} onOpenChange={(open) => !open && setStatsOpen(null)}>
        <DialogContent className="bg-deep-navy border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 size={20} />
              {statsOpen?.name} — Stats
            </DialogTitle>
          </DialogHeader>
          {!statsData ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-cyber-purple" size={28} /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded p-3">
                  <div className="text-gray-400 text-sm">Total users</div>
                  <div className="text-xl font-bold text-white">{statsData.total_users ?? 0}</div>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="text-gray-400 text-sm">Total orders</div>
                  <div className="text-xl font-bold text-white">{statsData.total_orders ?? 0}</div>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="text-gray-400 text-sm">Total revenue</div>
                  <div className="text-xl font-bold text-neon-green">{formatPrice(statsData.reseller?.total_revenue ?? 0)}</div>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="text-gray-400 text-sm">Total profit</div>
                  <div className="text-xl font-bold text-cyber-purple">{formatPrice(statsData.reseller?.total_profit ?? 0)}</div>
                </div>
              </div>
              {statsData.revenue_by_day?.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm mb-2">Revenue (last 30 days)</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {statsData.revenue_by_day.map((d) => (
                      <div key={d._id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{d._id}</span>
                        <span className="text-neon-green">{formatPrice(d.revenue ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {statsData.top_services?.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm mb-2">Top 5 services</div>
                  <ul className="space-y-1">
                    {statsData.top_services.map((s, i) => (
                      <li key={s._id || i} className="flex justify-between text-sm text-gray-300">
                        <span className="truncate max-w-[200px]">{s._id}</span>
                        <span className="text-white">{s.count} orders · {formatPrice(s.revenue ?? 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOpen} onOpenChange={(open) => !open && setEditOpen(null)}>
        <DialogContent className="bg-deep-navy border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit reseller</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label>Business name</Label>
              <Input className="mt-1 bg-deep-navy border-white/10" value={editForm.name || ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" className="mt-1 bg-deep-navy border-white/10" value={editForm.email || ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <Label>Custom domain</Label>
              <Input className="mt-1 bg-deep-navy border-white/10" value={editForm.custom_domain || ''} onChange={(e) => setEditForm((f) => ({ ...f, custom_domain: e.target.value.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') }))} />
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 w-full rounded bg-deep-navy border border-white/10 px-3 py-2 text-white" value={editForm.status || 'active'} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <Label>Default markup %</Label>
              <Input type="number" min={0} step={1} className="mt-1 bg-deep-navy border-white/10" value={editForm.default_markup_percentage ?? 30} onChange={(e) => setEditForm((f) => ({ ...f, default_markup_percentage: parseInt(e.target.value, 10) || 30 }))} />
            </div>
            <div>
              <Label>New password (leave blank to keep)</Label>
              <Input type="password" className="mt-1 bg-deep-navy border-white/10" value={editForm.password || ''} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" minLength={6} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(null)}>Cancel</Button>
              <Button type="submit" className="bg-cyber-purple hover:bg-cyber-purple/90">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminResellers;
