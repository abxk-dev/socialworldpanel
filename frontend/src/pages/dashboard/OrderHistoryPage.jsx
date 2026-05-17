import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, RefreshCw, ExternalLink, Download, Send, Eye, Clock, XCircle, RotateCcw, Package, Loader2, CheckCircle, ChevronDown, ChevronUp, LayoutList, Star, Bell, FileDown, Link as LinkIcon } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useReseller } from '../../context/ResellerContext';
import { useCurrency } from '../../context/CurrencyContext';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import api from '../../lib/axios';
import { displayOrderId } from '../../lib/utils';
import ReorderModal from '../../components/ReorderModal';
import ReviewFormModal from '../../components/ReviewFormModal';

const STATUS_TABS = [
  { value: 'all', label: 'All', color: 'neutral' },
  { value: 'scheduled', label: 'Scheduled', color: 'slate' },
  { value: 'pending_manual', label: 'Awaiting', color: 'amber' },
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'in_progress', label: 'In progress', color: 'blue' },
  { value: 'processing', label: 'Processing', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'partial', label: 'Partial', color: 'orange' },
  { value: 'cancelled', label: 'Canceled', color: 'red' },
  { value: 'failed', label: 'Fail', color: 'red' },
  { value: 'error', label: 'Error', color: 'red' },
];

const statusTabClass = (tab, isActive) => {
  const base = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border shrink-0 ';
  if (isActive) {
    const active = {
      neutral: 'bg-cyber-purple text-[var(--text-primary)] border-cyber-purple',
      slate: 'bg-slate-500 text-[var(--text-primary)] border-slate-500',
      amber: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/40',
      blue: 'bg-electric-blue text-black border-electric-blue',
      green: 'bg-neon-green text-black border-neon-green',
      orange: 'bg-[var(--warning)] text-[var(--text-inverse)] border-[var(--warning)]/40',
      red: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error)]/40',
    };
    return base + (active[tab.color] || active.neutral);
  }
  const inactive = {
    neutral: 'bg-[var(--card-hover-bg)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20',
    amber: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30 hover:bg-[var(--warning-bg)]',
    blue: 'bg-electric-blue/10 text-electric-blue border-electric-blue/30 hover:bg-electric-blue/20',
    green: 'bg-neon-green/10 text-neon-green border-neon-green/30 hover:bg-neon-green/20',
      orange: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30 hover:bg-[var(--warning-bg)]',
    red: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error-bg)]',
  };
  return base + (inactive[tab.color] || inactive.neutral);
};

const OrderHistoryPage = () => {
  const { token } = useDashboardAuth();
  const { isReseller } = useReseller();
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState(() =>
    location.state?.tab === 'mass' ? 'mass' : location.state?.tab === 'alerts' ? 'alerts' : 'orders'
  );
  const [orders, setOrders] = useState([]);
  const [scheduledOrders, setScheduledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('tab') === 'scheduled' ? 'scheduled' : 'all');
  const [search, setSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [reorderModalOrderId, setReorderModalOrderId] = useState(null);
  const [refillModal, setRefillModal] = useState({ open: false, order: null });
  const [refillingId, setRefillingId] = useState(null);
  const [refillDoneId, setRefillDoneId] = useState(null);
  const [expandedBundle, setExpandedBundle] = useState(null);
  const [bundleSubOrders, setBundleSubOrders] = useState({});
  const [massOrders, setMassOrders] = useState([]);
  const [massOrdersLoading, setMassOrdersLoading] = useState(false);
  const [massOrdersPage, setMassOrdersPage] = useState(1);
  const [massOrdersTotalPages, setMassOrdersTotalPages] = useState(1);
  const [expandedMassOrderId, setExpandedMassOrderId] = useState(null);
  const [massOrderChildren, setMassOrderChildren] = useState({});
  const [reviewModal, setReviewModal] = useState({ open: false, serviceId: null, serviceName: null });
  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertSettings, setAlertSettings] = useState(null);

  const fetchReorderAlerts = async () => {
    if (!token || isReseller) return;
    setAlertsLoading(true);
    try {
      const [a, s] = await Promise.all([api.get('/reorder-alerts'), api.get('/reorder-alerts/settings')]);
      setReorderAlerts(a.data?.alerts || []);
      setAlertSettings(s.data?.settings || {});
    } catch {
      setReorderAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.tab === 'alerts') setMainTab('alerts');
  }, [location.state]);

  useEffect(() => {
    if (mainTab === 'alerts' && !isReseller && token) fetchReorderAlerts();
  }, [mainTab, token, isReseller]);

  const downloadOrderInvoice = async (orderId) => {
    try {
      const meta = await api.get(`/invoices/order/${orderId}`);
      const id = meta.data?.invoice?.invoice_id;
      if (!id) {
        toast.error('No invoice for this order yet');
        return;
      }
      const r = await api.get(`/invoices/${encodeURIComponent(id)}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Invoice download failed');
    }
  };

  const fetchOrders = async () => {
    if (isReseller) {
      setLoading(true);
      try {
        const response = await api.get('/reseller/orders');
        const data = response.data;
        const list = Array.isArray(data?.orders) ? data.orders : [];
        setOrders(list);
        setTotalPages(1);
        setScheduledOrders([]);
      } catch {
        setOrders([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (statusFilter === 'scheduled') {
      setLoading(true);
      try {
        const response = await api.get('/orders/scheduled', { withCredentials: true });
        setScheduledOrders(response.data?.orders ?? []);
      } catch {
        setScheduledOrders([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      
      const response = await api.get(`/orders?${params}`, { headers, withCredentials: true });
      const data = response.data;
      setOrders(Array.isArray(data) ? data : (data?.orders ?? []));
      setTotalPages(Math.max(1, parseInt(data?.pages ?? data?.total_pages ?? 1, 10)));
    } catch (error) {
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduled = async () => {
    try {
      const response = await api.get('/orders/scheduled', { withCredentials: true });
      setScheduledOrders(response.data?.orders ?? []);
    } catch {
      setScheduledOrders([]);
    }
  };

  const searchRef = useRef(search);
  searchRef.current = search;
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchRef.current), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (statusFilter === 'scheduled') setSearchParams({ tab: 'scheduled' }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, debouncedSearch, token, isReseller]);

  // Auto-refresh order list every 30s for live progress
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [page, statusFilter, debouncedSearch, token, isReseller]);

  const fetchMassOrders = async () => {
    if (isReseller) return;
    setMassOrdersLoading(true);
    try {
      const res = await api.get('/orders/mass', { params: { page: massOrdersPage, limit: 20 }, withCredentials: true });
      const data = res.data;
      setMassOrders(Array.isArray(data.mass_orders) ? data.mass_orders : []);
      setMassOrdersTotalPages(Math.max(1, data.pages ?? 1));
    } catch {
      setMassOrders([]);
    } finally {
      setMassOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'mass' && !isReseller && token) fetchMassOrders();
  }, [mainTab, massOrdersPage, token, isReseller]);

  const toggleMassOrderExpand = async (massOrderId) => {
    if (expandedMassOrderId === massOrderId) {
      setExpandedMassOrderId(null);
      return;
    }
    setExpandedMassOrderId(massOrderId);
    if (!massOrderChildren[massOrderId]) {
      try {
        const res = await api.get(`/orders/mass/${massOrderId}/orders`, { params: { limit: 100 }, withCredentials: true });
        setMassOrderChildren((prev) => ({ ...prev, [massOrderId]: res.data?.orders ?? [] }));
      } catch {
        toast.error('Failed to load sub-orders');
        setMassOrderChildren((prev) => ({ ...prev, [massOrderId]: [] }));
      }
    }
  };

  const massOrderStatusLabel = (mo) => {
    if (mo.status === 'completed') return '✅ Completed';
    if (mo.status === 'failed') return '❌ Failed';
    if (mo.status === 'partial') return `⚠️ Partial (${mo.orders_failed ?? 0} failed)`;
    if (mo.status === 'processing' || mo.status === 'pending') {
      const placed = mo.orders_placed ?? 0;
      const total = mo.total_links ?? 0;
      return `⏳ ${placed}/${total} sent`;
    }
    return (mo.status || '').replace(/_/g, ' ');
  };

  const massOrderDeliveryLabel = (mo) => {
    if (mo.delivery_type === 'instant') return 'Instant';
    if (mo.delivery_type === 'drip' && mo.drip_interval_minutes) return `Drip ${mo.drip_interval_minutes} min`;
    return mo.delivery_type || '—';
  };

  const nextOrderInMinutes = (mo) => {
    if (mo.delivery_type !== 'drip' || !mo.drip_next_at) return null;
    const next = new Date(mo.drip_next_at).getTime();
    const diff = (next - Date.now()) / 60000;
    if (diff <= 0) return 0;
    return Math.ceil(diff);
  };

  const handleRefillConfirm = async () => {
    const order = refillModal.order;
    if (!order) return;
    const orderId = order.order_id;
    setRefillingId(orderId);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.post(`/orders/${orderId}/refill`, {}, { headers, withCredentials: true });
      toast.success(response.data?.message || 'Refill requested');
      setRefillModal({ open: false, order: null });
      fetchOrders();
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 429 && data?.cooldown) {
        toast.error(data.error || 'Please wait before requesting another refill');
        fetchOrders();
      } else {
        toast.error(data?.error || data?.detail || 'Refill failed');
      }
    } finally {
      setRefillingId(null);
    }
  };

  const refillButtonState = (order) => {
    const ost = String(order.status || '').toLowerCase();
    if (!['completed', 'partial'].includes(ost)) return null;
    if (!order.provider_order_id) return null;
    const completedAt = order.completed_at || order.updated_at || order.created_at;
    const refillDays = order.refill_days ?? 30;
    const daysSince = completedAt ? (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
    const daysLeft = Math.max(0, Math.ceil(refillDays - daysSince));
    if (daysLeft <= 0) return { type: 'expired' };
    const active = order.active_refill;
    const hoursUntil = active?.hours_until_next ?? 0;
    if (active?.status === 'pending' || active?.status === 'processing') return { type: 'processing' };
    if (active?.status === 'completed') return { type: 'done', daysLeft };
    if (hoursUntil > 0) return { type: 'cooldown', hoursUntil, daysLeft };
    return { type: active?.status === 'failed' ? 'retry' : 'request', daysLeft, attempt: (active?.attempt || 0) + 1 };
  };

  const [resending, setResending] = useState(null);
  const isCompletedOrPartial = (status) => ['completed', 'partial'].includes(String(status || '').toLowerCase());

  const handleResend = async (orderId) => {
    setResending(orderId);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post(`/orders/${orderId}/resend`, {}, { headers, withCredentials: true });
      toast.success('Order resent to provider');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Resend failed');
    } finally {
      setResending(null);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      pending_manual: 'status-pending',
      in_progress: 'status-active',
      processing: 'status-active',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      partial: 'status-partial',
      failed: 'status-cancelled',
      error: 'status-cancelled',
    };
    return classes[status] || 'status-pending';
  };

  const filteredOrders = statusFilter === 'scheduled' ? scheduledOrders : orders;

  const countdown = (scheduledFor) => {
    const d = new Date(scheduledFor);
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return 'Fires soon';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `Fires in ${h}h ${m}m`;
  };

  const handleCancelScheduled = async (orderId) => {
    setCancellingId(orderId);
    try {
      await api.delete(`/orders/${orderId}/schedule`, { withCredentials: true });
      toast.success('Scheduled order cancelled');
      fetchScheduled();
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  const progressPercent = (order) => {
    if (order.status === 'completed') return 100;
    if (order.progress != null) return Math.min(100, Math.max(0, Number(order.progress)));
    const qty = order.quantity || 0;
    const start = order.start_count;
    if (qty > 0 && start != null) return Math.min(100, Math.round((Number(start) / qty) * 100));
    return 0;
  };

  const formatEta = (etaMinutes) => {
    if (etaMinutes == null) return null;
    const m = Number(etaMinutes);
    if (m < 60) return `~${Math.round(m)} min`;
    const h = Math.floor(m / 60);
    const r = Math.round(m % 60);
    return r ? `~${h}h ${r}m` : `~${h}h`;
  };

  const displayServiceName = (serviceName, serviceId) => {
    if (serviceName != null && String(serviceName).trim() !== '') return String(serviceName).trim();
    if (serviceId != null && String(serviceId).trim() !== '') return String(serviceId).trim();
    return '—';
  };

  const formatChargeForExport = (n) => {
    const x = Number(n);
    if (Number.isNaN(x)) return '';
    if (x === 0) return '0';
    if (Math.abs(x) < 0.01) return String(parseFloat(x.toFixed(6)));
    return x.toFixed(2);
  };

  const exportOrders = () => {
    const headers = ['ID', 'Charge', 'Link', 'Start count', 'Quantity', 'Service', 'Status', 'Remains', 'Created'];
    const rows = filteredOrders.map(o => [
      displayOrderId(o.order_id),
      formatChargeForExport(o.charge),
      o.link,
      o.start_count ?? '—',
      o.quantity,
      o.is_bundle || o.bundle_name ? (o.bundle_name || 'Bundle') : displayServiceName(o.service_name, o.service_id),
      o.status,
      o.remains ?? '—',
      formatDate(o.created_at),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Orders exported');
  };

  const toggleBundleExpand = async (order) => {
    const id = order.order_id;
    if (!id) return;
    if (expandedBundle === id) {
      setExpandedBundle(null);
      return;
    }
    setExpandedBundle(id);
    if (!bundleSubOrders[id]) {
      if (Array.isArray(order.sub_order_details) && order.sub_order_details.length > 0) {
        setBundleSubOrders((prev) => ({
          ...prev,
          [id]: order.sub_order_details,
        }));
        return;
      }
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await api.get(`/orders/bundle/${id}/sub-orders`, {
          headers,
          withCredentials: true,
        });
        setBundleSubOrders((prev) => ({
          ...prev,
          [id]: res.data?.sub_orders || [],
        }));
      } catch {
        toast.error('Failed to load bundle details');
      }
    }
  };

  return (
    <DashboardLayout title="Order History">
      <Toaster position="top-right" theme="dark" />

      <div className="space-y-5">
        {/* Main tab: Orders | Mass Orders (hidden for resellers) - clear block, no overlap */}
        {!isReseller && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMainTab('orders')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border shrink-0 ${
                mainTab === 'orders'
                  ? 'bg-cyber-purple text-[var(--text-primary)] border-cyber-purple shadow-lg shadow-cyber-purple/20'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
              }`}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setMainTab('mass')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border shrink-0 flex items-center gap-2 ${
                mainTab === 'mass'
                  ? 'bg-cyber-purple text-[var(--text-primary)] border-cyber-purple shadow-lg shadow-cyber-purple/20'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
              }`}
            >
              <LayoutList size={16} />
              Mass Orders
            </button>
            <button
              type="button"
              onClick={() => setMainTab('alerts')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border shrink-0 flex items-center gap-2 ${
                mainTab === 'alerts'
                  ? 'bg-cyber-purple text-[var(--text-primary)] border-cyber-purple shadow-lg shadow-cyber-purple/20'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
              }`}
            >
              <Bell size={16} />
              Smart Alerts
            </button>
          </div>
        )}

        {mainTab === 'alerts' && !isReseller ? (
          <Card className="glass p-4 border-[var(--border)] space-y-4">
            <div className="flex flex-wrap justify-between gap-2 items-center">
              <h3 className="text-[var(--text-primary)] font-semibold">Reorder &amp; reminder alerts</h3>
              <Link to="/dashboard/invoices" className="text-sm text-electric-blue flex items-center gap-1 hover:underline">
                <LinkIcon size={14} /> Invoices
              </Link>
            </div>
            {alertSettings && (
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                {[
                  ['remind_7', '7-day reminders'],
                  ['remind_14', '14-day reminders'],
                  ['remind_30', '30-day reminders'],
                  ['drop_detection', 'Drop detection'],
                  ['milestone', 'Milestone hints'],
                  ['email', 'Email notifications'],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!alertSettings[k]}
                      onChange={async (e) => {
                        const next = { ...alertSettings, [k]: e.target.checked };
                        setAlertSettings(next);
                        try {
                          await api.put('/reorder-alerts/settings', next);
                          toast.success('Preferences saved');
                        } catch {
                          toast.error('Could not save');
                        }
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
            {alertsLoading ? (
              <Loader2 className="animate-spin text-cyber-purple" />
            ) : reorderAlerts.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm">No active alerts.</p>
            ) : (
              <div className="space-y-2">
                {reorderAlerts.map((al) => (
                  <div key={al.alert_id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm">
                    <div className="text-[var(--text-primary)]">{al.message}</div>
                    <div className="text-[var(--text-muted)] text-xs mt-1">{al.alert_type}</div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="bg-neon-green/20 text-neon-green border border-neon-green/30"
                        onClick={async () => {
                          try {
                            await api.post(`/reorder-alerts/${al.alert_id}/reorder`);
                            toast.success('Reorder placed');
                            fetchReorderAlerts();
                          } catch (e) {
                            toast.error(e.response?.data?.error || 'Failed');
                          }
                        }}
                      >
                        One-click reorder
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => api.post(`/reorder-alerts/${al.alert_id}/dismiss`).then(fetchReorderAlerts)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : mainTab === 'mass' && !isReseller ? (
          /* Mass Orders tab */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="glass overflow-hidden">
              {massOrdersLoading ? (
                <div className="p-8 text-center">
                  <Loader2 size={32} className="animate-spin mx-auto text-cyber-purple" />
                </div>
              ) : massOrders.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)]">No mass orders yet.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-cyber-purple/10">
                        <tr>
                          <th className="text-left p-4 text-[var(--text-muted)] font-medium">ID</th>
                          <th className="text-left p-4 text-[var(--text-muted)] font-medium">Service</th>
                          <th className="text-right p-4 text-[var(--text-muted)] font-medium">Links</th>
                          <th className="text-right p-4 text-[var(--text-muted)] font-medium">Total</th>
                          <th className="text-left p-4 text-[var(--text-muted)] font-medium">Delivery</th>
                          <th className="text-left p-4 text-[var(--text-muted)] font-medium">Status</th>
                          <th className="text-left p-4 text-[var(--text-muted)] font-medium w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {massOrders.map((mo) => {
                          const id = mo.mass_order_id || mo._id;
                          const isExpanded = expandedMassOrderId === id;
                          const children = massOrderChildren[id] || [];
                          const nextMins = nextOrderInMinutes(mo);
                          return (
                            <React.Fragment key={id}>
                                <tr className="border-t border-[var(--border)] hover:bg-[var(--bg-card)]">
                                <td className="p-4 font-mono text-electric-blue text-sm">{id?.slice(-8) || '—'}</td>
                                <td className="p-4 text-[var(--text-primary)]">{mo.service_name || '—'}</td>
                                <td className="p-4 text-right text-[var(--text-secondary)]">{mo.total_links ?? 0}</td>
                                <td className="p-4 text-right text-electric-blue font-bold">{formatPrice(mo.total_charge ?? 0)}</td>
                                  <td className="p-4 text-[var(--text-muted)]">{massOrderDeliveryLabel(mo)}</td>
                                <td className="p-4">{massOrderStatusLabel(mo)}</td>
                                <td className="p-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-cyber-purple/40 text-cyber-purple"
                                    onClick={() => toggleMassOrderExpand(id)}
                                  >
                                    {isExpanded ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
                                    View
                                  </Button>
                                  {nextMins != null && mo.status === 'processing' && (
                                    <div className="text-xs text-cyber-purple mt-1">Next in ~{nextMins} min</div>
                                  )}
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-[var(--bg-card)] border-l-2 border-cyber-purple/40">
                                  <td colSpan={7} className="p-4">
                                    <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                                      <p className="text-xs text-[var(--text-muted)] px-3 py-2 bg-[var(--bg-card)] border-b border-[var(--border)]">
                                        Mass order — {mo.service_name} — {mo.total_links} links
                                      </p>
                                      {children.length === 0 ? (
                                        <div className="p-4 text-[var(--text-muted)] text-sm">Loading…</div>
                                      ) : (
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="text-[var(--text-muted)] bg-[var(--bg-card)]">
                                              <th className="py-2 px-3 text-left w-8">#</th>
                                              <th className="py-2 px-3 text-left">Link</th>
                                              <th className="py-2 px-3 text-right">Qty</th>
                                              <th className="py-2 px-3 text-left">Status</th>
                                              <th className="py-2 px-3 text-left">Scheduled / Sent</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {children.map((c) => (
                                              <tr key={c._id || c.mass_order_index} className="border-t border-[var(--border)]">
                                                <td className="py-2 px-3 text-[var(--text-muted)]">{(c.mass_order_index ?? 0) + 1}</td>
                                                <td className="py-2 px-3 max-w-[200px] truncate text-electric-blue">
                                                  <a href={c.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    {c.link}
                                                  </a>
                                                </td>
                                                <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{(c.quantity ?? 0).toLocaleString()}</td>
                                                <td className="py-2 px-3">
                                                  <Badge className={getStatusClass(c.status)}>{(c.status || '').replace(/_/g, ' ')}</Badge>
                                                </td>
                                                <td className="py-2 px-3 text-[var(--text-muted)] text-xs">
                                                  {c.drip_scheduled_at
                                                    ? c.drip_sent
                                                      ? `Sent ${formatDate(c.created_at)}`
                                                      : `Scheduled ${formatDate(c.drip_scheduled_at)}`
                                                    : 'Sent immediately'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {massOrdersTotalPages > 1 && (
                    <div className="p-4 border-t border-[var(--border)] flex justify-between items-center">
                      <span className="text-[var(--text-muted)] text-sm">Page {massOrdersPage} of {massOrdersTotalPages}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={massOrdersPage === 1} onClick={() => setMassOrdersPage((p) => p - 1)} className="border-[var(--border)]">
                          Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={massOrdersPage >= massOrdersTotalPages} onClick={() => setMassOrdersPage((p) => p + 1)} className="border-[var(--border)]">
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        ) : (
          <>
        {/* Status filters - colorful pills, wrap cleanly, no overlay */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Filter by status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={statusTabClass(tab, statusFilter === tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Actions - own row, no overlap */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={18} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID or service..."
              className="pl-10 bg-deep-navy border-[var(--border)] w-full"
              data-testid="orders-search"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" asChild className="border-[var(--border)] hover:bg-[var(--bg-hover)]" size="sm">
              <Link to="/dashboard/invoices">
                <FileDown size={16} className="mr-2" />
                Invoices
              </Link>
            </Button>
            <Button variant="outline" onClick={exportOrders} className="border-[var(--border)] hover:bg-[var(--bg-hover)]" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={fetchOrders} className="border-[var(--border)] hover:bg-[var(--bg-hover)]" size="sm" data-testid="orders-refresh">
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="glass overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">No orders found</div>
            ) : statusFilter === 'scheduled' ? (
              <div className="p-4 space-y-3">
                {scheduledOrders.map((o) => (
                  <div key={o.order_id} className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                    <div>
                      <span className="font-mono text-[var(--text-primary)] font-medium">{o.order_id}</span>
                      <span className="text-[var(--text-muted)] text-sm ml-2">{o.service_name || o.service_id}</span>
                    </div>
                    <div className="text-electric-blue font-bold">{formatPrice((o.price || o.charge) ?? 0)}</div>
                    <div className="text-cyber-purple flex items-center gap-1">
                      <Clock size={14} />
                      {countdown(o.scheduled_for)}
                    </div>
                    <div className="text-[var(--text-muted)] text-sm">
                      {o.scheduled_for ? new Date(o.scheduled_for).toLocaleString() : ''}
                    </div>
                    <div className="ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelScheduled(o.order_id)}
                        disabled={cancellingId === o.order_id}
                        className="border-[var(--error)]/50 text-[var(--error)] hover:bg-[var(--error-bg)]"
                      >
                        {cancellingId === o.order_id ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} className="mr-1" />}
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-cyber-purple/10">
                      <tr>
                        <th className="text-left p-4 text-[var(--text-muted)] font-medium w-10">
                          <input type="checkbox" aria-label="Select all" className="rounded" />
                        </th>
                        <th className="text-left p-4 text-[var(--text-muted)] font-medium">ID</th>
                        <th className="text-left p-4 text-[var(--text-muted)] font-medium w-24">Progress</th>
                        <th className="text-right p-4 text-[var(--text-muted)] font-medium">Charge</th>
                        <th className="text-left p-4 text-[var(--text-muted)] font-medium">Link</th>
                        <th className="text-right p-4 text-[var(--text-muted)] font-medium">Start count</th>
                        <th className="text-right p-4 text-[var(--text-muted)] font-medium">Quantity</th>
                        <th className="text-left p-4 text-[var(--text-muted)] font-medium">Service</th>
                        <th className="text-left p-4 text-[var(--text-muted)] font-medium">Status</th>
                        <th className="text-right p-4 text-[var(--text-muted)] font-medium">Remains</th>
                        <th className="text-left p-4 text-[var(--text-muted)] font-medium">Created</th>
                        <th className="text-center p-4 text-[var(--text-muted)] font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const isBundle = order.is_bundle || !!order.bundle_name;
                        const isExpanded = expandedBundle === order.order_id;
                        const subOrders = bundleSubOrders[order.order_id] || [];
                        const subOrderCount = (bundleSubOrders[order.order_id] || order.sub_orders || []).length || 0;
                        return (
                        <React.Fragment key={order.order_id}>
                        <tr className="border-t border-[var(--border)] hover:bg-[var(--bg-card)]">
                          <td className="p-4">
                            <input type="checkbox" aria-label={`Select ${order.order_id}`} className="rounded" />
                          </td>
                          <td className="p-4">
                            <Link
                              to={`/dashboard/orders/${order.order_id}`}
                              title={`Full order id: ${order.order_id ?? ''}`}
                              className="font-mono text-electric-blue hover:underline font-medium flex items-center gap-1"
                            >
                              {displayOrderId(order.order_id)}
                              <Eye size={12} />
                            </Link>
                            {order.reorder_count > 0 && (
                              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">Reordered {order.reorder_count}×</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="w-20">
                              <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    order.status === 'completed' ? 'bg-neon-green' :
                                    order.status === 'failed' || order.status === 'error' || order.status === 'cancelled' ? 'bg-[var(--error)]' :
                                    order.status === 'in_progress' || order.status === 'processing' ? 'bg-electric-blue' : 'bg-[var(--warning)]'
                                  }`}
                                  style={{ width: `${progressPercent(order)}%` }}
                                />
                              </div>
                              <span className="text-xs text-[var(--text-muted)]">
                                {order.status === 'completed' ? 'Complete' : `${progressPercent(order)}%`}
                              </span>
                            </div>
                            {(order.start_count != null || order.remains != null) && (
                              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                Start: {order.start_count != null ? order.start_count.toLocaleString() : '—'} | Remains: {order.remains != null ? order.remains.toLocaleString() : '—'}
                              </div>
                            )}
                            {formatEta(order.eta_minutes) && (
                              <div className="text-xs text-cyber-purple mt-0.5">{formatEta(order.eta_minutes)} left</div>
                            )}
                          </td>
                          <td className="p-4 text-right text-electric-blue font-bold">
                            {formatPrice(order.charge ?? order.price ?? 0)}
                          </td>
                          <td className="p-4 max-w-[140px]">
                            <a
                              href={order.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-electric-blue hover:underline flex items-center gap-1 truncate"
                            >
                              <ExternalLink size={12} />
                              <span className="truncate">{order.link}</span>
                            </a>
                          </td>
                          <td className="p-4 text-right text-[var(--text-muted)]">
                            {order.start_count != null ? order.start_count.toLocaleString() : '—'}
                          </td>
                          <td className="p-4 text-right text-[var(--text-muted)]">
                            {(order.quantity ?? 0).toLocaleString()}
                          </td>
                          <td className="p-4 max-w-[200px]">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              {isBundle ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => toggleBundleExpand(order)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] text-xs hover:border-cyber-purple/40 hover:text-cyber-purple hover:bg-[var(--bg-hover)] transition-colors shrink-0"
                                    title={isExpanded ? 'Hide sub-orders' : 'Show sub-orders'}
                                  >
                                    <Package size={12} className="shrink-0" />
                                    <span>{isExpanded ? 'Collapse' : 'Expand'} bundle {subOrderCount > 0 ? `(${subOrderCount})` : ''}</span>
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                  <span className="text-[var(--text-primary)] text-sm truncate" title={order.bundle_name || 'Bundle'}>
                                    {order.bundle_name || 'Bundle'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[var(--text-primary)] text-sm truncate block">
                                  {displayServiceName(order.service_name, order.service_id)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getStatusClass(order.status)} capitalize`}>
                              {(order.status || '').replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="p-4 text-right text-[var(--text-muted)]">
                            {order.remains != null ? order.remains.toLocaleString() : '—'}
                          </td>
                          <td className="p-4 text-[var(--text-muted)] text-sm">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1 flex-wrap">
                              {!order.is_mass_order && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReorderModalOrderId(order.order_id)}
                                  className="border-neon-green/50 text-neon-green hover:bg-neon-green/10"
                                  title="Reorder"
                                  data-testid={`reorder-${order.order_id}`}
                                >
                                  <RotateCcw size={14} className="mr-1" />
                                  Reorder
                                </Button>
                              )}
                              {!order.is_mass_order && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[var(--border)] text-[var(--text-muted)]"
                                  title="Download invoice PDF"
                                  onClick={() => downloadOrderInvoice(order.order_id)}
                                >
                                  <FileDown size={14} className="mr-1" />
                                  Invoice
                                </Button>
                              )}
                              {order.status === 'completed' && !isBundle && order.service_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[var(--warning)]/50 text-[var(--warning)] hover:bg-[var(--warning-bg)]"
                                  title="Rate this service (1–5 stars)"
                                  onClick={() => setReviewModal({
                                    open: true,
                                    serviceId: order.service_id,
                                    serviceName: displayServiceName(order.service_name, order.service_id),
                                  })}
                                >
                                  <Star size={14} className="mr-1" />
                                  Rate
                                </Button>
                              )}
                              {isCompletedOrPartial(order.status) && !isBundle && order.provider_order_id && (() => {
                                const state = refillButtonState(order);
                                if (!state || state.type === 'expired') return null;
                                if (state.type === 'processing') {
                                  return (
                                    <Button size="sm" variant="outline" disabled className="border-electric-blue/40 text-electric-blue/80" title="Your refill is being processed">
                                      <Loader2 size={14} className="animate-spin mr-1" />
                                      Refill Processing...
                                    </Button>
                                  );
                                }
                                if (state.type === 'cooldown') {
                                  return (
                                    <div className="flex flex-col items-center">
                                      <Button size="sm" variant="outline" disabled className="border-[var(--border)] text-[var(--text-muted)]">
                                        Refill in {state.hoursUntil}h
                                      </Button>
                                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Next in {state.hoursUntil}h</span>
                                    </div>
                                  );
                                }
                                if (state.type === 'done' && refillDoneId !== order.order_id) {
                                  return (
                                    <div className="flex flex-col items-center">
                                      <Button size="sm" variant="outline" className="border-neon-green/40 text-neon-green" disabled>
                                        <CheckCircle size={14} className="mr-1" />
                                        Refill Done
                                      </Button>
                                      {state.daysLeft > 0 && <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{state.daysLeft} days left</span>}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-col items-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRefillModal({ open: true, order })}
                                      className={state.type === 'retry' ? 'border-[var(--warning)]/50 text-[var(--warning)] hover:bg-[var(--warning-bg)]' : 'border-neon-green/30 text-neon-green hover:bg-neon-green/10'}
                                      data-testid={`refill-${order.order_id}`}
                                    >
                                      <RefreshCw size={14} className="mr-1" />
                                      {state.type === 'retry' ? 'Retry Refill' : 'Request Refill'}
                                    </Button>
                                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                      {state.type === 'retry' ? 'Previous refill failed' : `Refill available • ${state.daysLeft} days left`}
                                    </span>
                                  </div>
                                );
                              })()}
                              {(order.status === 'failed' || order.status === 'error') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResend(order.order_id)}
                                  disabled={resending === order.order_id}
                                  className="border-electric-blue/50 text-electric-blue hover:bg-electric-blue/10"
                                  title={order.provider_error || 'Resend to provider'}
                                >
                                  {resending === order.order_id ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <><Send size={14} className="mr-1" />Resend</>
                                  )}
                                </Button>
                              )}
                              {isBundle && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-cyber-purple/40 text-cyber-purple hover:bg-cyber-purple/10"
                                  onClick={() => toggleBundleExpand(order)}
                                >
                                  {isExpanded ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
                                  {isExpanded ? 'Collapse' : 'Expand'} ({subOrderCount || '…'})
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isBundle && isExpanded && (
                          <tr className="bg-[var(--bg-card)] border-l-2 border-cyber-purple/40">
                            <td colSpan={12} className="p-4">
                              {!bundleSubOrders[order.order_id] ? (
                                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-2">
                                  <Loader2 size={14} className="animate-spin" />
                                  Loading sub-orders…
                                </div>
                              ) : bundleSubOrders[order.order_id].length === 0 ? (
                                <p className="text-[var(--text-muted)] text-sm py-2">No sub-orders</p>
                              ) : (
                                <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                                  <p className="text-xs text-[var(--text-muted)] px-3 py-2 bg-[var(--bg-card)] border-b border-[var(--border)]">Sub-orders</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-[var(--text-muted)] bg-[var(--bg-card)]">
                                        <th className="py-2 px-3 text-left">ID</th>
                                        <th className="py-2 px-3 text-left">Service</th>
                                        <th className="py-2 px-3 text-right">Quantity</th>
                                        <th className="py-2 px-3 text-left">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {bundleSubOrders[order.order_id].map((s) => (
                                        <tr key={s.order_id} className="border-t border-[var(--border)]">
                                          <td className="py-2 px-3 text-[var(--text-secondary)] font-mono">{displayOrderId(s.order_id)}</td>
                                          <td className="py-2 px-3 text-[var(--text-secondary)]">{displayServiceName(s.service_name, s.service_id)}</td>
                                          <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{(s.quantity ?? 0).toLocaleString()}</td>
                                          <td className="py-2 px-3">
                                            <Badge className={getStatusClass(s.status)}>{(s.status || '').replace(/_/g, ' ')}</Badge>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && statusFilter !== 'scheduled' && (
                  <div className="p-4 border-t border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--text-muted)] text-sm">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-[var(--border)]">
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="border-[var(--border)]">
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      </>
        )}
      </div>

      <Dialog open={refillModal.open} onOpenChange={(open) => !open && setRefillModal({ open: false, order: null })}>
        <DialogContent className="glass border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Request Refill?</DialogTitle>
          </DialogHeader>
          {refillModal.order && (
            <div className="space-y-3 text-sm text-[var(--text-muted)]">
              <p>This asks the provider to top up your order back to the original quantity. It&apos;s free — no balance will be deducted.</p>
              <p>Attempt #{refillButtonState(refillModal.order)?.attempt || 1} (once per 24 hours)</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRefillModal({ open: false, order: null })} className="border-[var(--border)]">Cancel</Button>
            <Button onClick={handleRefillConfirm} disabled={refillingId !== null} className="bg-neon-green hover:bg-neon-green/90 text-black">
              {refillingId ? <><Loader2 size={14} className="animate-spin mr-2" />Requesting...</> : 'Yes, Request Refill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reorderModalOrderId && (
        <ReorderModal
          orderId={reorderModalOrderId}
          onClose={() => setReorderModalOrderId(null)}
          onSuccess={fetchOrders}
        />
      )}

      {reviewModal.open && reviewModal.serviceId && (
        <ReviewFormModal
          serviceId={reviewModal.serviceId}
          serviceName={reviewModal.serviceName}
          existingReview={null}
          onClose={() => setReviewModal({ open: false, serviceId: null, serviceName: null })}
          onSubmit={fetchOrders}
        />
      )}
    </DashboardLayout>
  );
};

export default OrderHistoryPage;
