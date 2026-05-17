import React, { useState, useEffect } from 'react';
import { Gift, Settings, Users, History, Loader2, Plus, Minus } from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { useAuth } from '../../App';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useCurrency } from '../../context/CurrencyContext';

const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };

export default function AdminLoyalty() {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useState('settings');
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSettings = () => {
    setSettingsLoading(true);
    api.get('/admin/loyalty/settings', { headers, withCredentials: true })
      .then((r) => setSettings(r.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setSettingsLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchUsers = (page = 1, tier) => {
    setUsersLoading(true);
    const params = { page, limit: 20 };
    if (tier) params.tier = tier;
    api.get('/admin/loyalty/users', { headers, params, withCredentials: true })
      .then((r) => {
        setUsers(r.data.users || []);
        setUsersTotal(r.data.total ?? 0);
        setUsersPage(page);
      })
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  };

  const fetchTransactions = (page = 1, type, status) => {
    setTxLoading(true);
    const params = { page, limit: 20 };
    if (type) params.type = type;
    if (status) params.status = status;
    api.get('/admin/loyalty/transactions', { headers, params, withCredentials: true })
      .then((r) => {
        setTransactions(r.data.transactions || []);
        setTxTotal(r.data.total ?? 0);
        setTxPage(page);
      })
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  };

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    if (!settings) return;
    setSettingsSaving(true);
    try {
      await api.put('/admin/loyalty/settings', settings, { headers, withCredentials: true });
      toast.success('Settings saved');
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAdjust = async (e) => {
    e?.preventDefault();
    if (!adjustModal) return;
    const pts = parseInt(adjustPoints, 10);
    if (!Number.isInteger(pts) || pts === 0) {
      toast.error('Enter a non-zero integer');
      return;
    }
    setAdjusting(true);
    try {
      await api.post('/admin/loyalty/adjust', {
        user_id: adjustModal.user_id,
        points: pts,
        note: adjustNote || undefined,
      }, { headers, withCredentials: true });
      toast.success('Points adjusted');
      setAdjustModal(null);
      setAdjustPoints('');
      setAdjustNote('');
      if (tab === 'users') fetchUsers(usersPage);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust');
    } finally {
      setAdjusting(false);
    }
  };

  const tabs = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: History },
  ];

  return (
    <AdminLayout title="Loyalty Program">
      <div className="flex gap-2 border-b border-white/10 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              if (id === 'users') fetchUsers(1);
              if (id === 'transactions') fetchTransactions(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors ${tab === id ? 'border-cyber-purple text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="max-w-2xl">
          {settingsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
          ) : settings ? (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="flex items-center gap-3">
                <Label className="text-white">Master Switch</Label>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(val) => setSettings((s) => ({ ...s, enabled: val }))}
                  size="md"
                />
                <span className="text-gray-400">{settings.enabled ? 'ON' : 'OFF'}</span>
              </div>

              <div className="rounded-lg border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/5"><tr><th className="text-left p-3 text-gray-400">Tier</th><th className="text-left p-3 text-gray-400">Min Spend</th><th className="text-left p-3 text-gray-400">Cashback %</th><th className="text-left p-3 text-gray-400">Points/$</th></tr></thead>
                  <tbody>
                    {['bronze', 'silver', 'gold', 'platinum'].map((t) => (
                      <tr key={t} className="border-t border-white/5">
                        <td className="p-3 text-white">{TIER_LABELS[t]}</td>
                        <td className="p-3">
                          <Input type="number" step="0.01" className="w-24 bg-deep-navy border-white/10 h-8" value={settings.tiers?.[t]?.min ?? 0} onChange={(e) => setSettings((s) => ({ ...s, tiers: { ...s.tiers, [t]: { ...s.tiers[t], min: parseFloat(e.target.value) || 0 } } }))} />
                        </td>
                        <td className="p-3">
                          <Input type="number" min={0} max={100} className="w-16 bg-deep-navy border-white/10 h-8" value={settings.tiers?.[t]?.cashback_pct ?? 0} onChange={(e) => setSettings((s) => ({ ...s, tiers: { ...s.tiers, [t]: { ...s.tiers[t], cashback_pct: parseFloat(e.target.value) || 0 } } }))} />
                        </td>
                        <td className="p-3">
                          <Input type="number" min={0} className="w-16 bg-deep-navy border-white/10 h-8" value={settings.tiers?.[t]?.pts_per_dollar ?? 0} onChange={(e) => setSettings((s) => ({ ...s, tiers: { ...s.tiers, [t]: { ...s.tiers[t], pts_per_dollar: parseInt(e.target.value, 10) || 0 } } }))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Redemption: points = $1</Label>
                  <Input type="number" min={1} className="mt-1 bg-deep-navy border-white/10" value={settings.points_per_dollar ?? 100} onChange={(e) => setSettings((s) => ({ ...s, points_per_dollar: parseInt(e.target.value, 10) || 100 }))} />
                </div>
                <div>
                  <Label className="text-gray-400">Minimum redemption (points)</Label>
                  <Input type="number" min={0} className="mt-1 bg-deep-navy border-white/10" value={settings.min_redemption_points ?? 100} onChange={(e) => setSettings((s) => ({ ...s, min_redemption_points: parseInt(e.target.value, 10) || 100 }))} />
                </div>
                <div>
                  <Label className="text-gray-400">Hold period (hours)</Label>
                  <Input type="number" min={0} className="mt-1 bg-deep-navy border-white/10" value={settings.hold_hours ?? 24} onChange={(e) => setSettings((s) => ({ ...s, hold_hours: parseInt(e.target.value, 10) || 24 }))} />
                </div>
                <div>
                  <Label className="text-gray-400">Inactivity expiry (days)</Label>
                  <Input type="number" min={0} className="mt-1 bg-deep-navy border-white/10" value={settings.inactivity_expiry_days ?? 90} onChange={(e) => setSettings((s) => ({ ...s, inactivity_expiry_days: parseInt(e.target.value, 10) || 90 }))} />
                </div>
              </div>

              <Button type="submit" disabled={settingsSaving} className="bg-cyber-purple hover:bg-cyber-purple/90">{settingsSaving ? 'Saving...' : 'Save Settings'}</Button>
            </form>
          ) : (
            <p className="text-gray-500">Failed to load settings.</p>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="mb-4">
            <button type="button" onClick={() => fetchUsers(1)} className="text-cyber-purple text-sm mr-2">All</button>
            {['bronze', 'silver', 'gold', 'platinum'].map((t) => (
              <button key={t} type="button" onClick={() => fetchUsers(1, t)} className="text-gray-400 hover:text-white text-sm mr-2">{TIER_LABELS[t]}</button>
            ))}
          </div>
          {usersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={28} /></div>
          ) : (
            <div className="rounded-lg border border-white/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-3 text-gray-400">Email</th>
                    <th className="text-left p-3 text-gray-400">Tier</th>
                    <th className="text-right p-3 text-gray-400">Points</th>
                    <th className="text-right p-3 text-gray-400">Pending</th>
                    <th className="text-right p-3 text-gray-400">Total Spent</th>
                    <th className="text-left p-3 text-gray-400">Last Order</th>
                    <th className="p-3 text-right text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No users.</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.user_id} className="border-t border-white/5">
                        <td className="p-3 text-white">{u.email}</td>
                        <td className="p-3"><span className="capitalize text-gray-300">{u.loyalty_tier || 'bronze'}</span></td>
                        <td className="p-3 text-right text-neon-green">{u.loyalty_points ?? 0}</td>
                        <td className="p-3 text-right text-amber-400">{u.loyalty_points_pending ?? 0} / {formatPrice(u.cashback_pending ?? 0)}</td>
                        <td className="p-3 text-right text-white">{formatPrice(u.total_spent ?? 0)}</td>
                        <td className="p-3 text-gray-400 text-xs">{u.last_order_at ? new Date(u.last_order_at).toLocaleDateString() : '—'}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" className="border-cyber-purple/40 text-cyber-purple" onClick={() => { setAdjustModal(u); setAdjustPoints(''); setAdjustNote(''); }}>Adjust Points</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div>
          {txLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={28} /></div>
          ) : (
            <div className="rounded-lg border border-white/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-3 text-gray-400">Date</th>
                    <th className="text-left p-3 text-gray-400">User</th>
                    <th className="text-left p-3 text-gray-400">Type</th>
                    <th className="text-right p-3 text-gray-400">Points</th>
                    <th className="text-right p-3 text-gray-400">Cashback</th>
                    <th className="text-left p-3 text-gray-400">Status</th>
                    <th className="text-left p-3 text-gray-400">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No transactions.</td></tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx._id} className="border-t border-white/5">
                        <td className="p-3 text-gray-400 text-xs">{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</td>
                        <td className="p-3 text-white">{tx.user_email || '—'}</td>
                        <td className="p-3 text-gray-300">{tx.type}</td>
                        <td className="p-3 text-right text-white">{tx.points > 0 ? `+${tx.points}` : tx.points}</td>
                        <td className="p-3 text-right text-neon-green">{tx.cashback_usd ? formatPrice(tx.cashback_usd) : '—'}</td>
                        <td className="p-3"><span className={`capitalize text-xs px-2 py-0.5 rounded ${tx.status === 'credited' ? 'bg-neon-green/20' : tx.status === 'pending' ? 'bg-amber-500/20' : 'bg-gray-500/20'}`}>{tx.status}</span></td>
                        <td className="p-3 text-gray-500 truncate max-w-[200px]">{tx.note || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !adjusting && setAdjustModal(null)}>
          <div className="bg-deep-navy border border-white/10 rounded-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-3">Adjust points — {adjustModal.email}</h3>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <Label className="text-gray-400">Points (+ add, - remove)</Label>
                <Input type="number" className="mt-1 bg-deep-navy border-white/10" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} placeholder="e.g. 100 or -50" required />
              </div>
              <div>
                <Label className="text-gray-400">Note (optional)</Label>
                <Input className="mt-1 bg-deep-navy border-white/10" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setAdjustModal(null)}>Cancel</Button>
                <Button type="submit" disabled={adjusting} className="bg-cyber-purple hover:bg-cyber-purple/90">{adjusting ? 'Saving...' : 'Apply'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
