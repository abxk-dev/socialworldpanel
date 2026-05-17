import React, { useState, useEffect } from 'react';
import { Users, Wallet, Copy, ArrowRightLeft, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth, useSettings } from '../../App';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { useCurrency } from '../../context/CurrencyContext';
import { useFormatRate } from '../../hooks/useFormatRate';

const ReferralWalletPage = () => {
  const { token } = useAuth();
  const { settings } = useSettings();
  const { formatPrice } = useCurrency();
  const { formatPriceWithRateDecimals } = useFormatRate();
  const referralEnabled = settings.referral_system_enabled !== false;
  const [data, setData] = useState({ referral_code: '', referral_balance: 0, referred_count: 0 });
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchReferral = async () => {
    try {
      const res = await api.get('/user/referral', { headers, withCredentials: true });
      setData(res.data || {});
    } catch (e) {
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferral();
  }, [token]);

  const copyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${url}/register?ref=${data.referral_code}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Referral link copied'));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(data.referral_code || '').then(() => toast.success('Code copied'));
  };

  const handleTransfer = async () => {
    setTransferring(true);
    try {
      await api.post('/user/referral', { action: 'transfer', amount: transferAmount ? parseFloat(transferAmount) : undefined }, { headers, withCredentials: true });
      toast.success('Transferred to main balance');
      setTransferAmount('');
      fetchReferral();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Referral Wallet">
        <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" /></div>
      </DashboardLayout>
    );
  }

  if (!referralEnabled) {
    return (
      <DashboardLayout title="Referral Wallet">
        <Card className="glass p-6 max-w-2xl">
          <p className="text-[var(--text-muted)]">The referral system is currently disabled by the administrator. Referral links and commission are turned off.</p>
        </Card>
      </DashboardLayout>
    );
  }

  const balance = data.referral_balance ?? 0;

  return (
    <DashboardLayout title="Referral Wallet">
      <div className="space-y-6 max-w-2xl">
        <Card className="glass p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-[var(--warning)]" />
            Referral balance
          </h2>
          <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">{formatPriceWithRateDecimals(balance)}</p>
          <p className="text-[var(--text-muted)] text-sm">Earned when people you refer make orders. Transfer to main balance to use.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Input
              type="number"
              step="0.01"
              min="0"
              max={balance}
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder={balance > 0 ? `Max ${formatPriceWithRateDecimals(balance)}` : '0'}
              className="bg-deep-navy border-[var(--border)] w-40"
            />
            <Button onClick={handleTransfer} disabled={balance <= 0 || transferring} className="bg-electric-blue text-black">
              {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
              Transfer to balance
            </Button>
          </div>
        </Card>

        <Card className="glass p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-cyan-400" />
            Your referral link
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Input
              readOnly
              value={typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${data.referral_code || ''}` : ''}
              className="bg-deep-navy border-[var(--border)] flex-1 min-w-0"
            />
            <Button variant="outline" onClick={copyLink}><Copy className="h-4 w-4 mr-2" /> Copy link</Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Label className="text-[var(--text-muted)]">Code:</Label>
            <span className="text-[var(--text-primary)] font-mono">{data.referral_code || '—'}</span>
            <Button variant="ghost" size="sm" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-[var(--text-muted)] text-sm mt-2">People who sign up with your link will be your referrals. You earn a commission when they place orders.</p>
        </Card>

        <Card className="glass p-6">
          <p className="text-[var(--text-muted)]">
            <strong className="text-[var(--text-primary)]">{data.referred_count ?? 0}</strong> users have signed up with your referral link.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReferralWalletPage;
