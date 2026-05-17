import React, { useState, useEffect } from 'react';
import { Award, Loader2, Diamond, Clock, DollarSign, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useCurrency } from '../../context/CurrencyContext';
import api from '../../lib/axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';

const TIER_COLORS = {
  bronze: 'var(--tier-bronze)',
  silver: 'var(--tier-silver)',
  gold: 'var(--tier-gold)',
  platinum: 'var(--tier-platinum)',
};

const TIER_COLORS_ALPHA = {
  bronze: 'var(--tier-bronze-alpha)',
  silver: 'var(--tier-silver-alpha)',
  gold: 'var(--tier-gold-alpha)',
  platinum: 'var(--tier-platinum-alpha)',
};

const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
const TIER_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

export default function LoyaltyPage() {
  const { formatPrice } = useCurrency();
  const { user, refreshUser } = useDashboardAuth();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const fetchSummary = () => {
    api.get('/loyalty/summary')
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  };

  const fetchTransactions = (page = 1) => {
    setTxPage(page);
    api.get('/loyalty/transactions', { params: { page, limit: 20 } })
      .then((res) => {
        setTransactions(res.data.transactions || []);
        setTxPages(res.data.pages || 1);
      })
      .catch(() => setTransactions([]));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/loyalty/summary').then((r) => setSummary(r.data)).catch(() => setSummary(null)),
      api.get('/loyalty/transactions', { params: { page: 1, limit: 20 } }).then((r) => {
        setTransactions(r.data.transactions || []);
        setTxPages(r.data.pages || 1);
      }).catch(() => setTransactions([])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleRedeem = async (e) => {
    e.preventDefault();
    const pts = parseInt(redeemPoints, 10);
    if (!Number.isInteger(pts) || pts < (summary?.min_redemption ?? 100)) {
      toast.error(`Minimum redemption is ${summary?.min_redemption ?? 100} points`);
      return;
    }
    if (pts > (summary?.points ?? 0)) {
      toast.error('Insufficient points');
      return;
    }
    setRedeeming(true);
    try {
      const res = await api.post('/loyalty/redeem', { points: pts });
      toast.success(res.data?.message || 'Points redeemed!');
      setRedeemPoints('');
      fetchSummary();
      refreshUser?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading && !summary) {
    return (
      <DashboardLayout title="Rewards">
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-neon-green" size={32} /></div>
      </DashboardLayout>
    );
  }

  const tier = summary?.tier || 'bronze';
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronze;
  const tierColorAlpha = TIER_COLORS_ALPHA[tier] || TIER_COLORS_ALPHA.bronze;
  const nextTier = summary?.next_tier;
  const nextTierMin = summary?.next_tier_min;
  const progress = summary?.progress_to_next ?? 0;
  const pointsVal = summary?.points_value_usd != null ? parseFloat(summary.points_value_usd) : 0;
  const redeemVal = redeemPoints ? (parseInt(redeemPoints, 10) || 0) / (summary?.points_per_dollar || 100) : 0;

  return (
    <DashboardLayout title="Rewards">
      <div className="space-y-6">
        {/* Tier Card */}
        <div className="rounded-xl border border-[var(--border)] p-6 bg-[var(--bg-card)]" style={{ borderColor: tierColorAlpha }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{TIER_EMOJI[tier]}</span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]" style={{ color: tierColor }}>
              {TIER_LABELS[tier].toUpperCase()} MEMBER
            </h2>
          </div>
          <p className="text-[var(--text-muted)]">Total Spent: {formatPrice(summary?.total_spent ?? 0)}</p>
          {nextTier && nextTierMin != null && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: tierColor }} />
                </div>
                <span className="text-sm text-[var(--text-muted)]">{progress}%</span>
              </div>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                {formatPrice(Math.max(0, nextTierMin - (summary?.total_spent ?? 0)))} more to reach {TIER_LABELS[nextTier]}
              </p>
            </>
          )}
        </div>

        {/* Points & Cashback balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg-card)]">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><Diamond size={18} /> Points</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary?.points ?? 0} pts</div>
            <div className="text-sm text-[var(--success)]">= {formatPrice(pointsVal)} value</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg-card)]">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><Clock size={18} /> Pending</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary?.points_pending ?? 0} pts</div>
            <div className="text-sm text-[var(--warning)]">Available after hold</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg-card)]">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><DollarSign size={18} /> Cashback hold</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatPrice(summary?.cashback_pending ?? 0)}</div>
            <div className="text-sm text-[var(--warning)]">Cashback pending</div>
          </div>
        </div>

        {/* Redeem */}
        <div className="rounded-lg border border-[var(--border)] p-6 bg-[var(--bg-card)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-3">Redeem Points for Balance</h3>
          <form onSubmit={handleRedeem} className="flex flex-wrap items-end gap-3">
            <div>
              <Input
                type="number"
                min={summary?.min_redemption ?? 100}
                step="1"
                placeholder="Points"
                className="w-32 bg-deep-navy border-[var(--border)]"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
              />
              <span className="text-[var(--text-muted)] text-sm ml-2">→ {formatPrice(redeemVal)}</span>
            </div>
            <Button type="submit" disabled={redeeming || (parseInt(redeemPoints, 10) || 0) < (summary?.min_redemption ?? 100) || (parseInt(redeemPoints, 10) || 0) > (summary?.points ?? 0)} className="bg-neon-green hover:bg-neon-green/90 text-black">
              {redeeming ? 'Redeeming...' : 'Redeem Now'}
            </Button>
          </form>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Min: {summary?.min_redemption ?? 100} points | Rate: {summary?.points_per_dollar ?? 100} pts = $1.00
          </p>
        </div>

        {/* Current tier benefits */}
        {summary?.tier_config && (
          <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg-card)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Your {TIER_LABELS[tier]} Benefits</h3>
            <ul className="space-y-1 text-[var(--text-secondary)] text-sm">
              <li>✓ {summary.tier_config.cashback_pct}% cashback on every order</li>
              <li>✓ {summary.tier_config.pts_per_dollar} points per $1 spent</li>
              <li>✓ Points valid while active</li>
            </ul>
          </div>
        )}

        {/* Next tier preview */}
        {nextTier && summary?.tiers?.[nextTier] && (
          <div className="rounded-lg border border-cyber-purple/30 p-4 bg-cyber-purple/5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Upgrade to {TIER_LABELS[nextTier]}</h3>
            <p className="text-[var(--text-secondary)] text-sm">★ {summary.tiers[nextTier].cashback_pct}% cashback (was {summary.tier_config?.cashback_pct}%)</p>
            <p className="text-[var(--text-secondary)] text-sm">★ {summary.tiers[nextTier].pts_per_dollar} points per $1 (was {summary.tier_config?.pts_per_dollar})</p>
            <p className="text-cyber-purple text-sm mt-1">Spend {formatPrice(Math.max(0, (nextTierMin || 0) - (summary?.total_spent ?? 0)))} more to unlock</p>
          </div>
        )}

        {/* All tiers table */}
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-card)]"><tr><th className="text-left p-3 text-[var(--text-muted)]">Tier</th><th className="text-left p-3 text-[var(--text-muted)]">Spend Required</th><th className="text-left p-3 text-[var(--text-muted)]">Cashback</th><th className="text-left p-3 text-[var(--text-muted)]">Points/$</th></tr></thead>
            <tbody>
              {['bronze', 'silver', 'gold', 'platinum'].map((t) => (
                <tr key={t} className="border-t border-[var(--border)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">{TIER_LABELS[t]}</td>
                  <td className="p-3 text-[var(--text-muted)]">${summary?.tiers?.[t]?.min ?? 0}+</td>
                  <td className="p-3 text-[var(--text-muted)]">{summary?.tiers?.[t]?.cashback_pct ?? 0}%</td>
                  <td className="p-3 text-[var(--text-muted)]">{summary?.tiers?.[t]?.pts_per_dollar ?? 0} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transaction history */}
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <h3 className="p-4 font-semibold text-[var(--text-primary)] border-b border-[var(--border)]">Transaction History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-card)]"><tr><th className="text-left p-3 text-[var(--text-muted)]">Date</th><th className="text-left p-3 text-[var(--text-muted)]">Type</th><th className="text-right p-3 text-[var(--text-muted)]">Points</th><th className="text-right p-3 text-[var(--text-muted)]">Cashback</th><th className="text-left p-3 text-[var(--text-muted)]">Status</th><th className="text-left p-3 text-[var(--text-muted)]">Note</th></tr></thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No transactions yet.</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx._id} className="border-t border-[var(--border)]">
                      <td className="p-3 text-[var(--text-muted)]">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{tx.type?.replace(/_/g, ' ')}</td>
                      <td className="p-3 text-right text-[var(--text-primary)]">{tx.points > 0 ? `+${tx.points}` : tx.points}</td>
                      <td className="p-3 text-right text-neon-green">{tx.cashback_usd ? formatPrice(tx.cashback_usd) : '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            tx.status === 'credited'
                              ? 'bg-[var(--success-bg)] text-[var(--success)]'
                              : tx.status === 'pending'
                                ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
                                : tx.status === 'expired' || tx.status === 'cancelled'
                                  ? 'bg-[var(--error-bg)] text-[var(--error)]'
                                  : 'bg-[var(--info-bg)] text-[var(--info)]'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-muted)] truncate max-w-[200px]">{tx.note || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {txPages > 1 && (
            <div className="flex justify-center gap-2 p-3 border-t border-[var(--border)]">
              <Button variant="outline" size="sm" disabled={txPage <= 1} onClick={() => fetchTransactions(txPage - 1)}>Previous</Button>
              <span className="px-3 py-1 text-[var(--text-muted)] text-sm">Page {txPage} of {txPages}</span>
              <Button variant="outline" size="sm" disabled={txPage >= txPages} onClick={() => fetchTransactions(txPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
