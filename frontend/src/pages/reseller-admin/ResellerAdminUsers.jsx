import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import ResellerAdminLayout from '../../components/layouts/ResellerAdminLayout';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';

export default function ResellerAdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addBalanceUser, setAddBalanceUser] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { formatPrice } = useCurrency();

  const fetchUsers = () => {
    setLoading(true);
    api.get('/reseller/admin/users', { params: { page, limit: 20 } })
      .then((res) => {
        setUsers(res.data.users || []);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleAddBalance = async (e) => {
    e?.preventDefault();
    if (!addBalanceUser || !(parseFloat(addAmount) > 0)) return;
    setSubmitting(true);
    try {
      const uid = addBalanceUser?.user_id || addBalanceUser?._id;
      await api.post(`/reseller/admin/users/${uid}/add-balance`, {
        amount: parseFloat(addAmount),
        note: addNote || undefined,
      });
      toast.success('Balance added');
      setAddBalanceUser(null);
      setAddAmount('');
      setAddNote('');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add balance');
    } finally {
      setSubmitting(false);
    }
  };

  const pages = Math.ceil(total / 20) || 1;

  return (
    <ResellerAdminLayout title="Users">
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[var(--accent,#7c3aed)]" size={28} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Email</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Name</th>
                    <th className="text-right p-3 text-gray-400 font-medium text-sm">Balance</th>
                    <th className="text-right p-3 text-gray-400 font-medium text-sm">Orders</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Created</th>
                    <th className="p-3 text-right text-gray-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">No users yet.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.user_id || u._id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-3 text-white">{u.email}</td>
                        <td className="p-3 text-gray-300">{u.name || '—'}</td>
                        <td className="p-3 text-right text-neon-green">{formatPrice(u.balance ?? 0)}</td>
                        <td className="p-3 text-right text-gray-400">{u.total_orders ?? 0}</td>
                        <td className="p-3 text-gray-400 text-sm">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            className="bg-[var(--accent,#7c3aed)] hover:opacity-90"
                            onClick={() => {
                              setAddBalanceUser(u);
                              setAddAmount('');
                              setAddNote('');
                            }}
                          >
                            <DollarSign size={14} className="mr-1" />
                            Add balance
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 p-3 border-t border-white/10">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="px-3 py-1 text-gray-400 text-sm">Page {page} of {pages}</span>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!addBalanceUser} onOpenChange={(open) => !open && setAddBalanceUser(null)}>
        <DialogContent className="bg-[#111118] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Add balance to {addBalanceUser?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBalance} className="space-y-4">
            <div>
              <Label className="text-gray-400">Amount (USD)</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                className="mt-1 bg-white/5 border-white/10"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-gray-400">Note (optional)</Label>
              <Input
                className="mt-1 bg-white/5 border-white/10"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddBalanceUser(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !(parseFloat(addAmount) > 0)} style={{ backgroundColor: 'var(--accent)' }}>
                {submitting ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ResellerAdminLayout>
  );
}
