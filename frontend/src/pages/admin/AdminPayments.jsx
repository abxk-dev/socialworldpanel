import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import api from '../../lib/axios';
import { useAuth } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';

const PAY_SELECT_TRIGGER = 'mt-1 bg-deep-navy border-white/10 text-white';
const PAY_SELECT_CONTENT = 'bg-deep-navy border-white/10 text-white z-[200] max-h-[min(70vh,320px)]';

const PAY_ACC_TRIGGER =
  'px-6 py-4 text-white font-exo font-bold text-lg hover:no-underline hover:bg-white/5 data-[state=open]:border-b data-[state=open]:border-white/10 rounded-none [&>svg]:text-gray-400';

const INR_MIN_PRESETS = [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
const INR_MAX_PRESETS = [0, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
const USD_MIN_PRESETS = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000, 10000];
const USD_MAX_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000];
const PHP_MIN_PRESETS = [20, 50, 100, 200, 500, 1000, 2500, 5000, 10000, 20000];
const PHP_MAX_PRESETS = [50000, 100000, 250000, 500000, 1000000, 2000000];
const INR_RATE_PRESETS = [80, 82, 83, 85, 87, 90, 93, 95, 98, 100, 105];
const PHP_RATE_PRESETS = [52, 54, 56, 58, 59, 60, 62, 65];
const FEE_PCT_PRESETS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
const TOLERANCE_INR_PRESETS = [0, 1, 2, 5, 10, 20, 50];
const MANUAL_ADJUST_AMOUNTS = [-1000, -500, -250, -100, -50, -25, -10, -5, 5, 10, 25, 50, 100, 250, 500, 1000];

const UPI_NAME_PRESETS = [
  'Paytm Business UPI',
  'UPI — Instant verification (India)',
  'Business UPI — Paytm / PhonePe / GPay',
  'UPI QR — Verified deposits',
];
const CASHFREE_NAME_PRESETS = [
  'UPI & Card & Net via Cashfree',
  'Cashfree — Cards, UPI & QR',
  'Auto UPI & Card & QR Code',
];
const CRYPTO_NAME_PRESETS = [
  'Cryptomus Crypto',
  'Pay with Crypto (USDT)',
  'Cryptomus — BTC, USDT, ETH',
];
const MANUAL_QR_NAME_PRESETS = [
  'Manual QR Payment',
  'UPI QR — Manual approval',
  'Paytm / UPI QR (screenshot upload)',
  'Bank / UPI transfer — Manual verify',
];
const GCASH_NAME_PRESETS = [
  'GCash (Philippines)',
  'GCash — Manual screenshot',
  'GCash PHP — Admin approval',
];

const MANUAL_REASON_PRESETS = [
  { value: 'manual_adjust', label: 'Manual adjust (default)' },
  { value: 'promotional_credit', label: 'Promotional credit' },
  { value: 'refund', label: 'Refund' },
  { value: 'correction', label: 'Balance correction' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'compensation', label: 'Compensation' },
];

function nearPresetMatch(n, presets) {
  if (!Number.isFinite(n)) return null;
  const idx = presets.findIndex((p) => Math.abs(Number(p) - n) < 1e-6);
  return idx >= 0 ? Number(presets[idx]) : null;
}

/** Dropdown presets + optional custom number input */
function NumericPresetField({ label, value, onChange, presets, formatOption, hint, inputStep }) {
  const raw = value === undefined || value === null || value === '' ? '' : String(value);
  const n = raw === '' ? NaN : Number(raw);
  const matched = nearPresetMatch(n, presets);
  const inList = matched != null;
  const selectValue = inList ? String(matched) : '__custom__';

  return (
    <div>
      <Label className="text-gray-400">{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v !== '__custom__') onChange(v);
        }}
      >
        <SelectTrigger className={PAY_SELECT_TRIGGER}>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent className={PAY_SELECT_CONTENT}>
          {presets.map((p) => (
            <SelectItem key={String(p)} value={String(p)} className="focus:bg-white/10 focus:text-white cursor-pointer">
              {formatOption ? formatOption(p) : String(p)}
            </SelectItem>
          ))}
          <SelectItem value="__custom__" className="focus:bg-white/10 focus:text-white cursor-pointer">
            Custom…
          </SelectItem>
        </SelectContent>
      </Select>
      {selectValue === '__custom__' && (
        <>
          <Input
            type="number"
            step={inputStep}
            className={`mt-2 ${PAY_SELECT_TRIGGER}`}
            value={raw}
            onChange={(e) => onChange(e.target.value)}
          />
          {hint ? <p className="text-gray-500 text-xs mt-1">{hint}</p> : null}
        </>
      )}
    </div>
  );
}

/** Dropdown display names + custom text */
function TextPresetField({ label, value, onChange, presets, placeholder }) {
  const v = value || '';
  const inList = presets.includes(v);
  const sel = inList ? v : '__custom__';

  return (
    <div>
      <Label className="text-gray-400">{label}</Label>
      <Select
        value={sel}
        onValueChange={(nv) => {
          if (nv !== '__custom__') onChange(nv);
        }}
      >
        <SelectTrigger className={PAY_SELECT_TRIGGER}>
          <SelectValue placeholder={placeholder || 'Choose…'} />
        </SelectTrigger>
        <SelectContent className={PAY_SELECT_CONTENT}>
          {presets.map((p) => (
            <SelectItem key={p} value={p} className="focus:bg-white/10 focus:text-white cursor-pointer">
              {p}
            </SelectItem>
          ))}
          <SelectItem value="__custom__" className="focus:bg-white/10 focus:text-white cursor-pointer">
            Custom…
          </SelectItem>
        </SelectContent>
      </Select>
      {sel === '__custom__' && (
        <Input
          className={`mt-2 ${PAY_SELECT_TRIGGER}`}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

const AdminPayments = () => {
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [gateways, setGateways] = useState({});
  const [manual, setManual] = useState({ user_email: '', username: '', amount: '', reason: '' });
  const [upiSettings, setUpiSettings] = useState(null);
  const [upiDeposits, setUpiDeposits] = useState({ deposits: [], total: 0, stats: [] });
  const [upiSaving, setUpiSaving] = useState(false);
  const [cryptoSettings, setCryptoSettings] = useState(null);
  const [cryptoDeposits, setCryptoDeposits] = useState({ deposits: [], total: 0, stats: null });
  const [cryptoSaving, setCryptoSaving] = useState(false);
  const [manualQrSettings, setManualQrSettings] = useState(null);
  const [manualDeposits, setManualDeposits] = useState({ deposits: [] });
  const [manualSaving, setManualSaving] = useState(false);
  const [manualActioning, setManualActioning] = useState(null);
  const [gcashSettings, setGcashSettings] = useState(null);
  const [gcashDeposits, setGcashDeposits] = useState({ deposits: [] });
  const [gcashSaving, setGcashSaving] = useState(false);
  const [gcashActioning, setGcashActioning] = useState(null);
  const [cashfreeSettings, setCashfreeSettings] = useState(null);

  useEffect(() => {
    const init = async () => {
      const payRes = await api.get('/admin/payments', { headers });
      setGateways(payRes.data.payment_gateways || {});
    };
    init().catch(()=>{});
  }, []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [setRes, depRes, cryptomusSet, cryptomusDep, manualSet, manualDep, gcashSet, gcashDep, cashfreeSet] = await Promise.all([
          api.get('/admin/payment/upi/settings', { headers, withCredentials: true }).catch(() => ({ data: {} })),
          api.get('/admin/payment/upi/deposits?limit=20', { headers, withCredentials: true }).catch(() => ({ data: { deposits: [], total: 0, stats: [] } })),
          api.get('/admin/payment/cryptomus/settings', { headers, withCredentials: true }).catch(() => ({ data: {} })),
          api.get('/admin/payment/cryptomus/deposits?limit=20', { headers, withCredentials: true }).catch(() => ({ data: {} })),
          api.get('/admin/payment/manual/settings', { headers, withCredentials: true }).catch(() => ({ data: {} })),
          api.get('/admin/payment/manual/deposits', { headers, withCredentials: true }).catch(() => ({ data: { deposits: [] } })),
          api.get('/admin/payment/gcash/settings', { headers, withCredentials: true }).catch(() => ({ data: {} })),
          api.get('/admin/payment/gcash/deposits', { headers, withCredentials: true }).catch(() => ({ data: { deposits: [] } })),
          api.get('/admin/payment/cashfree/settings', { headers, withCredentials: true }).catch(() => ({ data: {} })),
        ]);
        setUpiSettings(setRes.data || {});
        setUpiDeposits({ deposits: depRes.data?.deposits || [], total: depRes.data?.total || 0, stats: depRes.data?.stats || [] });
        setCryptoSettings(cryptomusSet.data || {});
        setCryptoDeposits({ deposits: cryptomusDep.data?.deposits || [], total: cryptomusDep.data?.total || 0, stats: cryptomusDep.data?.stats || null });
        setManualQrSettings(manualSet.data || {});
        setManualDeposits({ deposits: manualDep.data?.deposits || [] });
        setGcashSettings(gcashSet.data || {});
        setGcashDeposits({ deposits: gcashDep.data?.deposits || [] });
        setCashfreeSettings(cashfreeSet.data || {});
      } catch {
        // Fallback defaults so UI doesn't stay stuck on "Loading…"
        setUpiSettings((prev) => prev || {});
        setUpiDeposits((prev) => prev || { deposits: [], total: 0, stats: [] });
        setCryptoSettings((prev) => prev || {});
        setCryptoDeposits((prev) => prev || { deposits: [], total: 0, stats: null });
        setManualQrSettings((prev) => prev || {});
        setManualDeposits((prev) => prev || { deposits: [] });
        setGcashSettings((prev) => prev || {});
        setGcashDeposits((prev) => prev || { deposits: [] });
        setCashfreeSettings((prev) => prev || {});
      }
    };
    load();
  }, [token]);

  const savePayments = async () => {
    await api.put('/admin/payments', { payment_gateways: gateways }, { headers });
    toast.success('Payment gateways saved');
  };

  const saveUpiSettings = async () => {
    if (!upiSettings) return;
    setUpiSaving(true);
    try {
      await api.post('/admin/payment/upi/settings', upiSettings, { headers, withCredentials: true });
      toast.success('Paytm UPI settings saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Failed to save');
    } finally {
      setUpiSaving(false);
    }
  };

  const saveCryptoSettings = async () => {
    if (!cryptoSettings) return;
    setCryptoSaving(true);
    try {
      await api.post('/admin/payment/cryptomus/settings', cryptoSettings, { headers, withCredentials: true });
      toast.success('Cryptomus settings saved');
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to save');
    } finally {
      setCryptoSaving(false);
    }
  };

  const saveManualQrSettings = async () => {
    if (!manualQrSettings) return;
    setManualSaving(true);
    try {
      await api.post('/admin/payment/manual/settings', manualQrSettings, { headers, withCredentials: true });
      toast.success('Manual QR settings saved');
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to save');
    } finally {
      setManualSaving(false);
    }
  };

  const saveCashfreeSettings = async () => {
    if (!cashfreeSettings) return;
    try {
      await api.post('/admin/payment/cashfree/settings', cashfreeSettings, { headers, withCredentials: true });
      toast.success('Cashfree settings saved');
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to save');
    }
  };

  const loadManualDeposits = () => {
    api.get('/admin/payment/manual/deposits', { headers, withCredentials: true })
      .then((r) => setManualDeposits({ deposits: r.data?.deposits || [] }))
      .catch(() => {});
  };

  const approveManual = async (depositId) => {
    setManualActioning(depositId);
    try {
      await api.post('/admin/payment/manual/approve', { deposit_id: depositId }, { headers, withCredentials: true });
      toast.success('Deposit approved and balance credited');
      loadManualDeposits();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Approve failed');
    } finally {
      setManualActioning(null);
    }
  };

  const rejectManual = async (depositId) => {
    setManualActioning(depositId);
    try {
      await api.post('/admin/payment/manual/reject', { deposit_id: depositId }, { headers, withCredentials: true });
      toast.success('Deposit rejected');
      loadManualDeposits();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Reject failed');
    } finally {
      setManualActioning(null);
    }
  };

  const loadGcashDeposits = () => {
    api.get('/admin/payment/gcash/deposits', { headers, withCredentials: true })
      .then((r) => setGcashDeposits({ deposits: r.data?.deposits || [] }))
      .catch(() => setGcashDeposits((prev) => prev || { deposits: [] }));
  };

  const saveGcashSettings = async () => {
    if (!gcashSettings) return;
    setGcashSaving(true);
    try {
      await api.post('/admin/payment/gcash/settings', gcashSettings, { headers, withCredentials: true });
      toast.success('GCash settings saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Failed to save');
    } finally {
      setGcashSaving(false);
    }
  };

  const approveGcash = async (depositId) => {
    setGcashActioning(depositId);
    try {
      await api.post('/admin/payment/gcash/approve', { deposit_id: depositId }, { headers, withCredentials: true });
      toast.success('GCash deposit approved and credited');
      loadGcashDeposits();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Approve failed');
    } finally {
      setGcashActioning(null);
    }
  };

  const rejectGcash = async (depositId) => {
    setGcashActioning(depositId);
    try {
      await api.post('/admin/payment/gcash/reject', { deposit_id: depositId }, { headers, withCredentials: true });
      toast.success('GCash deposit rejected');
      loadGcashDeposits();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Reject failed');
    } finally {
      setGcashActioning(null);
    }
  };

  const adjustBalance = async () => {
    const amt = parseFloat(manual.amount);
    if ((!manual.user_email && !manual.username) || !amt) {
      toast.error('Enter email or username, and amount');
      return;
    }
    try {
      const payload = { amount: amt, reason: manual.reason || 'manual_adjust' };
      if (manual.username) payload.username = manual.username.trim();
      else if (manual.user_email) payload.user_email = manual.user_email.trim();
      await api.post('/admin/balance/adjust', payload, { headers, withCredentials: true });
      toast.success('Balance adjusted');
      setManual({ user_email: '', username: '', amount: '', reason: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Failed to adjust balance');
    }
  };

  const upiStatsByStatus = (status) => upiDeposits.stats.find((s) => s._id === status) || { count: 0, total_inr: 0, total_usd: 0 };
  const successStat = upiStatsByStatus('success');
  const totalDeposits = upiDeposits.stats.reduce((a, s) => a + (s.count || 0), 0);
  const successRate = totalDeposits > 0 ? ((successStat.count || 0) / totalDeposits * 100).toFixed(1) : '0';

  return (
    <AdminLayout title="Payments">
      <Toaster position="top-right" theme="dark" />
      <p className="text-gray-400 text-sm mb-4 max-w-2xl">
        All payment sections are collapsed by default. Click a method to expand and view or edit its settings.
      </p>
      <Accordion type="multiple" defaultValue={[]} className="flex flex-col gap-4">
        <Card className="glass overflow-hidden border border-white/10">
          <AccordionItem value="manual-adjust" className="border-0">
            <AccordionTrigger className={PAY_ACC_TRIGGER}>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span>Manual Adjust</span>
                <span className="text-gray-500 text-xs font-normal font-sans not-italic">Add or deduct user balance</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-gray-400">User Email</Label>
              <Input value={manual.user_email} onChange={(e)=>setManual({...manual, user_email: e.target.value})} placeholder="user@example.com" className="mt-2 bg-deep-navy border-white/10" />
            </div>
            <div>
              <Label className="text-gray-400">Username</Label>
              <Input value={manual.username} onChange={(e)=>setManual({...manual, username: e.target.value})} placeholder="johndoe" className="mt-2 bg-deep-navy border-white/10" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-1 mb-2">Enter either email or username</p>
          <div className="grid gap-3">
            <NumericPresetField
              label="Amount (+ add, − deduct) in USD"
              value={manual.amount}
              onChange={(v) => setManual({ ...manual, amount: v })}
              presets={MANUAL_ADJUST_AMOUNTS}
              formatOption={(p) => (p > 0 ? `+ $${p}` : `− $${Math.abs(p)}`)}
              hint="Pick a preset or Custom to type any amount (negative deducts)."
            />
            <div>
              <Label className="text-gray-400">Reason</Label>
              <Select
                value={
                  MANUAL_REASON_PRESETS.some((r) => r.value === manual.reason)
                    ? manual.reason
                    : '__custom__'
                }
                onValueChange={(nv) => {
                  if (nv !== '__custom__') setManual({ ...manual, reason: nv });
                }}
              >
                <SelectTrigger className={`mt-2 ${PAY_SELECT_TRIGGER}`}>
                  <SelectValue placeholder="Reason" />
                </SelectTrigger>
                <SelectContent className={PAY_SELECT_CONTENT}>
                  {MANUAL_REASON_PRESETS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="focus:bg-white/10 focus:text-white cursor-pointer">
                      {r.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__" className="focus:bg-white/10 focus:text-white cursor-pointer">
                    Custom…
                  </SelectItem>
                </SelectContent>
              </Select>
              {!MANUAL_REASON_PRESETS.some((r) => r.value === manual.reason) && (
                <Input
                  value={manual.reason}
                  onChange={(e) => setManual({ ...manual, reason: e.target.value })}
                  placeholder="reason_code"
                  className={`mt-2 ${PAY_SELECT_TRIGGER}`}
                />
              )}
            </div>
          </div>
          <Button onClick={adjustBalance} className="mt-4 bg-neon-green text-black">Apply</Button>
            </AccordionContent>
          </AccordionItem>
        </Card>

        <Card className="glass overflow-hidden border border-white/10">
          <AccordionItem value="paytm-upi" className="border-0">
            <AccordionTrigger className={PAY_ACC_TRIGGER}>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span>Paytm Business UPI</span>
                <span className="text-gray-500 text-xs font-normal font-sans not-italic">Settings &amp; deposit history</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
        {upiSettings === null ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={upiSettings?.enabled || false}
                  onChange={(e) => setUpiSettings({ ...upiSettings, enabled: e.target.checked })}
                />
                <span>Enabled</span>
              </label>
              <TextPresetField
                label="Method name"
                value={upiSettings?.display_name || ''}
                onChange={(v) => setUpiSettings({ ...upiSettings, display_name: v })}
                presets={UPI_NAME_PRESETS}
                placeholder="Paytm Business UPI"
              />
              <div>
                <Label className="text-gray-400">Merchant MID</Label>
                <Input
                  type="password"
                  value={upiSettings?.merchant_mid || ''}
                  onChange={(e) => setUpiSettings({ ...upiSettings, merchant_mid: e.target.value })}
                  placeholder="Merchant MID"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400">UPI ID</Label>
                <Input
                  value={upiSettings?.upi_id || ''}
                  onChange={(e) => setUpiSettings({ ...upiSettings, upi_id: e.target.value })}
                  placeholder="merchant@paytm"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400">QR Code URL</Label>
                <Input
                  value={upiSettings?.qr_code_url || ''}
                  onChange={(e) => setUpiSettings({ ...upiSettings, qr_code_url: e.target.value })}
                  placeholder="https://… or /images/qr.png"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <NumericPresetField
                label="Min deposit (INR ₹)"
                value={upiSettings?.min_deposit_inr ?? 10}
                onChange={(v) => setUpiSettings({ ...upiSettings, min_deposit_inr: v })}
                presets={INR_MIN_PRESETS}
                formatOption={(p) => `₹${Number(p).toLocaleString()}`}
              />
              <NumericPresetField
                label="Max deposit (INR ₹)"
                value={upiSettings?.max_deposit_inr ?? 100000}
                onChange={(v) => setUpiSettings({ ...upiSettings, max_deposit_inr: v })}
                presets={INR_MAX_PRESETS}
                formatOption={(p) => (p === 0 ? 'Unlimited (0)' : `₹${Number(p).toLocaleString()}`)}
                hint="0 = unlimited cap in this list; use Custom for another max."
              />
              <NumericPresetField
                label="USD to INR rate"
                value={upiSettings?.usd_to_inr_rate ?? 83}
                onChange={(v) => setUpiSettings({ ...upiSettings, usd_to_inr_rate: v })}
                presets={INR_RATE_PRESETS}
                formatOption={(p) => `₹${p} per $1`}
                inputStep="0.01"
              />
              <NumericPresetField
                label="Amount tolerance (INR)"
                value={upiSettings?.amount_tolerance_inr ?? 2}
                onChange={(v) => setUpiSettings({ ...upiSettings, amount_tolerance_inr: v })}
                presets={TOLERANCE_INR_PRESETS}
                formatOption={(p) => `± ₹${p}`}
              />
              <label className="flex items-center gap-2 text-gray-400 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={upiSettings?.new_users_allowed !== false}
                  onChange={(e) => setUpiSettings({ ...upiSettings, new_users_allowed: e.target.checked })}
                />
                <span>New users allowed</span>
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={upiSettings?.charge_fee || false}
                  onChange={(e) => setUpiSettings({ ...upiSettings, charge_fee: e.target.checked })}
                />
                <span>Charge fee</span>
              </label>
              {upiSettings?.charge_fee && (
                <NumericPresetField
                  label="Fee %"
                  value={upiSettings?.fee_percent ?? 0}
                  onChange={(v) => setUpiSettings({ ...upiSettings, fee_percent: v })}
                  presets={FEE_PCT_PRESETS}
                  formatOption={(p) => `${p}%`}
                  inputStep="0.1"
                />
              )}
            </div>
            <div className="mb-4">
              <Label className="text-gray-400">Instructions (shown on Add Funds)</Label>
              <textarea
                value={upiSettings?.instructions || ''}
                onChange={(e) => setUpiSettings({ ...upiSettings, instructions: e.target.value })}
                placeholder="Optional instructions"
                rows={3}
                className="mt-1 w-full rounded bg-deep-navy border border-white/10 text-white p-2"
              />
            </div>
            <Button onClick={saveUpiSettings} disabled={upiSaving} className="bg-neon-green text-black">
              {upiSaving ? 'Saving…' : 'Save Paytm UPI settings'}
            </Button>

            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-white font-bold mb-3">UPI stats</h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                <span>Successful deposits: <strong className="text-white">{successStat.count || 0}</strong></span>
                <span>Total INR: <strong className="text-white">₹{Number(successStat.total_inr || 0).toFixed(0)}</strong></span>
                <span>Total USD credited: <strong className="text-white">${Number(successStat.total_usd || 0).toFixed(2)}</strong></span>
                <span>Success rate: <strong className="text-white">{totalDeposits ? successRate : '0'}%</strong></span>
              </div>
              <h3 className="text-white font-bold mb-2">Recent UPI deposits (successful only)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-white/10">
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">User</th>
                      <th className="py-2 pr-2">INR</th>
                      <th className="py-2 pr-2">USD</th>
                      <th className="py-2 pr-2">TXN ID</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(upiDeposits.deposits || []).map((d) => (
                      <tr key={d._id || d.upi_txn_id} className="border-b border-white/5">
                        <td className="py-2 pr-2 text-gray-400">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                        <td className="py-2 pr-2 text-white truncate max-w-[120px]">{d.user_email || d.user_id || '—'}</td>
                        <td className="py-2 pr-2 text-gray-300">₹{Number(d.amount_inr_actual ?? d.amount_inr_claimed ?? 0).toFixed(0)}</td>
                        <td className="py-2 pr-2 text-gray-300">${Number(d.amount_usd_credited ?? 0).toFixed(2)}</td>
                        <td className="py-2 pr-2 font-mono text-gray-400 truncate max-w-[140px]">{d.upi_txn_id || '—'}</td>
                        <td className="py-2"><span className={d.status === 'success' ? 'text-neon-green' : 'text-gray-500'}>{d.status || '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!upiDeposits.deposits || upiDeposits.deposits.length === 0) && (
                  <p className="text-gray-500 py-4">No successful UPI deposits yet.</p>
                )}
              </div>
            </div>
          </>
        )}
            </AccordionContent>
          </AccordionItem>
        </Card>

        <Card className="glass overflow-hidden border border-white/10">
          <AccordionItem value="cashfree" className="border-0">
            <AccordionTrigger className={PAY_ACC_TRIGGER}>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span>Cashfree (Auto UPI &amp; Card &amp; QR)</span>
                <span className="text-gray-500 text-xs font-normal font-sans not-italic">Gateway configuration</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
        {cashfreeSettings === null ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={cashfreeSettings?.enabled || false}
                  onChange={(e) => setCashfreeSettings({ ...cashfreeSettings, enabled: e.target.checked })}
                />
                <span>Enabled</span>
              </label>
              <TextPresetField
                label="Method name"
                value={cashfreeSettings?.display_name || ''}
                onChange={(v) => setCashfreeSettings({ ...cashfreeSettings, display_name: v })}
                presets={CASHFREE_NAME_PRESETS}
                placeholder="Auto UPI & Card & QR Code"
              />
              <NumericPresetField
                label="Fee (%)"
                value={cashfreeSettings?.fee_percent ?? 0}
                onChange={(v) => setCashfreeSettings({ ...cashfreeSettings, fee_percent: v })}
                presets={FEE_PCT_PRESETS}
                formatOption={(p) => `${p}%`}
                inputStep="0.1"
              />
              <NumericPresetField
                label="Min deposit (INR ₹)"
                value={cashfreeSettings?.min_deposit_inr ?? 100}
                onChange={(v) => setCashfreeSettings({ ...cashfreeSettings, min_deposit_inr: v })}
                presets={INR_MIN_PRESETS}
                formatOption={(p) => `₹${Number(p).toLocaleString()}`}
              />
              <NumericPresetField
                label="Max deposit (INR ₹)"
                value={cashfreeSettings?.max_deposit_inr ?? 100000}
                onChange={(v) => setCashfreeSettings({ ...cashfreeSettings, max_deposit_inr: v })}
                presets={INR_MAX_PRESETS.filter((x) => x > 0)}
                formatOption={(p) => `₹${Number(p).toLocaleString()}`}
              />
              <div>
                <NumericPresetField
                  label="INR per $1 (rate)"
                  value={cashfreeSettings?.usd_to_inr_rate ?? 83}
                  onChange={(v) => setCashfreeSettings({ ...cashfreeSettings, usd_to_inr_rate: v })}
                  presets={INR_RATE_PRESETS}
                  formatOption={(p) => `₹${p} per $1`}
                  inputStep="0.01"
                />
                <p className="text-gray-500 text-xs mt-1">1 USD = this many INR (for balance credit)</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveCashfreeSettings} className="bg-electric-blue text-black">
                Save Cashfree Settings
              </Button>
            </div>
          </>
        )}
            </AccordionContent>
          </AccordionItem>
        </Card>

        <Card className="glass overflow-hidden border border-white/10">
          <AccordionItem value="cryptomus" className="border-0">
            <AccordionTrigger className={PAY_ACC_TRIGGER}>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span>Cryptomus Crypto</span>
                <span className="text-gray-500 text-xs font-normal font-sans not-italic">Crypto invoices &amp; webhook</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
        {cryptoSettings === null ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-gray-400 mb-4">
              <input
                type="checkbox"
                checked={cryptoSettings?.enabled || false}
                onChange={(e) => setCryptoSettings({ ...cryptoSettings, enabled: e.target.checked })}
              />
              <span>Enabled</span>
            </label>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-gray-400">Merchant ID</Label>
                <Input
                  type="password"
                  value={cryptoSettings?.merchant_id || ''}
                  onChange={(e) => setCryptoSettings({ ...cryptoSettings, merchant_id: e.target.value })}
                  placeholder="UUID from Cryptomus"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400">API Key</Label>
                <Input
                  type="password"
                  value={cryptoSettings?.api_key || ''}
                  onChange={(e) => setCryptoSettings({ ...cryptoSettings, api_key: e.target.value })}
                  placeholder="Payment API key"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400">Webhook Secret</Label>
                <Input
                  type="password"
                  value={cryptoSettings?.webhook_secret || ''}
                  onChange={(e) => setCryptoSettings({ ...cryptoSettings, webhook_secret: e.target.value })}
                  placeholder="Same as API key or separate"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <NumericPresetField
                label="Min deposit (USD)"
                value={cryptoSettings?.min_deposit_usd ?? 5}
                onChange={(v) => setCryptoSettings({ ...cryptoSettings, min_deposit_usd: v })}
                presets={USD_MIN_PRESETS}
                formatOption={(p) => `$${p}`}
              />
              <NumericPresetField
                label="Max deposit (USD)"
                value={cryptoSettings?.max_deposit_usd ?? 50000}
                onChange={(v) => setCryptoSettings({ ...cryptoSettings, max_deposit_usd: v })}
                presets={USD_MAX_PRESETS}
                formatOption={(p) => `$${Number(p).toLocaleString()}`}
              />
              <TextPresetField
                label="Display name"
                value={cryptoSettings?.display_name || ''}
                onChange={(v) => setCryptoSettings({ ...cryptoSettings, display_name: v })}
                presets={CRYPTO_NAME_PRESETS}
                placeholder="Cryptomus Crypto"
              />
            </div>
            <Button onClick={saveCryptoSettings} disabled={cryptoSaving} className="bg-orange-500 hover:bg-orange-600 text-white mb-6">
              {cryptoSaving ? 'Saving…' : 'Save Cryptomus settings'}
            </Button>
            <p className="text-gray-500 text-sm mb-4">Webhook URL: <code className="text-neon-green text-xs break-all">POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/payment/cryptomus/webhook</code></p>
            <h3 className="text-white font-bold mb-2">Crypto deposits</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/10">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">User</th>
                    <th className="py-2 pr-2">USD</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2">Invoice ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(cryptoDeposits.deposits || []).map((d) => (
                    <tr key={d._id || d.order_id} className="border-b border-white/5">
                      <td className="py-2 pr-2 text-gray-400">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-2 text-white truncate max-w-[140px]">{d.user_email || d.user_id || '—'}</td>
                      <td className="py-2 pr-2 text-gray-300">${Number(d.amount_usd || 0).toFixed(2)}</td>
                      <td className="py-2 pr-2">{d.credited ? <span className="text-neon-green">credited</span> : <span className="text-gray-500">{d.status || '—'}</span>}</td>
                      <td className="py-2 font-mono text-gray-400 truncate max-w-[120px]">{d.cryptomus_invoice_id || d.order_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!cryptoDeposits.deposits || cryptoDeposits.deposits.length === 0) && (
                <p className="text-gray-500 py-4">No crypto deposits yet.</p>
              )}
            </div>
            {cryptoDeposits.stats && (
              <p className="text-gray-500 text-sm mt-3">Total credited: {cryptoDeposits.stats.count || 0} deposits · ${Number(cryptoDeposits.stats.total_usd || 0).toFixed(2)} USD</p>
            )}
          </>
        )}
            </AccordionContent>
          </AccordionItem>
        </Card>

        <Card className="glass overflow-hidden border border-white/10">
          <AccordionItem value="manual-qr" className="border-0">
            <AccordionTrigger className={PAY_ACC_TRIGGER}>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span>Manual QR Payment</span>
                <span className="text-gray-500 text-xs font-normal font-sans not-italic">Screenshot upload &amp; pending list</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
        {manualQrSettings === null ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-gray-400 mb-4">
              <input
                type="checkbox"
                checked={manualQrSettings?.enabled || false}
                onChange={(e) => setManualQrSettings({ ...manualQrSettings, enabled: e.target.checked })}
              />
              <span>Enabled</span>
            </label>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <TextPresetField
                label="Display name"
                value={manualQrSettings?.display_name || ''}
                onChange={(v) => setManualQrSettings({ ...manualQrSettings, display_name: v })}
                presets={MANUAL_QR_NAME_PRESETS}
                placeholder="Manual QR Payment"
              />
              <div>
                <Label className="text-gray-400">QR Code URL</Label>
                <Input
                  value={manualQrSettings?.qr_code_url || ''}
                  onChange={(e) => setManualQrSettings({ ...manualQrSettings, qr_code_url: e.target.value })}
                  placeholder="https://… or /images/qr.png"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <NumericPresetField
                label="Min deposit (INR ₹)"
                value={manualQrSettings?.min_deposit_inr ?? ''}
                onChange={(v) => setManualQrSettings({ ...manualQrSettings, min_deposit_inr: v })}
                presets={INR_MIN_PRESETS}
                formatOption={(p) => `₹${Number(p).toLocaleString()}`}
              />
              <NumericPresetField
                label="Max deposit (INR ₹)"
                value={manualQrSettings?.max_deposit_inr ?? ''}
                onChange={(v) => setManualQrSettings({ ...manualQrSettings, max_deposit_inr: v })}
                presets={INR_MAX_PRESETS.filter((x) => x > 0)}
                formatOption={(p) => `₹${Number(p).toLocaleString()}`}
              />
            </div>
            <div className="mb-4">
              <Label className="text-gray-400">Payment instructions</Label>
              <textarea
                value={manualQrSettings?.instructions || ''}
                onChange={(e) => setManualQrSettings({ ...manualQrSettings, instructions: e.target.value })}
                placeholder="Instructions shown to user (e.g. Scan QR, pay amount, upload screenshot)"
                rows={3}
                className="mt-1 w-full rounded bg-deep-navy border border-white/10 text-white p-2"
              />
            </div>
            <Button onClick={saveManualQrSettings} disabled={manualSaving} className="bg-neon-green text-black mb-6">
              {manualSaving ? 'Saving…' : 'Save Manual QR settings'}
            </Button>

            <div className="pt-6 border-t border-white/10">
              <h3 className="text-white font-bold mb-2">Pending Manual QR deposits</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-white/10">
                      <th className="py-2 pr-2">User</th>
                      <th className="py-2 pr-2">Amount</th>
                      <th className="py-2 pr-2">Screenshot</th>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(manualDeposits.deposits || []).map((d) => (
                      <tr key={d._id} className="border-b border-white/5">
                        <td className="py-2 pr-2 text-white truncate max-w-[140px]">{d.user_email || d.user_id || '—'}</td>
                        <td className="py-2 pr-2 text-gray-300">
                          {d.amount_currency === 'INR' || d.amount_inr != null
                            ? `₹${Number(d.amount_inr ?? d.amount ?? 0).toLocaleString()}`
                            : `$${Number(d.amount_usd || d.amount || 0).toFixed(2)}`}
                        </td>
                        <td className="py-2 pr-2">
                          {(d.screenshot_upload_id || d.screenshot_base64) ? (
                            <a
                              href={`/api/admin/payment/manual/deposits/${d._id}/screenshot${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-electric-blue hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-gray-400">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                        <td className="py-2 pr-2"><span className={d.status === 'pending' ? 'text-yellow-400' : d.status === 'completed' ? 'text-neon-green' : 'text-gray-500'}>{d.status || '—'}</span></td>
                        <td className="py-2">
                          {d.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-neon-green text-black" disabled={manualActioning === d._id} onClick={() => approveManual(d._id)}>
                                {manualActioning === d._id ? '…' : 'Approve'}
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500/50 text-red-400" disabled={manualActioning === d._id} onClick={() => rejectManual(d._id)}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!manualDeposits.deposits || manualDeposits.deposits.length === 0) && (
                  <p className="text-gray-500 py-4">No manual QR deposits.</p>
                )}
              </div>
            </div>
          </>
        )}
            </AccordionContent>
          </AccordionItem>
        </Card>

        <Card className="glass overflow-hidden border border-white/10">
          <AccordionItem value="gcash" className="border-0">
            <AccordionTrigger className={PAY_ACC_TRIGGER}>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span>GCash (Philippines)</span>
                <span className="text-gray-500 text-xs font-normal font-sans not-italic">PHP settings &amp; pending deposits</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
        {gcashSettings === null ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-gray-400 mb-4">
              <input
                type="checkbox"
                checked={gcashSettings?.enabled || false}
                onChange={(e) => setGcashSettings({ ...gcashSettings, enabled: e.target.checked })}
              />
              <span>Enabled</span>
            </label>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <TextPresetField
                label="Display name"
                value={gcashSettings?.display_name || ''}
                onChange={(v) => setGcashSettings({ ...gcashSettings, display_name: v })}
                presets={GCASH_NAME_PRESETS}
                placeholder="GCash (Philippines)"
              />
              <div>
                <Label className="text-gray-400">Account name</Label>
                <Input
                  value={gcashSettings?.account_name || ''}
                  onChange={(e) => setGcashSettings({ ...gcashSettings, account_name: e.target.value })}
                  placeholder="Name on GCash account"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400">GCash number / mobile</Label>
                <Input
                  value={gcashSettings?.account_number || ''}
                  onChange={(e) => setGcashSettings({ ...gcashSettings, account_number: e.target.value })}
                  placeholder="09XX XXX XXXX"
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-gray-400">Reference to put in receipt (e.g. email)</Label>
                <Input
                  value={gcashSettings?.reference_receipt || ''}
                  onChange={(e) => setGcashSettings({ ...gcashSettings, reference_receipt: e.target.value })}
                  placeholder="cockotwa@gmail.com"
                  className="mt-1 bg-deep-navy border-white/10"
                />
                <p className="text-gray-500 text-xs mt-1">User will enter this when paying so you can identify their payment.</p>
              </div>
              <NumericPresetField
                label="Min deposit (PHP ₱)"
                value={gcashSettings?.min_deposit_php ?? 100}
                onChange={(v) => setGcashSettings({ ...gcashSettings, min_deposit_php: v })}
                presets={PHP_MIN_PRESETS}
                formatOption={(p) => `₱${Number(p).toLocaleString()}`}
              />
              <NumericPresetField
                label="Max deposit (PHP ₱)"
                value={gcashSettings?.max_deposit_php ?? 500000}
                onChange={(v) => setGcashSettings({ ...gcashSettings, max_deposit_php: v })}
                presets={PHP_MAX_PRESETS}
                formatOption={(p) => `₱${Number(p).toLocaleString()}`}
              />
              <div>
                <NumericPresetField
                  label="PHP per $1 (rate)"
                  value={gcashSettings?.usd_to_php_rate ?? 56}
                  onChange={(v) => setGcashSettings({ ...gcashSettings, usd_to_php_rate: v })}
                  presets={PHP_RATE_PRESETS}
                  formatOption={(p) => `₱${p} per $1`}
                  inputStep="0.01"
                />
                <p className="text-gray-500 text-xs mt-1">1 USD = this many PHP (for balance credit)</p>
              </div>
            </div>
            <div className="mb-4">
              <Label className="text-gray-400">Payment instructions (one step per line, shown to user)</Label>
              <textarea
                value={gcashSettings?.instructions || ''}
                onChange={(e) => setGcashSettings({ ...gcashSettings, instructions: e.target.value })}
                placeholder={`Open your GCash\nThen select bank transfer\nThen select coins.ph (DCpay)\nEnter my details and Pay`}
                rows={5}
                className="mt-1 w-full rounded bg-deep-navy border border-white/10 text-white p-2 font-mono text-sm"
              />
            </div>
            <Button onClick={saveGcashSettings} disabled={gcashSaving} className="bg-[#003057] text-white hover:bg-[#004080] mb-6">
              {gcashSaving ? 'Saving…' : 'Save GCash settings'}
            </Button>

            <div className="pt-6 border-t border-white/10">
              <h3 className="text-white font-bold mb-2">Pending GCash deposits</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-white/10">
                      <th className="py-2 pr-2">User</th>
                      <th className="py-2 pr-2">Amount</th>
                      <th className="py-2 pr-2">Screenshot</th>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gcashDeposits.deposits || []).map((d) => (
                      <tr key={d._id} className="border-b border-white/5">
                        <td className="py-2 pr-2 text-white truncate max-w-[140px]">{d.user_email || d.user_id || '—'}</td>
                        <td className="py-2 pr-2 text-gray-300">
                          {d.amount_php != null ? `₱${Number(d.amount_php).toLocaleString()}` : `$${Number(d.amount_usd || d.amount || 0).toFixed(2)}`}
                        </td>
                        <td className="py-2 pr-2">
                          {(d.screenshot_upload_id || d.screenshot_base64) ? (
                            <a
                              href={`/api/admin/payment/gcash/deposits/${d._id}/screenshot${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-electric-blue hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-gray-400">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                        <td className="py-2 pr-2"><span className={d.status === 'pending' ? 'text-yellow-400' : d.status === 'completed' ? 'text-neon-green' : 'text-gray-500'}>{d.status || '—'}</span></td>
                        <td className="py-2">
                          {d.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-neon-green text-black" disabled={gcashActioning === d._id} onClick={() => approveGcash(d._id)}>
                                {gcashActioning === d._id ? '…' : 'Approve'}
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500/50 text-red-400" disabled={gcashActioning === d._id} onClick={() => rejectGcash(d._id)}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!gcashDeposits.deposits || gcashDeposits.deposits.length === 0) && (
                  <p className="text-gray-500 py-4">No GCash deposits.</p>
                )}
              </div>
            </div>
          </>
        )}
            </AccordionContent>
          </AccordionItem>
        </Card>
      </Accordion>
    </AdminLayout>
  );
};

export default AdminPayments;
