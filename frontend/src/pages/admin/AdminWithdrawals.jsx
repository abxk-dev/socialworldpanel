import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpFromLine } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { toast } from 'sonner';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function paymentDetailsDisplay(w) {
  const pd = w.payment_details || {};
  switch (w.method) {
    case 'upi':
      return <>📱 {pd.upi_id || '—'}</>;
    case 'bank':
      return <>🏦 ****{(pd.account_number || '').slice(-4)} | {pd.ifsc_code || '—'}</>;
    case 'paytm':
      return <>📞 {(pd.mobile_number || '').slice(0, 5)}****{(pd.mobile_number || '').slice(-2)}</>;
    case 'crypto':
      const addr = pd.wallet_address || '';
      const short = addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
      return <>₿ {pd.network}-{pd.coin} | {short}</>;
    default:
      return '—';
  }
}

function statusBadge(status) {
  const map = {
    pending: { label: 'Pending', class: 'bg-amber-500/20 text-amber-400' },
    paid: { label: 'Paid', class: 'bg-green-500/20 text-green-400' },
    rejected: { label: 'Rejected', class: 'bg-red-500/20 text-red-400' },
    cancelled: { label: 'Cancelled', class: 'bg-zinc-500/20 text-zinc-400' },
  };
  const s = map[status] || { label: status, class: 'bg-zinc-500/20 text-zinc-400' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.class}`}>{s.label}</span>;
}

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'paid', label: 'Paid' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];
const METHOD_OPTIONS = [
  { id: '', label: 'All' },
  { id: 'upi', label: 'UPI' },
  { id: 'bank', label: 'Bank' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'crypto', label: 'Crypto' },
];

export default function AdminWithdrawals() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState(null);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [methodFilter, setMethodFilter] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/withdrawals/stats', { withCredentials: true });
      setStats(res.data);
    } catch {
      setStats(null);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      const res = await api.get('/admin/withdrawals', { params, withCredentials: true });
      setList(res.data?.withdrawals || []);
      setTotal(res.data?.total ?? 0);
      setPages(res.data?.pages ?? 0);
    } catch {
      setList([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchList(); }, [fetchList]);

  const handleApprove = async () => {
    if (!approveModal || !transactionId.trim()) {
      toast.error('Transaction ID is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/withdrawals/${approveModal.id}/approve`, {
        transaction_id: transactionId.trim(),
        admin_note: adminNote.trim() || undefined,
      }, { withCredentials: true });
      toast.success('Withdrawal marked as paid.');
      setApproveModal(null);
      setTransactionId('');
      setAdminNote('');
      fetchStats();
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/withdrawals/${rejectModal.id}/reject`, {
        admin_note: rejectNote.trim() || 'Rejected by admin',
      }, { withCredentials: true });
      toast.success('Withdrawal rejected and amount refunded.');
      setRejectModal(null);
      setRejectNote('');
      fetchStats();
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Withdrawals">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="h-6 w-6 text-[#22c55e]" />
          <h1 className="text-xl font-semibold text-white">Withdrawals</h1>
        </div>

        {stats && (
          <Card className="p-4 bg-[#111118] border-[#1f1f2e]">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-amber-400">⏳ {stats.pending_count} Pending — {formatPrice(stats.pending_total_usd)} total</span>
              <span className="text-[#71717a]">|</span>
              <span className="text-green-400">✅ Paid today: {stats.paid_today} — {formatPrice(stats.paid_today_usd)}</span>
              <span className="text-[#71717a]">|</span>
              <span className="text-white">💰 Fees collected: {formatPrice(stats.total_fees_collected)}</span>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-[#27272a]">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setStatusFilter(t.id); setPage(1); }}
                className={`px-3 py-2 text-sm font-medium ${statusFilter === t.id ? 'bg-[#7c3aed] text-white' : 'bg-[#1f1f2e] text-[#a1a1aa] hover:bg-[#27272a]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="rounded-md bg-[#1f1f2e] border border-[#27272a] text-white px-3 py-2 text-sm"
          >
            {METHOD_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <Card className="overflow-hidden bg-[#111118] border-[#1f1f2e]">
          {loading && <div className="p-6 text-center text-[#71717a]">Loading…</div>}
          {!loading && list.length === 0 && <div className="p-6 text-center text-[#71717a]">No withdrawals match the filters.</div>}
          {!loading && list.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1f1f2e] text-left text-[#a1a1aa]">
                    <th className="p-3">User</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Requested</th>
                    <th className="p-3">Fee</th>
                    <th className="p-3">Payout</th>
                    <th className="p-3">Payment Details</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((w) => (
                    <tr
                      key={w.id}
                      className={`border-t border-[#27272a] text-white ${
                        w.status === 'pending' ? 'bg-amber-500/5' : ''
                      } ${w.status === 'rejected' ? 'bg-red-500/5' : ''} ${w.method === 'crypto' ? 'border-l-2 border-l-blue-500/50' : ''}`}
                    >
                      <td className="p-3">
                        <span className="text-[#a1a1aa]">{w.user_email || w.user_id}</span>
                      </td>
                      <td className="p-3 capitalize">{w.method}</td>
                      <td className="p-3">{formatPrice(w.requested_amount)}</td>
                      <td className="p-3">{formatPrice(w.total_fee)}</td>
                      <td className="p-3">{formatPrice(w.payout_amount)}</td>
                      <td className="p-3 font-mono text-xs">{paymentDetailsDisplay(w)}</td>
                      <td className="p-3">{statusBadge(w.status)}</td>
                      <td className="p-3 text-[#a1a1aa]">{formatDate(w.created_at)}</td>
                      <td className="p-3">
                        {w.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setApproveModal(w)}>Approve</Button>
                            <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => setRejectModal(w)}>Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <div className="flex justify-center gap-2 p-3 border-t border-[#27272a]">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-[#27272a] text-[#a1a1aa]">Previous</Button>
              <span className="text-[#a1a1aa] py-1 px-2">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="border-[#27272a] text-[#a1a1aa]">Next</Button>
            </div>
          )}
        </Card>
      </div>

      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !submitting && setApproveModal(null)}>
          <div className="bg-[#111118] border border-[#27272a] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Approve Withdrawal</h3>
            <p className="text-[#a1a1aa] text-sm mb-4">{formatPrice(approveModal.payout_amount)} to {approveModal.user_email}</p>
            <p className="text-[#71717a] text-sm mb-4">Method: {approveModal.method} — {paymentDetailsDisplay(approveModal)}</p>
            <p className="text-white text-sm mb-2">Amount to send: {formatPrice(approveModal.payout_amount)}</p>
            <div className="space-y-3 mb-4">
              <div>
                <Label className="text-[#a1a1aa]">Transaction ID *</Label>
                <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Payment reference" className="mt-1 bg-[#0a0a0f] border-[#27272a] text-white" />
              </div>
              <div>
                <Label className="text-[#a1a1aa]">Admin Note (optional)</Label>
                <Input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Note" className="mt-1 bg-[#0a0a0f] border-[#27272a] text-white" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setApproveModal(null)} disabled={submitting} className="border-[#27272a] text-[#a1a1aa]">Cancel</Button>
              <Button onClick={handleApprove} disabled={submitting || !transactionId.trim()} className="bg-green-600 text-white hover:bg-green-700">Confirm Approval</Button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !submitting && setRejectModal(null)}>
          <div className="bg-[#111118] border border-[#27272a] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Reject Withdrawal</h3>
            <p className="text-[#a1a1aa] text-sm mb-2">{formatPrice(rejectModal.requested_amount)} will be REFUNDED to user&apos;s balance.</p>
            <div className="mb-4">
              <Label className="text-[#a1a1aa]">Reason for rejection</Label>
              <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Optional" className="mt-1 bg-[#0a0a0f] border-[#27272a] text-white" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRejectModal(null)} disabled={submitting} className="border-[#27272a] text-[#a1a1aa]">Cancel</Button>
              <Button onClick={handleReject} disabled={submitting} className="bg-red-600 text-white hover:bg-red-700">Confirm Rejection</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
