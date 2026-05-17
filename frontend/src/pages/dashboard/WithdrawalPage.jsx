import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpFromLine, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { toast } from 'sonner';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';

const METHODS = [
  { id: 'upi', label: 'UPI' },
  { id: 'bank', label: 'Bank Transfer' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'crypto', label: 'Crypto' },
];

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusIcon(status) {
  switch (status) {
    case 'pending': return '⏳';
    case 'paid': return '✅';
    case 'rejected': return '❌';
    case 'cancelled': return '🚫';
    default: return '•';
  }
}

export default function WithdrawalPage() {
  const { user, refreshUser } = useDashboardAuth();
  const { formatPrice } = useCurrency();
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [paymentDetails, setPaymentDetails] = useState({
    upi_id: '',
    account_holder: '',
    account_number: '',
    account_number_confirm: '',
    ifsc_code: '',
    bank_name: '',
    mobile_number: '',
    coin: 'USDT',
    network: 'TRC20',
    wallet_address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);

  const balance = Number(user?.balance) || 0;

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get('/withdrawals/settings', { withCredentials: true });
      setSettings(res.data);
    } catch (e) {
      toast.error('Failed to load withdrawal settings');
      setSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/withdrawals?page=1&limit=50', { withCredentials: true });
      setList(Array.isArray(res.data?.withdrawals) ? res.data.withdrawals : []);
    } catch {
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchList(); }, [fetchList]);

  const amt = parseFloat(amount) || 0;
  const feeFixed = settings?.fee_fixed ?? 0.5;
  const feePct = settings?.fee_percentage ?? 2;
  const feePercentageAmount = parseFloat((amt * (feePct / 100)).toFixed(4));
  const totalFee = parseFloat((feeFixed + feePercentageAmount).toFixed(4));
  const payoutAmount = parseFloat((amt - totalFee).toFixed(4));
  const minAmount = settings?.min_amount ?? 10;
  const maxAmount = settings?.max_amount ?? 500;
  const enabled = settings?.enabled !== false;
  const cryptoNetworks = Array.isArray(settings?.crypto_networks) ? settings.crypto_networks : ['TRC20', 'ERC20', 'BEP20'];

  const canSubmit = enabled && amt >= minAmount && amt <= maxAmount && payoutAmount > 0 && balance >= amt;

  const validatePaymentDetails = () => {
    if (method === 'upi') {
      if (!paymentDetails.upi_id?.trim().includes('@')) return 'Valid UPI ID is required (e.g. name@paytm).';
    }
    if (method === 'bank') {
      if (!paymentDetails.account_holder?.trim()) return 'Account holder name is required.';
      if (!paymentDetails.account_number?.trim()) return 'Account number is required.';
      if (paymentDetails.account_number !== paymentDetails.account_number_confirm) return 'Account numbers do not match.';
      if (!paymentDetails.ifsc_code?.trim()) return 'IFSC code is required.';
      if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(paymentDetails.ifsc_code.trim())) return 'Invalid IFSC code format.';
    }
    if (method === 'paytm') {
      if (!/^[6-9]\d{9}$/.test(String(paymentDetails.mobile_number).trim())) return 'Valid 10-digit Indian mobile number is required.';
    }
    if (method === 'crypto') {
      if (!paymentDetails.wallet_address?.trim()) return 'Wallet address is required.';
      if (!paymentDetails.coin || !paymentDetails.network) return 'Coin and network are required.';
    }
    return null;
  };

  const openConfirmModal = () => {
    const err = validatePaymentDetails();
    if (err) {
      toast.error(err);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    const err = validatePaymentDetails();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        amount: amt,
        method,
        payment_details: {},
      };
      if (method === 'upi') payload.payment_details = { upi_id: paymentDetails.upi_id.trim() };
      if (method === 'bank') {
        payload.payment_details = {
          account_holder: paymentDetails.account_holder.trim(),
          account_number: paymentDetails.account_number.trim(),
          ifsc_code: paymentDetails.ifsc_code.trim().toUpperCase(),
          bank_name: (paymentDetails.bank_name || '').trim(),
        };
      }
      if (method === 'paytm') payload.payment_details = { mobile_number: paymentDetails.mobile_number.trim() };
      if (method === 'crypto') {
        payload.payment_details = {
          wallet_address: paymentDetails.wallet_address.trim(),
          coin: paymentDetails.coin,
          network: paymentDetails.network,
        };
      }
      await api.post('/withdrawals', payload, { withCredentials: true });
      toast.success('Withdrawal request submitted. Processing within 24–48 hours.');
      setShowConfirmModal(false);
      setAmount('');
      setPaymentDetails({ ...paymentDetails, upi_id: '', account_holder: '', account_number: '', account_number_confirm: '', ifsc_code: '', bank_name: '', mobile_number: '', wallet_address: '' });
      refreshUser?.();
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelWithdrawal = async (w) => {
    setCancellingId(w._id);
    try {
      await api.delete(`/withdrawals/${w.id || w._id}`, { withCredentials: true });
      toast.success(`$${Number(w.requested_amount).toFixed(2)} refunded to your balance.`);
      setShowCancelConfirm(null);
      refreshUser?.();
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const paymentDetailsSummary = () => {
    if (method === 'upi') return `UPI — ${paymentDetails.upi_id}`;
    if (method === 'bank') return `Bank — ${paymentDetails.account_holder} ****${(paymentDetails.account_number || '').slice(-4)}`;
    if (method === 'paytm') return `Paytm — ${paymentDetails.mobile_number}`;
    if (method === 'crypto') return `${paymentDetails.network}-${paymentDetails.coin} — ${paymentDetails.wallet_address?.slice(0, 10)}...`;
    return method;
  };

  return (
    <DashboardLayout title="Withdraw">
      <div className="space-y-6" style={{ maxWidth: 720 }}>
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="h-6 w-6 text-[var(--success)]" />
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Withdraw Balance</h1>
        </div>

        <Card className="p-4 bg-[var(--bg-tertiary)] border-[var(--border)]">
          <p className="text-[var(--text-muted)] text-sm">Available Balance</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{formatPrice(balance)}</p>
        </Card>

        {loadingSettings && <p className="text-[var(--text-muted)]">Loading settings…</p>}
        {!loadingSettings && settings && !enabled && (
          <Card className="p-4 bg-[var(--bg-tertiary)] border-[var(--warning)]/30">
            <p className="text-[var(--warning)]">Withdrawals are currently disabled.</p>
          </Card>
        )}

        {enabled && settings && (
          <>
            <Card className="p-5 bg-[var(--bg-tertiary)] border-[var(--border)]">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Step 1 — Amount & Method</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-[var(--text-muted)]">Amount (USD)</Label>
                  <Input
                    type="number"
                    min={minAmount}
                    max={maxAmount}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Min: {formatPrice(minAmount)} | Max: {formatPrice(maxAmount)}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-4">
                  <p className="text-[var(--text-muted)] text-sm mb-2">Fee preview</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Requested</span><span className="text-[var(--text-primary)]">{formatPrice(amt)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Fixed fee</span><span className="text-[var(--error)]">-{formatPrice(feeFixed)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">{feePct}% fee</span><span className="text-[var(--error)]">-{formatPrice(feePercentageAmount)}</span></div>
                    <div className="border-t border-[var(--border)] my-2" />
                    <div className="flex justify-between font-medium"><span className="text-[var(--success)]">You receive</span><span className="text-[var(--success)]">{formatPrice(payoutAmount)}</span></div>
                  </div>
                </div>
                <div>
                  <Label className="text-[var(--text-muted)] mb-2 block">Withdrawal Method</Label>
                  <div className="flex flex-wrap gap-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          method === m.id
                            ? 'bg-[var(--accent-secondary)] text-[var(--text-primary)] hover:bg-[var(--accent)]'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-[var(--bg-tertiary)] border-[var(--border)]">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Step 2 — Payment Details</h2>
              {method === 'upi' && (
                <div>
                  <Label className="text-[var(--text-muted)]">UPI ID</Label>
                  <Input
                    value={paymentDetails.upi_id}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, upi_id: e.target.value })}
                    placeholder="user@paytm, name@phonepe"
                    className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">e.g. mobilenumber@paytm, name@phonepe</p>
                </div>
              )}
              {method === 'bank' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-[var(--text-muted)]">Account Holder</Label>
                    <Input value={paymentDetails.account_holder} onChange={(e) => setPaymentDetails({ ...paymentDetails, account_holder: e.target.value })} className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <Label className="text-[var(--text-muted)]">Account Number</Label>
                    <Input value={paymentDetails.account_number} onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number: e.target.value })} className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <Label className="text-[var(--text-muted)]">Confirm Account Number</Label>
                    <Input value={paymentDetails.account_number_confirm} onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number_confirm: e.target.value })} className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <Label className="text-[var(--text-muted)]">IFSC Code</Label>
                    <Input value={paymentDetails.ifsc_code} onChange={(e) => setPaymentDetails({ ...paymentDetails, ifsc_code: e.target.value.toUpperCase() })} className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]" placeholder="HDFC0001234" />
                  </div>
                  <div>
                    <Label className="text-[var(--text-muted)]">Bank Name (optional)</Label>
                    <Input value={paymentDetails.bank_name} onChange={(e) => setPaymentDetails({ ...paymentDetails, bank_name: e.target.value })} className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]" />
                  </div>
                </div>
              )}
              {method === 'paytm' && (
                <div>
                  <Label className="text-[var(--text-muted)]">Registered Mobile (10-digit)</Label>
                  <Input
                    value={paymentDetails.mobile_number}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210"
                    className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">10-digit number linked to Paytm wallet</p>
                </div>
              )}
              {method === 'crypto' && (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-[var(--warning)] text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Double-check address — crypto is irreversible.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                    <Label className="text-[var(--text-muted)]">Coin</Label>
                      <select
                        value={paymentDetails.coin}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, coin: e.target.value })}
                        className="mt-1 w-full rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2"
                      >
                        <option value="USDT">USDT</option>
                        <option value="BTC">BTC</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[var(--text-muted)]">Network</Label>
                      <select
                        value={paymentDetails.network}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, network: e.target.value })}
                        className="mt-1 w-full rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2"
                      >
                        {cryptoNetworks.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[var(--text-muted)]">Wallet Address</Label>
                    <Input
                      value={paymentDetails.wallet_address}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, wallet_address: e.target.value })}
                      placeholder="Your wallet address"
                      className="mt-1 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}
            </Card>

            <div className="flex flex-col gap-3">
              <Button
                onClick={openConfirmModal}
                disabled={!canSubmit || submitting}
                className="text-[var(--btn-primary-text)] hover:opacity-90"
                style={{ backgroundImage: 'var(--accent-gradient)' }}
              >
                {submitting ? 'Submitting…' : 'Submit Withdrawal Request'}
              </Button>
              <p className="text-xs text-[var(--text-muted)]">Processing time: 24–48 hours</p>
            </div>
          </>
        )}

        <div>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">My Withdrawal History</h2>
          {loadingList && <p className="text-[var(--text-muted)]">Loading…</p>}
          {!loadingList && list.length === 0 && <p className="text-[var(--text-muted)]">No withdrawals yet.</p>}
          {!loadingList && list.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] text-left text-[var(--text-muted)]">
                    <th className="p-3">Date</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Fee</th>
                    <th className="p-3">Payout</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((w) => (
                    <tr key={w.id || w._id} className="border-t border-[var(--border)] text-[var(--text-primary)]">
                      <td className="p-3">{formatDate(w.created_at)}</td>
                      <td className="p-3 capitalize">{w.method}</td>
                      <td className="p-3">{formatPrice(w.requested_amount)}</td>
                      <td className="p-3">{formatPrice(w.total_fee)}</td>
                      <td className="p-3">{formatPrice(w.payout_amount)}</td>
                      <td className="p-3">
                        <span>{statusIcon(w.status)} </span>
                        {w.status === 'rejected' && w.admin_note && (
                          <span className="text-[var(--error)] text-xs block">Rejected: {w.admin_note}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {w.status === 'pending' && (
                          showCancelConfirm === (w.id || w._id) ? (
                            <span className="flex items-center gap-2">
                              <button
                                onClick={() => handleCancelWithdrawal(w)}
                                disabled={cancellingId === (w.id || w._id)}
                                className="text-[var(--success)] hover:underline text-xs"
                              >
                                {cancellingId === (w.id || w._id) ? 'Cancelling…' : 'Confirm'}
                              </button>
                              <button onClick={() => setShowCancelConfirm(null)} className="text-[var(--text-muted)] hover:underline text-xs">Back</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setShowCancelConfirm(w.id || w._id)}
                              className="text-[var(--warning)] hover:underline text-xs"
                            >
                              Cancel
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !submitting && setShowConfirmModal(false)}>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Confirm Withdrawal</h3>
            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <div className="flex justify-between"><span>Amount</span><span className="text-[var(--text-primary)]">{formatPrice(amt)}</span></div>
              <div className="flex justify-between"><span>Fee</span><span className="text-[var(--text-primary)]">{formatPrice(totalFee)}</span></div>
              <div className="flex justify-between font-medium text-[var(--success)]"><span>You receive</span><span>{formatPrice(payoutAmount)}</span></div>
              <div className="flex justify-between"><span>Method</span><span className="text-[var(--text-primary)]">{paymentDetailsSummary()}</span></div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4">Processing time: 24–48 hours</p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={submitting} className="border-[var(--border)] text-[var(--text-muted)]">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="text-[var(--btn-primary-text)] hover:opacity-90"
                style={{ backgroundImage: 'var(--accent-gradient)' }}
              >
                {submitting ? 'Submitting…' : 'Confirm & Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && !showConfirmModal && (() => {
        const w = list.find((x) => (x.id || x._id) === showCancelConfirm);
        if (!w) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowCancelConfirm(null)}>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="text-[var(--text-primary)] mb-2">Cancel this withdrawal?</p>
              <p className="text-[var(--text-muted)] text-sm mb-4">{formatPrice(w.requested_amount)} will be refunded to your balance.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCancelConfirm(null)} className="border-[var(--border)] text-[var(--text-muted)]">Back</Button>
                <Button
                  onClick={() => handleCancelWithdrawal(w)}
                  disabled={cancellingId === w._id}
                  className="bg-[var(--warning)] text-[var(--text-inverse)] hover:opacity-90"
                >
                  Yes, cancel
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
