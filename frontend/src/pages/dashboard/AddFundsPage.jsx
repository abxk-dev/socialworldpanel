import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Wallet, Globe, DollarSign, CheckCircle, AlertCircle, QrCode, ArrowLeft, ArrowRight, ImagePlus, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { assetUrl } from '../../config';

const AddFundsPage = () => {
  const { token, refreshUser, user } = useAuth();
  const { formatPrice } = useCurrency();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [upiSettings, setUpiSettings] = useState(null);
  const [upiStep, setUpiStep] = useState(1);
  const [amountInr, setAmountInr] = useState('');
  const [txnId, setTxnId] = useState('');
  const [txnError, setTxnError] = useState('');
  const [upiSubmitting, setUpiSubmitting] = useState(false);
  const [upiError, setUpiError] = useState('');
  const [upiCorrectAmount, setUpiCorrectAmount] = useState(null);
  const [upiSuccess, setUpiSuccess] = useState(null);

  const [cryptomusSettings, setCryptomusSettings] = useState(null);
  const [cryptoCreating, setCryptoCreating] = useState(false);

  const [manualQrSettings, setManualQrSettings] = useState(null);
  const [manualStep, setManualStep] = useState(1);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDepositId, setManualDepositId] = useState(null);
  const [manualScreenshot, setManualScreenshot] = useState(null);
  const [manualCreating, setManualCreating] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSubmitted, setManualSubmitted] = useState(false);

  const [cashfreeSettings, setCashfreeSettings] = useState(null);

  const [gcashSettings, setGcashSettings] = useState(null);
  const [gcashStep, setGcashStep] = useState(1);
  const [gcashAmount, setGcashAmount] = useState('');
  const [gcashDepositId, setGcashDepositId] = useState(null);
  const [gcashScreenshot, setGcashScreenshot] = useState(null);
  const [gcashCreating, setGcashCreating] = useState(false);
  const [gcashSubmitting, setGcashSubmitting] = useState(false);
  const [gcashSubmitted, setGcashSubmitted] = useState(false);

  // Deposit history (inline on Add Funds page)
  const [deposits, setDeposits] = useState([]);
  const [depositsLoading, setDepositsLoading] = useState(true);

  useEffect(() => {
    api.get('/payment/upi/settings', { withCredentials: true })
      .then((r) => setUpiSettings(r.data?.enabled ? r.data : null))
      .catch(() => setUpiSettings(null));
  }, []);

  useEffect(() => {
    api.get('/payment/cryptomus/settings', { withCredentials: true })
      .then((r) => setCryptomusSettings(r.data?.enabled ? r.data : null))
      .catch(() => setCryptomusSettings(null));
  }, []);

  useEffect(() => {
    api.get('/payment/manual/settings', { withCredentials: true })
      .then((r) => setManualQrSettings(r.data?.enabled ? r.data : null))
      .catch(() => setManualQrSettings(null));
  }, []);

  const fetchDeposits = async () => {
    setDepositsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.get('/deposits?page=1&limit=10', { headers, withCredentials: true });
      setDeposits(res.data?.deposits || []);
    } catch {
      toast.error('Failed to load deposits');
      setDeposits([]);
    } finally {
      setDepositsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [token]);

  useEffect(() => {
    api.get('/payment/cashfree/settings', { withCredentials: true })
      .then((r) => setCashfreeSettings(r.data?.enabled ? r.data : null))
      .catch(() => setCashfreeSettings(null));
  }, []);

  useEffect(() => {
    api.get('/payment/gcash/settings', { withCredentials: true })
      .then((r) => setGcashSettings(r.data?.enabled ? r.data : null))
      .catch(() => setGcashSettings(null));
  }, []);

  const manualMinInr = Number(manualQrSettings?.min_deposit_inr)
  const manualMaxInr = Number(manualQrSettings?.max_deposit_inr)
  const manualMinResolved = Number.isFinite(manualMinInr) && manualMinInr > 0 ? manualMinInr : 1
  const manualMaxResolved =
    Number.isFinite(manualMaxInr) && manualMaxInr >= manualMinResolved ? manualMaxInr : 10_000_000

  // Only show real configured methods (UPI, crypto, manual QR)
  let paymentMethods = [];
  if (upiSettings?.enabled) {
    paymentMethods = [
      ...paymentMethods,
      {
        id: 'paytm_upi',
        name: upiSettings.display_name || 'Paytm Business UPI',
        icon: QrCode,
        description: 'Scan QR with any UPI app · Verified instantly',
        minAmount: upiSettings.min_deposit_inr ?? 10,
        maxAmount: upiSettings.max_deposit_inr ?? 100000,
        fee: upiSettings.charge_fee && upiSettings.fee_percent ? `${upiSettings.fee_percent}%` : '0%',
        color: 'text-neon-green',
        bgColor: 'bg-neon-green/10',
      },
    ];
  }
  if (cryptomusSettings?.enabled) {
    paymentMethods = [
      ...paymentMethods,
      {
        id: 'cryptomus_pay',
        name: cryptomusSettings.display_name || 'Cryptomus Crypto',
        icon: Globe,
        description: 'Bitcoin, USDT, ETH · Pay with crypto',
        minAmount: cryptomusSettings.min_deposit_usd ?? 5,
        maxAmount: cryptomusSettings.max_deposit_usd ?? 50000,
        fee: '0%',
        color: 'text-[var(--warning)]',
        bgColor: 'bg-[var(--warning-bg)]',
      },
    ];
  }
  if (manualQrSettings?.enabled) {
    paymentMethods = [
      ...paymentMethods,
      {
        id: 'manual_qr',
        name: manualQrSettings.display_name || 'Manual QR Payment',
        icon: ImagePlus,
        description: 'Scan QR, upload screenshot · Admin approval',
        minAmount: manualMinResolved,
        maxAmount: manualMaxResolved,
        fee: '0%',
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10',
      },
    ];
  }

  // Cashfree (external payment server via ext-pro.xyz/pay)
  if (cashfreeSettings?.enabled) {
    paymentMethods = [
      ...paymentMethods,
      {
        id: 'cashfree_auto',
        name: cashfreeSettings.display_name || 'Auto UPI & Card & QR Code',
        icon: CreditCard,
        description: 'Instant payments via UPI, Cards and QR using Cashfree secure gateway.',
        minAmount: cashfreeSettings.min_deposit_inr ?? 100,
        maxAmount: cashfreeSettings.max_deposit_inr ?? 100000,
        fee: `${cashfreeSettings.fee_percent ?? 0}%`,
        color: 'text-sky-400',
        bgColor: 'bg-sky-400/10',
      },
    ];
  }

  // GCash (Philippines) — manual, instructions + screenshot
  if (gcashSettings?.enabled) {
    paymentMethods = [
      ...paymentMethods,
      {
        id: 'gcash',
        name: gcashSettings.display_name || 'GCash',
        icon: Wallet,
        description: 'Pay via GCash · Upload screenshot · Manual approval',
        minAmount: gcashSettings.min_deposit_php ?? 100,
        maxAmount: gcashSettings.max_deposit_php ?? 500000,
        fee: '0%',
        color: 'text-[var(--text-primary)]',
        bgColor: 'bg-[var(--success-bg)]',
        isGcash: true,
      },
    ];
  }

  const presetAmounts = [10, 25, 50, 100, 250, 500];
  const upiPresetInr = [100, 200, 500, 1000, 2000, 5000];
  const rate = upiSettings?.usd_to_inr_rate ?? 83;
  const amountInrNum = parseFloat(amountInr) || 0;
  const amountUsdEst = amountInrNum > 0 ? amountInrNum / rate : 0;

  const handleTxnIdChange = (val) => {
    const cleaned = String(val).toUpperCase().replace(/[^A-Z0-9]/g, '');
    setTxnId(cleaned);
    if (!cleaned) {
      setTxnError('');
      return;
    }
    if (!cleaned.startsWith('T')) {
      setTxnError('Only PhonePe Transaction IDs are supported and they start with T.');
    } else if (cleaned.length < 15) {
      setTxnError('Transaction ID looks too short. Copy it from the PhonePe receipt.');
    } else {
      setTxnError('');
    }
  };

  const handleDeposit = async () => {
    if (!selectedMethod || !amount) {
      toast.error('Please select a payment method and enter amount');
      return;
    }
    if (selectedMethod === 'paytm_upi' || selectedMethod === 'cryptomus_pay' || selectedMethod === 'manual_qr') return;

    const method = paymentMethods.find(m => m.id === selectedMethod);
    const amountNum = parseFloat(amount);

    if (amountNum < method.minAmount) {
      toast.error(`Minimum amount: ${formatPrice(method.minAmount)}`);
      return;
    }
    if (amountNum > method.maxAmount) {
      toast.error(`Maximum amount: ${formatPrice(method.maxAmount)}`);
      return;
    }

    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post(
        '/deposits',
        { amount: amountNum, method: selectedMethod },
        { headers, withCredentials: true }
      );
      setSuccess(true);
      await refreshUser();
      toast.success(`${formatPrice(amountNum)} added to your balance!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpiSubmit = async () => {
    const txnIdTrim = txnId.trim().toUpperCase();
    if (!txnIdTrim || txnError) {
      toast.error(txnError || 'Enter a valid PhonePe Transaction ID');
      return;
    }
    if (amountInrNum < (upiSettings?.min_deposit_inr ?? 10)) {
      toast.error(`Minimum deposit is ₹${upiSettings?.min_deposit_inr ?? 10}`);
      return;
    }
    if ((upiSettings?.max_deposit_inr ?? 0) > 0 && amountInrNum > (upiSettings?.max_deposit_inr ?? 0)) {
      toast.error(`Maximum deposit is ₹${upiSettings?.max_deposit_inr}`);
      return;
    }
    setUpiError('');
    setUpiCorrectAmount(null);
    setUpiSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await api.post(
        '/payment/upi/submit',
        { order_id: txnIdTrim, amount_inr: amountInrNum },
        { headers, withCredentials: true }
      );
      setUpiSuccess(data);
      await refreshUser();
      toast.success(data?.message || 'Balance added!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed. Try again.';
      setUpiError(msg);
      const correctAmount = err.response?.data?.correct_amount;
      if (typeof correctAmount === 'number' && !Number.isNaN(correctAmount)) {
        setUpiCorrectAmount(correctAmount);
      }
      toast.error(msg);
    } finally {
      setUpiSubmitting(false);
    }
  };

  const handlePayWithCrypto = async () => {
    const amountNum = parseFloat(amount);
    const method = paymentMethods.find(m => m.id === 'cryptomus_pay');
    if (!method || !cryptomusSettings?.enabled) return;
    if (!amountNum || amountNum < method.minAmount) {
      toast.error(`Minimum deposit is $${method.minAmount}`);
      return;
    }
    if (method.maxAmount > 0 && amountNum > method.maxAmount) {
      toast.error(`Maximum deposit is $${method.maxAmount}`);
      return;
    }
    setCryptoCreating(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await api.post(
        '/payment/cryptomus/create',
        { amount_usd: amountNum },
        { headers, withCredentials: true }
      );
      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error(data?.error || 'Could not create payment');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create payment');
    } finally {
      setCryptoCreating(false);
    }
  };

  const payWithCashfree = () => {
    const amountInr = parseFloat(amount);
    const minInr = cashfreeSettings?.min_deposit_inr ?? 100;
    const maxInr = cashfreeSettings?.max_deposit_inr ?? 100000;

    if (!amount || Number.isNaN(amountInr) || amountInr < minInr) {
      toast.error(`Please enter a valid amount (minimum ₹${minInr.toLocaleString()})`);
      return;
    }
    if (amountInr > maxInr) {
      toast.error(`Maximum deposit is ₹${maxInr.toLocaleString()}`);
      return;
    }

    const uname = (user?.username || '').toString().trim().toLowerCase();
    if (!uname) {
      toast.error('Your account does not have a username yet. Please contact support.');
      return;
    }

    // Pass amount in INR so ext-pro.xyz creates the payment order in INR (Cashfree expects INR)
    const amountInrRounded = Math.round(amountInr);
    const redirectUrl = `https://ext-pro.xyz/pay?amount=${amountInrRounded}&currency=INR&username=${encodeURIComponent(uname)}`;
    window.location.href = redirectUrl;
  };

  const copyUpiId = () => {
    const id = upiSettings?.upi_id || '';
    if (id && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      toast.success('UPI ID copied');
    }
  };

  const handleManualCreate = async () => {
    const amountNum = parseFloat(manualAmount);
    const method = paymentMethods.find(m => m.id === 'manual_qr');
    if (!method || !manualQrSettings?.enabled) return;
    if (!amountNum || amountNum < method.minAmount) {
      toast.error(`Minimum deposit is ₹${Number(method.minAmount).toLocaleString()}`);
      return;
    }
    if (method.maxAmount > 0 && amountNum > method.maxAmount) {
      toast.error(`Maximum deposit is ₹${Number(method.maxAmount).toLocaleString()}`);
      return;
    }
    setManualCreating(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = { amount_currency: 'INR', amount_inr: amountNum };
      const { data } = await api.post('/payment/manual/create', payload, { headers, withCredentials: true });
      setManualDepositId(data.deposit_id);
      setManualStep(2);
      toast.success('Next: upload your payment screenshot');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create request');
    } finally {
      setManualCreating(false);
    }
  };

  const handleManualScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setManualScreenshot(reader.result);
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async () => {
    if (!manualDepositId || !manualScreenshot) {
      toast.error('Please upload your payment screenshot');
      return;
    }
    setManualSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post('/payment/manual/submit', { deposit_id: manualDepositId, screenshot_base64: manualScreenshot }, { headers, withCredentials: true });
      setManualSubmitted(true);
      toast.success('Payment submitted. Waiting for admin approval.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleGcashCreate = async () => {
    const amountNum = parseFloat(gcashAmount);
    const method = paymentMethods.find(m => m.id === 'gcash');
    if (!method || !gcashSettings?.enabled) return;
    const minPhp = gcashSettings.min_deposit_php ?? 100;
    const maxPhp = gcashSettings.max_deposit_php ?? 500000;
    if (!amountNum || amountNum < minPhp) {
      toast.error(`Minimum deposit is ₱${minPhp}`);
      return;
    }
    if (amountNum > maxPhp) {
      toast.error(`Maximum deposit is ₱${maxPhp}`);
      return;
    }
    setGcashCreating(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await api.post('/payment/gcash/create', { amount_php: amountNum }, { headers, withCredentials: true });
      setGcashDepositId(data.deposit_id);
      setGcashStep(2);
      toast.success('Next: send payment via GCash and upload screenshot');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create request');
    } finally {
      setGcashCreating(false);
    }
  };

  const handleGcashScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setGcashScreenshot(reader.result);
    reader.readAsDataURL(file);
  };

  const handleGcashSubmit = async () => {
    if (!gcashDepositId || !gcashScreenshot) {
      toast.error('Please upload your GCash payment screenshot');
      return;
    }
    setGcashSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post('/payment/gcash/submit', { deposit_id: gcashDepositId, screenshot_base64: gcashScreenshot }, { headers, withCredentials: true });
      setGcashSubmitted(true);
      toast.success('Payment submitted. We will approve it shortly.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
    } finally {
      setGcashSubmitting(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout title="Add Funds">
        <div className="max-w-md mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-neon-green" size={40} />
              </div>
              <h2 className="text-2xl font-exo font-bold text-[var(--text-primary)] mb-2">Payment Successful!</h2>
              <p className="text-[var(--text-muted)] mb-6">{formatPrice(parseFloat(amount))} has been added to your balance.</p>
              <Button onClick={() => { setSuccess(false); setAmount(''); setSelectedMethod(null); }} className="bg-electric-blue text-black">Add More Funds</Button>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (upiSuccess) {
    const { amount_inr, amount_usd, new_balance } = upiSuccess;
    return (
      <DashboardLayout title="Add Funds">
        <div className="max-w-md mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-neon-green" size={40} />
              </div>
              <h2 className="text-2xl font-exo font-bold text-[var(--text-primary)] mb-2">Payment Verified!</h2>
              <p className="text-[var(--text-muted)] mb-2">₹{amount_inr} paid</p>
              <p className="text-neon-green font-bold mb-1">${Number(amount_usd).toFixed(2)} added to your balance</p>
              <p className="text-[var(--text-muted)] text-sm mb-4">New balance: ${Number(new_balance).toFixed(2)}</p>
              {txnId && <p className="text-[var(--text-muted)] text-xs mb-6">Transaction: {txnId}</p>}
              <div className="flex gap-3 justify-center flex-wrap">
                <Button asChild>
                  <a href="/dashboard/new-order" className="bg-electric-blue text-black">Place New Order</a>
                </Button>
                <Button variant="outline" className="border-[var(--border)]" onClick={() => { setUpiSuccess(null); setUpiStep(1); setAmountInr(''); setTxnId(''); setTxnError(''); setUpiError(''); }}>Add More Funds</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Funds">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {upiSettings?.enabled && (
            <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/40 rounded-lg mb-6">
              <AlertCircle className="text-purple-300 mt-0.5" size={20} />
              <div>
                <p className="text-purple-300 font-medium">PhonePe payments only</p>
                <p className="text-purple-200/80 text-xs">
                  This QR method only supports <span className="font-semibold">PhonePe</span>. Google Pay, Paytm app, BHIM and other UPI apps are not supported.
                </p>
              </div>
            </div>
          )}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <Card className="glass p-6">
              <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-6">Select Payment Method</h2>

              {/* Mobile: dropdown for easier selection */}
              <div className="lg:hidden mb-4">
                {paymentMethods.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm">No payment methods available.</p>
                ) : (
                  <Select
                    value={selectedMethod || ''}
                    onValueChange={(id) => {
                      setSelectedMethod(id);
                      if (id === 'paytm_upi') {
                        setUpiStep(1);
                        setUpiError('');
                        setAmountInr('');
                        setTxnId('');
                        setTxnError('');
                      }
                      if (id === 'manual_qr') {
                        setManualStep(1);
                        setManualAmount('');
                        setManualDepositId(null);
                        setManualScreenshot(null);
                        setManualSubmitted(false);
                      }
                      if (id === 'gcash') {
                        setGcashStep(1);
                        setGcashAmount('');
                        setGcashDepositId(null);
                        setGcashScreenshot(null);
                        setGcashSubmitted(false);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-deep-navy border-[var(--border)] text-[var(--text-primary)] h-11">
                      <SelectValue placeholder="Choose payment method" />
                    </SelectTrigger>
                    <SelectContent className="bg-deep-navy border-[var(--border)] max-h-[70vh]">
                      {paymentMethods.map((method) => (
                        <SelectItem
                          key={method.id}
                          value={method.id}
                          className="text-[var(--text-primary)] focus:bg-[var(--bg-hover)] focus:text-[var(--text-primary)]"
                        >
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Desktop: card list */}
              <div className="hidden lg:block space-y-3">
                {paymentMethods.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm">
                    No payment methods are currently available. Please contact support.
                  </p>
                ) : (
                  paymentMethods.map((method) => (
                    <motion.button
                      key={method.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        if (method.id === 'paytm_upi') {
                          setUpiStep(1);
                          setUpiError('');
                          setAmountInr('');
                          setTxnId('');
                          setTxnError('');
                        }
                        if (method.id === 'manual_qr') {
                          setManualStep(1);
                          setManualAmount('');
                          setManualDepositId(null);
                          setManualScreenshot(null);
                          setManualSubmitted(false);
                        }
                        if (method.id === 'gcash') {
                          setGcashStep(1);
                          setGcashAmount('');
                          setGcashDepositId(null);
                          setGcashScreenshot(null);
                          setGcashSubmitted(false);
                        }
                      }}
                      className={`w-full p-4 rounded-xl border transition-all text-left ${
                        method.isGcash
                          ? selectedMethod === method.id
                            ? 'border-[var(--success)] bg-[var(--bg-tertiary)] ring-2 ring-[var(--success)]'
                            : 'border-[var(--success)]/50 hover:border-[var(--success)] bg-[var(--success-bg)]'
                          : selectedMethod === method.id
                            ? 'border-electric-blue bg-electric-blue/10'
                            : 'border-[var(--border)] hover:border-[var(--border)] bg-[var(--bg-card)]'
                      }`}
                      data-testid={`payment-method-${method.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${method.bgColor} ${method.isGcash ? 'ring-1 ring-[var(--success)]' : ''}`}>
                          <method.icon className={method.color} size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-[var(--text-primary)]">{method.name}</h3>
                            {method.isGcash && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--success)] border border-[var(--success)]">
                                🇵🇭 Philippines
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-muted)]">{method.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[var(--text-muted)]">Fee: {method.fee}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {method.id === 'gcash'
                              ? `₱${Number(method.minAmount).toLocaleString()} - ₱${Number(method.maxAmount).toLocaleString()}`
                              : method.id === 'cashfree_auto' || method.id === 'manual_qr'
                                ? `₹${Number(method.minAmount).toLocaleString()} - ₹${Number(method.maxAmount).toLocaleString()}`
                                : `${formatPrice(method.minAmount)} - ${formatPrice(method.maxAmount)}`}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </Card>

            {/* Amount / UPI / Crypto / Cashfree flow */}
            <Card className="glass p-6">
              {selectedMethod === 'cryptomus_pay' ? (
                <>
                  <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-6">Enter Amount (USD)</h2>
                  <Label className="text-[var(--text-muted)]">Amount ($)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 25"
                    className="mt-2 mb-2 bg-deep-navy border-[var(--border)] text-xl"
                  />
                  <p className="text-[var(--text-muted)] text-sm mb-4">
                    Min: ${cryptomusSettings?.min_deposit_usd ?? 5} · Max: ${cryptomusSettings?.max_deposit_usd ?? 50000}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[10, 25, 50, 100, 250, 500].map((p) => (
                      <Button
                        key={p}
                        variant={amount === String(p) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAmount(String(p))}
                        className={amount === String(p) ? 'bg-neon-green text-black' : 'border-[var(--border)]'}
                      >
                        ${p}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={handlePayWithCrypto}
                    disabled={cryptoCreating || !amount || parseFloat(amount) < (cryptomusSettings?.min_deposit_usd ?? 5)}
                    className="w-full bg-[var(--warning)] hover:opacity-90 text-[var(--text-inverse)] font-bold py-6"
                  >
                    {cryptoCreating ? 'Creating…' : 'Pay with Crypto'}
                  </Button>
                  <p className="text-[var(--text-muted)] text-xs mt-3">You will be redirected to Cryptomus to complete payment. Balance is credited automatically after confirmation.</p>
                </>
              ) : selectedMethod === 'cashfree_auto' ? (
                <>
                  <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-6">
                    Auto UPI &amp; Card &amp; QR Code
                  </h2>
                  <Label className="text-[var(--text-muted)]">Amount (INR ₹)</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {[100, 500, 1000, 2000, 5000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(String(preset))}
                        className="px-3 py-1.5 rounded bg-electric-blue/20 text-electric-blue text-sm font-medium hover:bg-electric-blue/30 border border-electric-blue/40"
                      >
                        ₹{preset.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="mt-2 mb-2 bg-deep-navy border-[var(--border)] text-xl"
                  />
                  <p className="text-[var(--text-muted)] text-xs mb-3">
                    Min: ₹{(cashfreeSettings?.min_deposit_inr ?? 100).toLocaleString()} · Max: ₹{(cashfreeSettings?.max_deposit_inr ?? 100000).toLocaleString()}
                    {cashfreeSettings?.usd_to_inr_rate && amount && !isNaN(parseFloat(amount)) && (
                      <span className="ml-2 text-[var(--text-muted)]">≈ ${(parseFloat(amount) / cashfreeSettings.usd_to_inr_rate).toFixed(2)} USD</span>
                    )}
                  </p>
                  <Button
                    type="button"
                    onClick={payWithCashfree}
                    className="w-full mt-3 bg-electric-blue hover:bg-electric-blue/90 text-black font-semibold py-3"
                  >
                    Pay with Cashfree
                  </Button>
                  <p className="text-[var(--text-muted)] text-xs mt-2">Secure payment powered by Cashfree</p>
                </>
              ) : selectedMethod === 'manual_qr' ? (
                <>
                  <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-6">
                    {manualStep === 1 && 'Step 1: Enter amount & show QR'}
                    {manualStep === 2 && 'Step 2: Upload payment screenshot'}
                  </h2>

                  {manualSubmitted ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-neon-green" size={32} />
                      </div>
                      <p className="text-neon-green font-bold mb-2">Payment submitted</p>
                      <p className="text-[var(--text-muted)] text-sm mb-4">Waiting for admin approval. Balance will be added once approved.</p>
                      <Button variant="outline" className="border-[var(--border)]" onClick={() => { setManualSubmitted(false); setManualStep(1); setManualAmount(''); setManualDepositId(null); setManualScreenshot(null); }}>Submit another</Button>
                    </div>
                  ) : manualStep === 1 && (
                    <>
                      <p className="text-[var(--text-muted)] text-sm mb-2">
                        Scan the QR code with your UPI/bank app or banking app, pay the amount, then upload a clear screenshot
                        of the payment showing <span className="font-semibold">amount, date/time and reference/UTR</span>.
                      </p>
                      <p className="text-[var(--text-muted)] text-xs mb-4">
                        After you pay, tap the transaction in your app and capture the full receipt screen (do not crop out details).
                      </p>
                      {manualQrSettings?.qr_code_url && (
                        <div className="flex justify-center mb-4">
                          <img src={assetUrl(manualQrSettings.qr_code_url)} alt="Payment QR" className="max-w-[200px] max-h-[200px] rounded-lg border border-[var(--border)]" />
                        </div>
                      )}
                      {manualQrSettings?.instructions && (
                        <p className="text-[var(--text-muted)] text-sm mb-4 whitespace-pre-wrap">{manualQrSettings.instructions}</p>
                      )}
                      <Label className="text-[var(--text-muted)]">Amount (INR ₹)</Label>
                      <Input
                        type="number"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="mt-2 mb-2 bg-deep-navy border-[var(--border)]"
                      />
                      <p className="text-[var(--text-muted)] text-xs mb-4">
                        Min: ₹{manualMinResolved.toLocaleString()} · Max: ₹{manualMaxResolved.toLocaleString()}
                        {manualQrSettings?.usd_to_inr_rate && manualAmount && !Number.isNaN(parseFloat(manualAmount)) && parseFloat(manualAmount) > 0 && (
                          <span className="block mt-1">
                            ≈ {formatPrice(parseFloat(manualAmount) / Number(manualQrSettings.usd_to_inr_rate))} panel balance (rate ₹
                            {Number(manualQrSettings.usd_to_inr_rate).toLocaleString()} / $1)
                          </span>
                        )}
                      </p>
                      <Button onClick={handleManualCreate} disabled={manualCreating || !manualAmount} className="w-full bg-purple-500 hover:bg-purple-600 text-[var(--text-inverse)]">
                        {manualCreating ? 'Creating…' : 'Next: Upload screenshot'}
                      </Button>
                    </>
                  )}

                  {manualStep === 2 && !manualSubmitted && (
                    <>
                      <p className="text-[var(--text-muted)] text-sm mb-2">
                        Amount:&nbsp;₹{Number(manualAmount || 0).toLocaleString()}
                      </p>
                      <Label className="text-[var(--text-muted)]">Upload payment screenshot</Label>
                      <div className="mt-2 mb-4">
                        <input type="file" accept="image/*" onChange={handleManualScreenshotChange} className="text-[var(--text-muted)] text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[var(--bg-hover)] file:text-[var(--text-primary)]" />
                      </div>
                      {manualScreenshot && (
                        <div className="mb-4">
                          <img src={manualScreenshot} alt="Screenshot" className="max-h-40 rounded border border-[var(--border)]" />
                        </div>
                      )}
                      <Button onClick={handleManualSubmit} disabled={manualSubmitting || !manualScreenshot} className="w-full bg-neon-green text-black font-bold py-6">
                        {manualSubmitting ? 'Submitting…' : 'Submit deposit request'}
                      </Button>
                      <p className="text-[var(--text-muted)] text-xs mt-3">Payment submitted. Waiting for admin approval.</p>
                      <Button variant="ghost" className="w-full mt-2 text-[var(--text-muted)]" onClick={() => setManualStep(1)}>
                        <ArrowLeft size={16} className="mr-2" /> Back
                      </Button>
                    </>
                  )}
                </>
              ) : selectedMethod === 'gcash' ? (
                <>
                  <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--success-bg)] border border-[var(--success)]">
                    <Wallet className="text-[var(--success)]" size={22} />
                    <div>
                      <p className="text-[var(--success)] font-semibold">GCash — Philippines</p>
                      <p className="text-[var(--text-muted)] text-xs">Pay via GCash, then upload screenshot. We approve manually.</p>
                    </div>
                  </div>
                  <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-4">
                    {gcashStep === 1 && 'How to pay with GCash to Coins.ph'}
                    {gcashStep === 2 && 'Upload your payment screenshot'}
                  </h2>

                  {gcashSubmitted ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-[var(--success)]" size={32} />
                      </div>
                      <p className="text-[var(--success)] font-bold mb-2">Payment submitted</p>
                      <p className="text-[var(--text-muted)] text-sm mb-4">We will approve your deposit shortly. Balance will be added once verified.</p>
                      <Button
                        variant="outline"
                        className="border-[var(--success)] text-[var(--success)]"
                        onClick={() => { setGcashSubmitted(false); setGcashStep(1); setGcashAmount(''); setGcashDepositId(null); setGcashScreenshot(null); }}
                      >
                        Submit another
                      </Button>
                    </div>
                  ) : gcashStep === 1 && (
                    <>
                      {/* Payment details card */}
                      {(gcashSettings?.account_name || gcashSettings?.account_number) && (
                        <div className="mb-5 p-4 rounded-xl bg-[var(--success-bg)] border-2 border-[var(--success)]">
                          <p className="text-[var(--success)] font-semibold text-sm uppercase tracking-wide mb-3">Send payment to</p>
                          <div className="space-y-2">
                            {gcashSettings.account_name && (
                              <div className="flex justify-between items-center gap-3">
                                <span className="text-[var(--text-muted)] text-sm">Account name</span>
                                <span className="text-[var(--text-primary)] font-medium">{gcashSettings.account_name}</span>
                              </div>
                            )}
                            {gcashSettings.account_number && (
                              <div className="flex justify-between items-center gap-3">
                                <span className="text-[var(--text-muted)] text-sm">Number</span>
                                <span className="text-[var(--success)] font-mono font-semibold text-lg">{gcashSettings.account_number}</span>
                              </div>
                            )}
                            {gcashSettings.reference_receipt && (
                              <div className="mt-3 pt-3 border-t border-[var(--success)]">
                                <p className="text-[var(--text-muted)] text-xs mb-1">In receipt / reference, enter:</p>
                                <p className="text-[var(--text-primary)] font-mono bg-black/30 px-3 py-2 rounded border border-[var(--success)]/30">{gcashSettings.reference_receipt}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step-by-step instructions */}
                      {gcashSettings?.instructions && (
                        <div className="mb-5">
                          <p className="text-[var(--text-primary)] font-semibold mb-3">Follow these steps</p>
                          <ul className="space-y-2">
                            {(gcashSettings.instructions || '')
                              .split(/\r?\n/)
                              .map((line) => line.trim())
                              .filter(Boolean)
                              .map((line, i) => (
                                <li key={i} className="flex gap-3 items-start">
                                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--success)] text-[var(--text-inverse)] text-sm font-bold flex items-center justify-center">{i + 1}</span>
                                  <span className="text-[var(--text-secondary)] text-sm pt-0.5">{line}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--border)]">
                        <Label className="text-[var(--text-muted)]">Amount (PHP ₱)</Label>
                        <div className="flex flex-wrap gap-2 mt-2 mb-2">
                          {[100, 500, 1000, 2000, 5000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setGcashAmount(String(preset))}
                              className="px-3 py-1.5 rounded bg-[var(--success-bg)] text-[var(--success)] text-sm font-medium hover:bg-[var(--success-bg)] border border-[var(--success)]"
                            >
                              ₱{preset.toLocaleString()}
                            </button>
                          ))}
                        </div>
                        <Input
                          type="number"
                          value={gcashAmount}
                          placeholder="e.g. 500"
                          onChange={(e) => setGcashAmount(e.target.value)}
                          className="mt-2 mb-2 bg-deep-navy border-[var(--border)]"
                        />
                        <p className="text-[var(--text-muted)] text-xs mb-4">
                          Min: ₱{(gcashSettings?.min_deposit_php ?? 100).toLocaleString()} · Max: ₱{(gcashSettings?.max_deposit_php ?? 500000).toLocaleString()}
                          {gcashSettings?.usd_to_php_rate && gcashAmount && !isNaN(parseFloat(gcashAmount)) && (
                            <span className="ml-2 text-[var(--text-muted)]">≈ ${(parseFloat(gcashAmount) / gcashSettings.usd_to_php_rate).toFixed(2)} USD</span>
                          )}
                        </p>
                        <Button
                          onClick={handleGcashCreate}
                          disabled={gcashCreating || !gcashAmount}
                          className="w-full bg-[var(--success)] hover:bg-[var(--success)] text-[var(--text-inverse)] font-bold py-6"
                        >
                          {gcashCreating ? 'Creating…' : 'Next: Upload screenshot'}
                        </Button>
                      </div>
                    </>
                  )}

                  {gcashStep === 2 && !gcashSubmitted && (
                    <>
                      <p className="text-[var(--text-muted)] text-sm mb-2">
                        Amount: ₱{Number(gcashAmount || 0).toLocaleString()}
                        {gcashSettings?.usd_to_php_rate && (
                          <span className="ml-2 text-[var(--text-muted)]">≈ ${(Number(gcashAmount || 0) / gcashSettings.usd_to_php_rate).toFixed(2)} USD</span>
                        )}
                      </p>
                      <Label className="text-[var(--text-muted)]">Upload GCash payment screenshot</Label>
                      <p className="text-[var(--text-muted)] text-xs mb-2">Screenshot of your GCash payment (amount, date, reference visible)</p>
                      <div className="mt-2 mb-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleGcashScreenshotChange}
                          className="text-[var(--text-muted)] text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[var(--success-bg)] file:text-[var(--success)]"
                        />
                      </div>
                      {gcashScreenshot && (
                        <div className="mb-4">
                          <img src={gcashScreenshot} alt="Screenshot" className="max-h-40 rounded border border-[var(--success)]" />
                        </div>
                      )}
                      <Button
                        onClick={handleGcashSubmit}
                        disabled={gcashSubmitting || !gcashScreenshot}
                        className="w-full bg-[var(--success)] hover:bg-[var(--success)] text-[var(--text-inverse)] font-bold py-6"
                      >
                        {gcashSubmitting ? 'Submitting…' : 'Submit for approval'}
                      </Button>
                      <Button variant="ghost" className="w-full mt-2 text-[var(--text-muted)]" onClick={() => setGcashStep(1)}>
                        <ArrowLeft size={16} className="mr-2" /> Back
                      </Button>
                    </>
                  )}
                </>
              ) : selectedMethod === 'paytm_upi' ? (
                <>
                  <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-6">
                    {upiStep === 1 && 'Enter Amount (INR)'}
                    {upiStep === 2 && `Pay ₹${amountInrNum || 0}`}
                    {upiStep === 3 && 'Enter Transaction ID'}
                  </h2>

                  {upiStep === 1 && (
                    <>
                      <Label className="text-[var(--text-muted)]">Amount (in INR ₹)</Label>
                      <Input
                        type="number"
                        value={amountInr}
                        onChange={(e) => setAmountInr(e.target.value)}
                        placeholder="e.g. 500"
                        className="mt-2 mb-2 bg-deep-navy border-[var(--border)] text-xl"
                      />
                      <p className="text-[var(--text-muted)] text-sm mb-4">
                        Min: ₹{upiSettings?.min_deposit_inr ?? 10} | Rate: ₹{rate}/$1 · ≈ ${amountUsdEst.toFixed(2)} USD
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {upiPresetInr.map((p) => (
                          <Button
                            key={p}
                            variant={amountInr === String(p) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAmountInr(String(p))}
                            className={amountInr === String(p) ? 'bg-neon-green text-black' : 'border-[var(--border)]'}
                          >
                            ₹{p}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={() => setUpiStep(2)}
                        disabled={amountInrNum < (upiSettings?.min_deposit_inr ?? 10)}
                        className="w-full bg-neon-green hover:bg-neon-green/90 text-black"
                      >
                        Next: Show QR Code <ArrowRight size={18} className="ml-2 inline" />
                      </Button>
                    </>
                  )}

                  {upiStep === 2 && (
                    <>
                      <p className="text-[var(--text-muted)] text-sm mb-4">Scan QR with any UPI app (PhonePe, GPay, Paytm, BHIM)</p>
                      {upiSettings?.qr_code_url && (
                        <div className="flex justify-center mb-4">
                          <img
                            src={assetUrl(upiSettings.qr_code_url)}
                            alt="UPI QR"
                            className="max-w-[220px] max-h-[220px] rounded-lg border border-[var(--border)]"
                          />
                        </div>
                      )}
                      {upiSettings?.upi_id && (
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[var(--text-muted)]">UPI ID:</span>
                          <code className="text-neon-green flex-1 truncate">{upiSettings.upi_id}</code>
                          <Button variant="outline" size="sm" onClick={copyUpiId} className="border-[var(--border)]">Copy</Button>
                        </div>
                      )}
                      {upiSettings?.instructions && (
                        <p className="text-[var(--text-muted)] text-sm mb-4 whitespace-pre-wrap">{upiSettings.instructions}</p>
                      )}
                      <p className="text-[var(--warning)] text-sm mb-4">Pay EXACTLY ₹{amountInrNum}. Save your Transaction ID.</p>
                      <div className="flex gap-3">
                        <Button variant="outline" className="border-[var(--border)]" onClick={() => setUpiStep(1)}>
                          <ArrowLeft size={18} className="mr-2" /> Change Amount
                        </Button>
                        <Button className="bg-neon-green text-black" onClick={() => setUpiStep(3)}>I&apos;ve Paid <ArrowRight size={18} className="ml-2 inline" /></Button>
                      </div>
                    </>
                  )}

                  {upiStep === 3 && (
                    <>
                      <Label className="text-[var(--text-muted)]">PhonePe Transaction ID</Label>
                      <Input
                        value={txnId}
                        onChange={(e) => handleTxnIdChange(e.target.value)}
                        placeholder="T2603090059366482162567"
                        className={`mt-2 mb-2 bg-deep-navy font-mono ${
                          txnError ? 'border-[var(--error)]/70' : 'border-[var(--border)]'
                        }`}
                      />
                      {txnError && <p className="text-[var(--error)] text-sm mb-2">{txnError}</p>}
                      <p className="text-[var(--text-muted)] text-xs mb-2">
                        Open <span className="font-semibold">PhonePe</span> → History → tap your payment → copy the{' '}
                        <span className="font-semibold">Transaction ID</span> (starts with T).
                      </p>
                      <Label className="text-[var(--text-muted)]">Amount Paid (₹)</Label>
                      <Input
                        type="number"
                        value={amountInr}
                        onChange={(e) => setAmountInr(e.target.value)}
                        className="mt-2 mb-4 bg-deep-navy border-[var(--border)]"
                      />
                      {upiError && (
                        <div className="mb-3 p-3 rounded-lg bg-[var(--error-bg)] border border-[var(--error)]/30 text-[var(--error)] text-sm whitespace-pre-line">
                          {upiError}
                        </div>
                      )}
                      {upiCorrectAmount != null && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mb-3 border-neon-green/60 text-neon-green"
                          onClick={() => {
                            setAmountInr(String(upiCorrectAmount));
                            setUpiCorrectAmount(null);
                            setUpiError('');
                          }}
                        >
                          Use ₹{upiCorrectAmount.toFixed ? upiCorrectAmount.toFixed(0) : upiCorrectAmount}
                        </Button>
                      )}
                      <p className="text-[var(--text-muted)] text-xs mb-4">Verified via Paytm API. Balance credited in seconds.</p>
                      <Button
                        onClick={handleUpiSubmit}
                        disabled={upiSubmitting || !!txnError || !txnId.trim()}
                        className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-bold py-6"
                      >
                        {upiSubmitting ? (
                          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mx-auto" />
                        ) : (
                          'Verify & Add Balance'
                        )}
                      </Button>
                      <Button variant="ghost" className="w-full mt-2 text-[var(--text-muted)]" onClick={() => setUpiStep(2)}>
                        <ArrowLeft size={16} className="mr-2" /> Back
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-6">Enter Amount</h2>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {presetAmounts.map((preset) => (
                      <Button
                        key={preset}
                        variant={amount === String(preset) ? "default" : "outline"}
                        onClick={() => setAmount(String(preset))}
                        className={amount === String(preset) ? "bg-electric-blue text-black" : "border-[var(--border)]"}
                        data-testid={`preset-${preset}`}
                      >
                        {formatPrice(preset)}
                      </Button>
                    ))}
                  </div>
                  <div className="mb-6">
                    <Label className="text-[var(--text-muted)]">Custom Amount</Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="pl-10 bg-deep-navy border-[var(--border)] text-2xl font-bold"
                        data-testid="custom-amount-input"
                      />
                    </div>
                  </div>
                  {amount && selectedMethod && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[var(--bg-card)] rounded-lg p-4 mb-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-[var(--text-muted)]">Amount</span>
                        <span className="text-[var(--text-primary)]">{formatPrice(parseFloat(amount))}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[var(--text-muted)]">Fee</span>
                        <span className="text-neon-green">{formatPrice(0)}</span>
                      </div>
                      <div className="border-t border-[var(--border)] pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-primary)] font-bold">Total</span>
                          <span className="text-electric-blue font-bold text-xl">{formatPrice(parseFloat(amount))}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                      <p className="text-[var(--text-muted)] text-sm">
                        Select a payment method on the left to continue.
                      </p>
                </>
              )}
            </Card>
          </div>
        </motion.div>

        {/* Inline Deposit History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass overflow-hidden border-[var(--border)]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="text-[var(--text-primary)] font-exo font-bold text-lg">Recent Deposits</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDeposits}
                className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </Button>
            </div>
            {depositsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-electric-blue border-t-transparent rounded-full mx-auto" />
              </div>
            ) : deposits.length === 0 ? (
              <div className="p-6 text-center text-[var(--text-muted)] text-sm">
                No deposits yet. Once you add funds, they will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[var(--bg-card)]">
                    <tr>
                      <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Date</th>
                      <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Transaction ID</th>
                      <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Method</th>
                      <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Status</th>
                      <th className="text-right p-3 text-[var(--text-muted)] font-medium text-sm">Amount (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d) => {
                      const rowKey = d.deposit_id || d._id || `${d.created_at}-${d.payment_type}`;
                      const date = d.created_at ? new Date(d.created_at) : null;
                      const dateLabel = date
                        ? date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';
                      return (
                        <tr key={rowKey} className="border-t border-[var(--border)] hover:bg-[var(--bg-card)]">
                          <td className="p-3 text-[var(--text-muted)] text-xs sm:text-sm">{dateLabel}</td>
                          <td className="p-3">
                            <span className="font-mono text-xs sm:text-sm text-[var(--text-secondary)]">
                              {d.transaction_id || d.deposit_id || '—'}
                            </span>
                          </td>
                          <td className="p-3 text-[var(--text-primary)] text-xs sm:text-sm capitalize">
                            {d.method || d.payment_type?.replace(/_/g, ' ') || '—'}
                          </td>
                          <td className="p-3 text-xs sm:text-sm">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full capitalize text-xs ${
                                d.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : d.status === 'pending'
                                  ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
                                  : d.status === 'rejected' || d.status === 'failed'
                                  ? 'bg-[var(--error-bg)] text-[var(--error)]'
                                  : 'bg-[var(--error-bg)] text-[var(--error)]'
                              }`}
                            >
                              {d.status || '—'}
                            </span>
                          </td>
                          <td className="p-3 text-right text-neon-green font-bold text-xs sm:text-sm">
                            <div>+{formatPrice(d.amount ?? 0)}</div>
                            {d.payment_type === 'manual_qr' && d.amount_inr != null && d.amount_inr > 0 && (
                              <div className="text-[var(--text-muted)] font-normal text-[10px] sm:text-xs mt-0.5">
                                Paid ₹{Number(d.amount_inr).toLocaleString()}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AddFundsPage;
