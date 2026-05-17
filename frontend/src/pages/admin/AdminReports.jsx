import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Download, Calendar, DollarSign, ShoppingCart, 
  Users, CreditCard, Loader2, TrendingUp, TrendingDown,   Ban,
  Unlock,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import { API } from '../../config';
import api from '../../lib/axios';
import { toast } from 'sonner';
import BulkActionsBar from '../../components/admin/BulkActionsBar';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useCurrency } from '../../context/CurrencyContext';
import { getServiceDisplayNumber } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const tabTriggerClass =
  'text-gray-200 hover:text-white data-[state=inactive]:text-gray-200 data-[state=active]:bg-cyber-purple data-[state=active]:text-white data-[state=active]:shadow-sm';

const AdminReports = ({ paymentHistoryOnly = false }) => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [revenueReport, setRevenueReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [ordersReport, setOrdersReport] = useState(null);
  const [paymentsReport, setPaymentsReport] = useState(null);
  const [deliveryReport, setDeliveryReport] = useState(null);
  const [deliveryPlatform, setDeliveryPlatform] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('all');
  const [deliveryProvider, setDeliveryProvider] = useState('');
  const [deliverySort, setDeliverySort] = useState({ col: '', dir: 'asc' });
  const [reversingId, setReversingId] = useState(null);
  const [unblockingId, setUnblockingId] = useState(null);
  const paymentsBulk = useBulkSelection();

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const getDateParams = () => {
    if (dateRange === 'custom' && customStart && customEnd) {
      return `start_date=${customStart}&end_date=${customEnd}`;
    }
    const end = new Date().toISOString();
    const start = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();
    return `start_date=${start}&end_date=${end}`;
  };

  const defaultReport = (summary = {}, byDay = [], extra = {}) => ({ summary: { ...summary }, by_day: Array.isArray(byDay) ? byDay : [], ...extra });

  const fetchRevenueReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/revenue?${getDateParams()}`, { headers, withCredentials: true });
      const d = res.data;
      setRevenueReport(d && typeof d === 'object' ? { summary: d.summary || {}, by_day: d.by_day || [], by_payment_method: Array.isArray(d.by_payment_method) ? d.by_payment_method : [] } : defaultReport());
    } catch (error) {
      toast.error('Failed to fetch revenue report');
      setRevenueReport(defaultReport());
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/profit?${getDateParams()}`, { headers, withCredentials: true });
      const d = res.data;
      setProfitReport(d && typeof d === 'object' ? { summary: d.summary || {}, by_day: d.by_day || [], top_profitable_services: Array.isArray(d.top_profitable_services) ? d.top_profitable_services : [] } : defaultReport());
    } catch (error) {
      toast.error('Failed to fetch profit report');
      setProfitReport(defaultReport());
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/orders?${getDateParams()}`, { headers, withCredentials: true });
      const d = res.data;
      setOrdersReport(d && typeof d === 'object' ? { summary: { ...(d.summary || {}), by_status: d.summary?.by_status || {} }, by_day: d.by_day || [], top_services: Array.isArray(d.top_services) ? d.top_services : [] } : defaultReport());
    } catch (error) {
      toast.error('Failed to fetch orders report');
      setOrdersReport(defaultReport());
    } finally {
      setLoading(false);
    }
  };

  const handleBlockDeposit = async (deposit) => {
    const total = (Number(deposit.amount) || 0) + (Number(deposit.bonus_amount ?? deposit.bonus) || 0);
    if (!window.confirm(`Block this transaction and deduct ${formatPrice(total)} from ${deposit.username || deposit.user_id}? You can restore the balance later with Unblock.`)) return;
    setReversingId(deposit.deposit_id);
    try {
      await api.post('/admin/deposits/reverse', { deposit_id: deposit.deposit_id }, { headers, withCredentials: true });
      toast.success('Transaction blocked and amount deducted from user balance.');
      await fetchPaymentsReport();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to block transaction');
    } finally {
      setReversingId(null);
    }
  };

  const handleUnblockDeposit = async (deposit) => {
    const total = (Number(deposit.amount) || 0) + (Number(deposit.bonus_amount ?? deposit.bonus) || 0);
    if (!window.confirm(`Unblock this deposit and credit ${formatPrice(total)} back to ${deposit.username || deposit.user_id}?`)) return;
    setUnblockingId(deposit.deposit_id);
    try {
      await api.post('/admin/deposits/unblock', { deposit_id: deposit.deposit_id }, { headers, withCredentials: true });
      toast.success('Deposit unblocked; balance restored.');
      await fetchPaymentsReport();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unblock deposit');
    } finally {
      setUnblockingId(null);
    }
  };

  const fetchPaymentsReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/payments?${getDateParams()}`, { headers, withCredentials: true });
      const d = res.data;
      setPaymentsReport(d && typeof d === 'object' ? { summary: d.summary || {}, by_method: Array.isArray(d.by_method) ? d.by_method : [], recent_deposits: Array.isArray(d.recent_deposits) ? d.recent_deposits : [] } : defaultReport());
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fetch payments report');
      setPaymentsReport(defaultReport());
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryReport = async () => {
    setLoading(true);
    try {
      let q = getDateParams();
      if (deliveryPlatform) q += `&platform=${encodeURIComponent(deliveryPlatform)}`;
      if (deliveryStatus && deliveryStatus !== 'all') q += `&status=${encodeURIComponent(deliveryStatus)}`;
      if (deliveryProvider) q += `&provider=${encodeURIComponent(deliveryProvider)}`;
      const res = await api.get(`/admin/reports/delivery?${q}`, { headers, withCredentials: true });
      setDeliveryReport(res.data?.rows ?? []);
    } catch (error) {
      toast.error('Failed to fetch delivery report');
      setDeliveryReport([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (paymentHistoryOnly) return;
    fetchRevenueReport();
  }, [token, paymentHistoryOnly]);

  useEffect(() => {
    if (!token || !paymentHistoryOnly) return;
    if (dateRange === 'custom' && (!customStart || !customEnd)) return;
    fetchPaymentsReport();
  }, [token, paymentHistoryOnly, dateRange, customStart, customEnd]);

  const exportCSV = async (reportType) => {
    try {
      let q = getDateParams();
      if (reportType === 'delivery') {
        if (deliveryPlatform) q += `&platform=${encodeURIComponent(deliveryPlatform)}`;
        if (deliveryStatus && deliveryStatus !== 'all') q += `&status=${encodeURIComponent(deliveryStatus)}`;
        if (deliveryProvider) q += `&provider=${encodeURIComponent(deliveryProvider)}`;
      }
      window.open(`/admin/reports/${reportType}/export?${q}`, '_blank');
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const formatAvgTime = (seconds) => {
    if (seconds == null || seconds < 0) return '—';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);
    if (days >= 1) return `${days} days`;
    if (hrs >= 1) return `${hrs} hrs`;
    return `${mins} mins`;
  };
  const avgTimeColor = (seconds) => {
    if (seconds == null || seconds < 0) return 'text-gray-400';
    if (seconds < 3600) return 'text-emerald-400';
    if (seconds <= 43200) return 'text-yellow-400';
    return 'text-red-400';
  };

  const deliveryRowsSorted = React.useMemo(() => {
    const rows = Array.isArray(deliveryReport) ? [...deliveryReport] : [];
    const { col, dir } = deliverySort;
    if (!col) return rows;
    const mult = dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      let va = a[col];
      let vb = b[col];
      if (typeof va === 'number' && typeof vb === 'number') return mult * (va - vb);
      return mult * String(va ?? '').localeCompare(String(vb ?? ''));
    });
  }, [deliveryReport, deliverySort]);
  const toggleDeliverySort = (col) => {
    setDeliverySort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-deep-navy/95 border border-cyber-purple/30 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {typeof entry.value === 'number' ? (entry.name.includes('$') ? formatPrice(entry.value) : entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ label, value, icon: Icon, color, subtext }) => (
    <Card className="glass p-4 border-cyber-purple/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          <p className={`text-xl font-exo font-bold ${color}`}>{value}</p>
          {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color.replace('text-', '')}/10`}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </Card>
  );

  const depositsScrollClass = paymentHistoryOnly
    ? 'max-h-[min(75vh,880px)] overflow-y-auto overflow-x-auto'
    : 'max-h-[32rem] overflow-y-auto overflow-x-auto';

  const renderRecentDepositsContent = () => {
    if (!paymentsReport) return null;
    return (
      <>
        {Array.isArray(paymentsReport.recent_deposits) && paymentsReport.recent_deposits.length === 0 && (
          <Card className="glass p-6 border-white/10">
            <p className="text-gray-400 text-sm text-center py-6">
              No deposit rows in this date range. Adjust the date filter above to refresh.
            </p>
          </Card>
        )}

        {Array.isArray(paymentsReport.recent_deposits) && paymentsReport.recent_deposits.length > 0 && (
          <Card className="glass p-6 border-cyber-purple/20 w-full min-w-0">
            <h4 className="text-white font-bold mb-4">Recent Deposits (all users, newest first)</h4>
            <div className="mb-4">
              <BulkActionsBar
                type="payments"
                selectedIds={paymentsBulk.selectedIds}
                onClear={paymentsBulk.clear}
                onApplied={fetchPaymentsReport}
              />
            </div>
            <div className={depositsScrollClass}>
              <Table>
                <TableHeader>
                  <TableRow className="border-cyber-purple/20">
                    <TableHead className="text-gray-300 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all deposits"
                        checked={
                          (paymentsReport?.recent_deposits?.length ?? 0) > 0 &&
                          (paymentsReport.recent_deposits || []).every((d) => paymentsBulk.isSelected(d.deposit_id))
                        }
                        onChange={(e) =>
                          paymentsBulk.setMany(
                            (paymentsReport?.recent_deposits || []).map((d) => d.deposit_id),
                            e.target.checked
                          )
                        }
                      />
                    </TableHead>
                    <TableHead className="text-gray-300">ID</TableHead>
                    <TableHead className="text-gray-300">Username</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Bonus</TableHead>
                    <TableHead className="text-gray-300">Source</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300 w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(paymentsReport.recent_deposits) ? paymentsReport.recent_deposits : []).map((d, rowIndex) => {
                    const isReversed = d.status === 'reversed' || d.status === 'blocked';
                    const isReversing = reversingId === d.deposit_id;
                    const isUnblocking = unblockingId === d.deposit_id;
                    const n = rowIndex + 1;
                    const displayPaymentId = n <= 999 ? String(n).padStart(3, '0') : String(n);
                    return (
                      <TableRow key={d.deposit_id} className="border-cyber-purple/10">
                        <TableCell className="text-gray-300">
                          <input
                            type="checkbox"
                            aria-label={`Select ${d.deposit_id}`}
                            checked={paymentsBulk.isSelected(d.deposit_id)}
                            onChange={() => paymentsBulk.toggleOne(d.deposit_id)}
                          />
                        </TableCell>
                        <TableCell className="text-electric-blue font-mono text-sm tabular-nums">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{displayPaymentId}</span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-deep-navy border-white/10 max-w-xs font-mono text-xs">
                                Full payment id: {d.deposit_id}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-white">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium">{d.username || d.user_id || '—'}</span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-deep-navy border-white/10">
                                {d.email ? `${d.email}` : `User ID: ${d.user_id || '—'}`}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-neon-green">{formatPrice(d.amount ?? 0)}</TableCell>
                        <TableCell className="text-cyber-purple">{formatPrice(d.bonus_amount ?? 0)}</TableCell>
                        <TableCell className="text-gray-200 text-xs">{d.source || (d.method || '—').replace(/_/g, ' ')}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${isReversed ? 'bg-red-500/20 text-red-400' : d.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {d.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {!isReversed && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/20 h-8 px-2"
                                disabled={isReversing}
                                onClick={() => handleBlockDeposit(d)}
                                title="Block transaction and deduct this amount from user balance"
                              >
                                {isReversing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                              </Button>
                            )}
                            {isReversed && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 h-8 px-2"
                                disabled={isUnblocking}
                                onClick={() => handleUnblockDeposit(d)}
                                title="Restore blocked amount to user balance"
                              >
                                {isUnblocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </>
    );
  };

  const renderFullPaymentsReport = () => {
    if (!paymentsReport) {
      return (
        <Card className="glass p-6 border-white/10">
          <p className="text-gray-300 text-sm text-center py-6">No data loaded.</p>
        </Card>
      );
    }
    return (
      <div className="space-y-6 w-full min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-exo font-bold text-white">Payments Report</h3>
            <p className="text-gray-400 text-sm mt-1">Payment and deposit history for the selected date range.</p>
          </div>
          <Button type="button" onClick={() => exportCSV('payments')} variant="outline" className="border-white/10 text-gray-200 shrink-0">
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Deposits"
            value={paymentsReport.summary?.total_deposits ?? paymentsReport.summary?.total_count ?? paymentsReport.summary?.total_payments ?? 0}
            icon={CreditCard}
            color="text-electric-blue"
          />
          <StatCard label="Total Amount" value={formatPrice(Number(paymentsReport.summary?.total_amount ?? 0))} icon={DollarSign} color="text-neon-green" />
          <StatCard label="Total Bonus" value={formatPrice(Number(paymentsReport.summary?.total_bonus ?? 0))} icon={TrendingUp} color="text-cyber-purple" />
          <StatCard
            label="Total Credited"
            value={formatPrice(Number(paymentsReport.summary?.total_credited ?? 0))}
            icon={DollarSign}
            color="text-emerald-400"
          />
        </div>

        {Array.isArray(paymentsReport.by_method) && paymentsReport.by_method.length > 0 && (
          <Card className="glass p-6 border-cyber-purple/20">
            <h4 className="text-white font-bold mb-4">Deposits by Payment Method</h4>
            <Table>
              <TableHeader>
                <TableRow className="border-cyber-purple/20">
                  <TableHead className="text-gray-300">Method</TableHead>
                  <TableHead className="text-gray-300">Count</TableHead>
                  <TableHead className="text-gray-300">Amount</TableHead>
                  <TableHead className="text-gray-300">Bonus Given</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(paymentsReport.by_method) ? paymentsReport.by_method : []).map((m, i) => (
                  <TableRow key={i} className="border-cyber-purple/10">
                    <TableCell className="text-white capitalize">{m.method}</TableCell>
                    <TableCell className="text-gray-300">{m.count}</TableCell>
                    <TableCell className="text-neon-green">{formatPrice(m.amount)}</TableCell>
                    <TableCell className="text-cyber-purple">{formatPrice(m.bonus)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {renderRecentDepositsContent()}
      </div>
    );
  };

  return (
    <AdminLayout title={paymentHistoryOnly ? 'Payment History' : 'Reports'}>
      <div className={`space-y-6 ${paymentHistoryOnly ? 'w-full max-w-full min-w-0' : ''}`}>
        {/* Date Range Filter */}
        <Card className="glass p-4 border-cyber-purple/20">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={customStart} 
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={customEnd} 
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {paymentHistoryOnly && dateRange === 'custom' && (!customStart || !customEnd) ? (
          <Card className="glass p-6 border-white/10">
            <p className="text-gray-300 text-sm">Select both start and end dates to load payment history.</p>
          </Card>
        ) : paymentHistoryOnly ? (
          <>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full min-w-0">
                {renderFullPaymentsReport()}
              </motion.div>
            )}
          </>
        ) : (
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 gap-0.5 text-gray-200">
            <TabsTrigger value="revenue" onClick={fetchRevenueReport} className={tabTriggerClass}>Revenue</TabsTrigger>
            <TabsTrigger value="profit" onClick={fetchProfitReport} className={tabTriggerClass}>Profit</TabsTrigger>
            <TabsTrigger value="orders" onClick={fetchOrdersReport} className={tabTriggerClass}>Orders</TabsTrigger>
            <TabsTrigger value="payments" onClick={fetchPaymentsReport} className={tabTriggerClass}>Payments</TabsTrigger>
            <TabsTrigger value="delivery" onClick={fetchDeliveryReport} className={tabTriggerClass}>Service Delivery</TabsTrigger>
          </TabsList>

          {/* Revenue Report */}
          <TabsContent value="revenue" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : revenueReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-exo font-bold text-white">Revenue Report</h3>
                  <Button onClick={() => exportCSV('revenue')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="Total Revenue" value={formatPrice(Number(revenueReport.summary?.total_revenue ?? 0))} icon={DollarSign} color="text-neon-green" />
                  <StatCard label="Total Cost" value={formatPrice(Number(revenueReport.summary?.total_cost ?? 0))} icon={TrendingDown} color="text-red-400" />
                  <StatCard label="Total Profit" value={formatPrice(Number(revenueReport.summary?.total_profit ?? 0))} icon={TrendingUp} color="text-emerald-400" />
                  <StatCard label="Profit Margin" value={`${Number(revenueReport.summary?.profit_margin ?? 0).toFixed(1)}%`} icon={BarChart3} color="text-cyber-purple" />
                  <StatCard label="Total Orders" value={revenueReport.summary?.total_orders ?? 0} icon={ShoppingCart} color="text-electric-blue" />
                </div>

                <Card className="glass p-6 border-cyber-purple/20">
                  <h4 className="text-white font-bold mb-4">Revenue Trend</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={Array.isArray(revenueReport.by_day) ? revenueReport.by_day : []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="$ Revenue" stroke="#8B5CF6" strokeWidth={2} />
                        <Line type="monotone" dataKey="profit" name="$ Profit" stroke="#10B981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {(Array.isArray(revenueReport.by_payment_method) && revenueReport.by_payment_method.length > 0) && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Revenue by Payment Method</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={revenueReport.by_payment_method} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={80} label>
                            {revenueReport.by_payment_method.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Profit Report */}
          <TabsContent value="profit" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : profitReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-exo font-bold text-white">Profit Report</h3>
                  <Button onClick={() => exportCSV('profit')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Gross Revenue" value={formatPrice(Number(profitReport.summary?.gross_revenue ?? 0))} icon={DollarSign} color="text-neon-green" />
                  <StatCard label="Provider Costs" value={formatPrice(Number(profitReport.summary?.provider_costs ?? 0))} icon={TrendingDown} color="text-red-400" />
                  <StatCard label="Net Profit" value={formatPrice(Number(profitReport.summary?.net_profit ?? 0))} icon={TrendingUp} color="text-emerald-400" />
                  <StatCard label="Profit Margin" value={`${Number(profitReport.summary?.profit_margin ?? 0).toFixed(1)}%`} icon={BarChart3} color="text-cyber-purple" />
                </div>

                <Card className="glass p-6 border-cyber-purple/20">
                  <h4 className="text-white font-bold mb-4">Profit Trend</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Array.isArray(profitReport.by_day) ? profitReport.by_day : []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="profit" name="$ Profit" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {Array.isArray(profitReport.top_profitable_services) && profitReport.top_profitable_services.length > 0 && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Top Profitable Services</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-cyber-purple/20">
                          <TableHead className="text-gray-400">Number</TableHead>
                          <TableHead className="text-gray-400">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(profitReport.top_profitable_services) ? profitReport.top_profitable_services : []).map((svc, i) => {
                          const num = getServiceDisplayNumber(svc.service_id);
                          return (
                          <TableRow key={i} className="border-cyber-purple/10">
                            <TableCell className="text-white font-mono">{num != null ? `Number ${num}` : '—'}</TableCell>
                            <TableCell className="text-neon-green font-bold">{formatPrice(svc.profit)}</TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Orders Report */}
          <TabsContent value="orders" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : ordersReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-exo font-bold text-white">Orders Report</h3>
                  <Button onClick={() => exportCSV('orders')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="Total Orders" value={ordersReport.summary?.total_orders ?? 0} icon={ShoppingCart} color="text-electric-blue" />
                  {Object.entries(ordersReport.summary?.by_status || {}).map(([status, count]) => (
                    <StatCard key={status} label={status.charAt(0).toUpperCase() + status.slice(1)} value={count} icon={ShoppingCart} color={status === 'completed' ? 'text-emerald-400' : status === 'failed' ? 'text-red-400' : 'text-yellow-400'} />
                  ))}
                </div>

                <Card className="glass p-6 border-cyber-purple/20">
                  <h4 className="text-white font-bold mb-4">Orders by Day</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Array.isArray(ordersReport.by_day) ? ordersReport.by_day : []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="orders" name="Orders" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {Array.isArray(ordersReport.top_services) && ordersReport.top_services.length > 0 && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Top Services by Volume</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersReport.top_services} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis type="number" stroke="#9CA3AF" fontSize={10} />
                          <YAxis dataKey="service" type="category" stroke="#9CA3AF" fontSize={10} width={150} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Orders" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Payments Report */}
          <TabsContent value="payments" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {renderFullPaymentsReport()}
              </motion.div>
            )}
          </TabsContent>

          {/* Service Delivery Report */}
          <TabsContent value="delivery" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <h3 className="text-lg font-exo font-bold text-white">Service Delivery Report</h3>
                  <Button onClick={() => exportCSV('delivery')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Label className="text-gray-400">Platform</Label>
                  <Input placeholder="Platform" value={deliveryPlatform} onChange={(e) => setDeliveryPlatform(e.target.value)} className="w-32 bg-deep-navy border-white/10 h-9" />
                  <Label className="text-gray-400">Status</Label>
                  <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                    <SelectTrigger className="w-36 bg-deep-navy border-white/10 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent className="bg-deep-navy border-white/10">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-gray-400">Provider</Label>
                  <Input placeholder="Provider ID" value={deliveryProvider} onChange={(e) => setDeliveryProvider(e.target.value)} className="w-32 bg-deep-navy border-white/10 h-9" />
                  <Button onClick={fetchDeliveryReport} className="bg-cyber-purple text-white h-9">Apply</Button>
                </div>
                <Card className="glass overflow-hidden border-cyber-purple/20">
                  <div className="overflow-x-auto">
                    <TooltipProvider>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-cyber-purple/20">
                            {['service_id','service_name','total_orders','completed','pending','in_progress','failed','error','canceled','partial','fail_rate_pct','avg_time'].map((col) => (
                              <TableHead key={col} className="text-gray-400 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => toggleDeliverySort(col === 'avg_time' ? 'avg_time_seconds' : col)}>
                                {col === 'fail_rate_pct' ? 'Fail Rate %' : col === 'avg_time' ? 'Avg Time' : col.replace(/_/g, ' ')}
                                {deliverySort.col === (col === 'avg_time' ? 'avg_time_seconds' : col) && (deliverySort.dir === 'asc' ? ' ↑' : ' ↓')}
                              </TableHead>
                            ))}
                            <TableHead className="text-gray-400 w-20">Flags</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliveryRowsSorted.map((r) => {
                            const failErrorRate = r.fail_rate_pct ?? 0;
                            const pendingInProgress = ((r.pending + r.in_progress) / (r.total_orders || 1)) * 100;
                            const cancelPartial = ((r.canceled + r.partial) / (r.total_orders || 1)) * 100;
                            const redFlag = failErrorRate > 20;
                            const yellowFlag = pendingInProgress > 30;
                            const orangeFlag = cancelPartial > 25;
                            return (
                              <TableRow key={r.service_id} className="border-cyber-purple/10">
                                <TableCell className="font-mono text-xs text-gray-400">{r.service_id}</TableCell>
                                <TableCell className="text-white font-medium">{r.service_name}</TableCell>
                                <TableCell className="text-gray-300">{r.total_orders}</TableCell>
                                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">{r.completed}</span></TableCell>
                                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">{r.pending}</span></TableCell>
                                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">{r.in_progress}</span></TableCell>
                                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">{r.failed}</span></TableCell>
                                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">{r.error}</span></TableCell>
                                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">{r.canceled}</span></TableCell>
                                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">{r.partial}</span></TableCell>
                                <TableCell className="text-gray-300">{r.fail_rate_pct != null ? `${r.fail_rate_pct}%` : '—'}</TableCell>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={avgTimeColor(r.avg_time_seconds)}>{formatAvgTime(r.avg_time_seconds)}</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-deep-navy border-white/10">Based on last 30 days of completed orders</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="flex items-center gap-1">
                                  {redFlag && <span title="Fail/Error rate > 20%" className="text-red-500">🔴</span>}
                                  {yellowFlag && <span title="Pending/In Progress > 30%" className="text-yellow-500">🟡</span>}
                                  {orangeFlag && <span title="Canceled/Partial > 25%" className="text-orange-500">🟠</span>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                  </div>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
