import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, ExternalLink, Send, Download, MoreHorizontal, X, ChevronRight, ChevronDown, ChevronUp, Package, RotateCcw } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import BulkActionsBar from '../../components/admin/BulkActionsBar';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useCurrency } from '../../context/CurrencyContext';
import { displayOrderId } from '../../lib/utils';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending_manual', label: 'Awaiting' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'partial', label: 'Partial' },
  { value: 'cancelled', label: 'Canceled' },
  { value: 'failed', label: 'Fail' },
  { value: 'error', label: 'Error' },
];

const CREATED_OPTIONS = [
  { value: '0', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const AdminOrders = () => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createdLast, setCreatedLast] = useState('90');
  const [providerFilter, setProviderFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [searchBy, setSearchBy] = useState('all');
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [countsByStatus, setCountsByStatus] = useState({});
  const [refreshingProviderCharges, setRefreshingProviderCharges] = useState(false);
  const [syncingProviderStatuses, setSyncingProviderStatuses] = useState(false);
  const [setProviderCostOrder, setSetProviderCostOrder] = useState(null);
  const [providerCostVal, setProviderCostVal] = useState('');
  const [savingProviderCost, setSavingProviderCost] = useState(false);
  const bulk = useBulkSelection();

  const statusCountColor = (value) => {
    const colors = {
      all: 'text-gray-400',
      pending_manual: 'text-amber-400',
      pending: 'text-yellow-400',
      in_progress: 'text-electric-blue',
      processing: 'text-cyber-purple',
      completed: 'text-neon-green',
      partial: 'text-orange-400',
      cancelled: 'text-gray-500',
      failed: 'text-red-400',
      error: 'text-red-500',
    };
    return colors[value] || 'text-gray-400';
  };
  const searchRef = useRef(search);
  searchRef.current = search;
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchRef.current), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProviders = async () => {
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const res = await api.get('/admin/providers', { headers, withCredentials: true });
      setProviders(Array.isArray(res.data) ? res.data : res.data?.providers || []);
    } catch {
      setProviders([]);
    }
  };

  const fetchServices = async () => {
    if (!token) return;
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const res = await api.get('/admin/services', { headers, withCredentials: true });
      const list = Array.isArray(res.data) ? res.data : res.data?.services || [];
      setServices(list);
    } catch {
      setServices([]);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
        params.append('search_by', searchBy);
      }
      if (createdLast && createdLast !== '0') params.append('created_last', createdLast);
      if (providerFilter && providerFilter !== 'all') params.append('provider_id', providerFilter);
      if (serviceFilter && serviceFilter !== 'all') params.append('service_id', serviceFilter);
      if (modeFilter && modeFilter !== 'all') params.append('mode', modeFilter);

      const response = await api.get('/admin/orders?' + params, { headers, withCredentials: true });
      const data = response.data || {};
      setOrders(data.orders || []);
      setTotalPages(data.pages || 1);
      const counts = data.counts_by_status || data.countsByStatus;
      if (counts && typeof counts === 'object') {
        setCountsByStatus(counts);
      }
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    fetchServices();
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, debouncedSearch, searchBy, createdLast, providerFilter, serviceFilter, modeFilter, token]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.put('/admin/orders/' + orderId, { status: newStatus }, { headers, withCredentials: true });
      // Optimistically update UI without refetching the whole list
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: newStatus } : o))
      );
      toast.success('Order updated');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update order');
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

  const handleProcessManual = async (orderId) => {
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.put('/admin/orders/' + orderId, { status: 'in_progress' }, { headers, withCredentials: true });
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: 'in_progress' } : o))
      );
      toast.success('Order marked as in progress');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update order');
    }
  };

  const [resending, setResending] = useState(null);
  const [refillingId, setRefillingId] = useState(null);
  const [expandedBundleId, setExpandedBundleId] = useState(null);
  const [resendModalOrder, setResendModalOrder] = useState(null);
  const [resendProviderId, setResendProviderId] = useState('');
  const [resendApiServiceId, setResendApiServiceId] = useState('');
  const [resendForceApproval, setResendForceApproval] = useState(false);
  const [resendMode, setResendMode] = useState('manual');
  const handleAdminRefill = async (orderId) => {
    setRefillingId(orderId);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const res = await api.post('/admin/orders/' + orderId + '/refill', {}, { headers, withCredentials: true });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Refill submitted');
      } else {
        toast.error(res.data?.error || 'Refill failed');
      }
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Refill failed');
    } finally {
      setRefillingId(null);
    }
  };

  const handleResend = async (orderId, payload = {}) => {
    setResending(orderId);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.post('/admin/orders/' + orderId + '/resend', payload, { headers, withCredentials: true });
      toast.success('Order resent to provider');
      fetchOrders();
      return { ok: true };
    } catch (error) {
      const d = error.response?.data || {};
      if (d?.requires_approval) {
        toast.error(d.error || 'Provider charge is higher than user charge. Enable approval and resend.');
      } else {
        toast.error(d?.error || d?.detail || 'Resend failed');
      }
      return { ok: false, requiresApproval: !!d?.requires_approval };
    } finally {
      setResending(null);
    }
  };

  const openResendModal = (order) => {
    setResendModalOrder(order);
    setResendProviderId(String(order.provider_id || ''));
    setResendApiServiceId(String(order.provider_service_id || order.api_service_id || ''));
    setResendForceApproval(false);
    setResendMode('manual');
  };

  const handleResendAttached = async (order) => {
    if (!order) return;
    setResendModalOrder(order);
    setResendProviderId(String(order.provider_id || ''));
    setResendApiServiceId(String(order.provider_service_id || order.api_service_id || ''));
    setResendMode('attached');
    // Require explicit approval when order already has provider_order_id.
    setResendForceApproval(false);
  };

  const confirmResendWithSelection = async () => {
    if (!resendModalOrder) return;
    if (resendMode === 'manual' && (!resendProviderId || !resendApiServiceId)) {
      toast.error('Please select API and API service ID');
      return;
    }
    const result = await handleResend(resendModalOrder.order_id, {
      provider_id: resendProviderId,
      api_service_id: resendApiServiceId,
      force_approval: resendForceApproval,
      resend_mode: resendMode,
      use_attached_service_mapping: resendMode === 'attached',
    });
    if (result?.ok) setResendModalOrder(null);
  };

  const [detailsOrder, setDetailsOrder] = useState(null);
  const [editLinkOrder, setEditLinkOrder] = useState(null);
  const [editLinkVal, setEditLinkVal] = useState('');
  const [setStartCountOrder, setSetStartCountOrder] = useState(null);
  const [startCountVal, setStartCountVal] = useState('');
  const [setPartialOrder, setSetPartialOrder] = useState(null);
  const [partialRemainsVal, setPartialRemainsVal] = useState('');
  const [cancelRefundOrder, setCancelRefundOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const openDetails = async (order) => {
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const res = await api.get('/admin/orders/' + order.order_id, { headers, withCredentials: true });
      setDetailsOrder(res.data);
    } catch {
      toast.error('Failed to load order details');
    }
  };

  const handleEditLink = async () => {
    if (!editLinkOrder || !editLinkVal.trim()) return;
    setActionLoading(true);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.patch('/admin/orders/' + editLinkOrder.order_id, { link: editLinkVal.trim() }, { headers, withCredentials: true });
      toast.success('Link updated');
      setEditLinkOrder(null);
      setEditLinkVal('');
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetStartCount = async () => {
    if (!setStartCountOrder || startCountVal === '') return;
    const n = parseInt(startCountVal, 10);
    if (isNaN(n) || n < 0) {
      toast.error('Enter a valid number');
      return;
    }
    setActionLoading(true);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.patch('/admin/orders/' + setStartCountOrder.order_id, { start_count: n }, { headers, withCredentials: true });
      toast.success('Start count updated');
      setSetStartCountOrder(null);
      setStartCountVal('');
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPartial = async () => {
    if (!setPartialOrder) return;
    const n = partialRemainsVal === '' ? null : parseInt(partialRemainsVal, 10);
    if (n == null || isNaN(n) || n < 0) {
      toast.error('Enter Remains (undelivered quantity). Charge will be updated to the delivered amount and the rest refunded.');
      return;
    }
    setActionLoading(true);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const body = { set_partial: true, remains: n };
      await api.patch(`/admin/orders/${setPartialOrder.order_id}`, body, { headers, withCredentials: true });
      toast.success('Order set to partial');
      setSetPartialOrder(null);
      setPartialRemainsVal('');
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRefund = async () => {
    if (!cancelRefundOrder) return;
    setActionLoading(true);
    try {
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.patch('/admin/orders/' + cancelRefundOrder.order_id, { cancel_and_refund: true }, { headers, withCredentials: true });
      toast.success('Order cancelled and refunded');
      setCancelRefundOrder(null);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setCreatedLast('0');
    setProviderFilter('all');
    setServiceFilter('all');
    setModeFilter('all');
  };

  const hasActiveFilters = createdLast !== '0' || (providerFilter && providerFilter !== 'all') || (serviceFilter && serviceFilter !== 'all') || (modeFilter && modeFilter !== 'all');

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  const formatChargeForExport = (n) => {
    const x = Number(n);
    if (Number.isNaN(x)) return '';
    if (x === 0) return '0';
    if (Math.abs(x) < 0.01) return String(parseFloat(x.toFixed(6)));
    return x.toFixed(2);
  };

  const formatProviderChargeDisplay = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return '—';
    // Keep more precision for tiny provider costs so values like 0.008 are not shown as 0.
    const abs = Math.abs(n);
    let numStr = '';
    if (abs === 0) numStr = '0';
    else if (abs < 1) numStr = n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    else if (abs < 1000) numStr = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    else numStr = n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

    const probe = String(formatPrice(0));
    const prefix = (probe.match(/^([^0-9\-]+)/) || [])[1] || '';
    const suffix = (probe.match(/([^0-9.,\-]+)$/) || [])[1] || '';
    return `${prefix}${numStr}${suffix}`;
  };

  const exportOrders = () => {
    const headers = ['ID', 'Provider Order ID', 'User', 'Charge', 'Provider charge', 'Link', 'Start count', 'Quantity', 'Service', 'Status', 'Remains', 'Created', 'Mode'];
    const rows = orders.map(o => [
      o.order_id,
      o.provider_order_id ?? '—',
      o.user_username || o.user_id,
      formatChargeForExport(o.charge ?? o.price),
      o.provider_charge != null ? formatChargeForExport(o.provider_charge) : '—',
      o.link,
      o.start_count ?? '—',
      o.quantity ?? 0,
      o.service_name || o.service_id,
      o.status,
      o.remains ?? '—',
      formatDate(o.created_at),
      o.mode || 'Auto',
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

  const handleRefreshProviderCharges = async () => {
    try {
      setRefreshingProviderCharges(true);
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const payload = {
        status: statusFilter,
        created_last: createdLast,
        provider_id: providerFilter,
        service_id: serviceFilter,
        mode: modeFilter,
        search: debouncedSearch.trim(),
        search_by: searchBy,
      };
      const res = await api.post('/admin/orders/refresh-provider-charges', payload, { headers, withCredentials: true });
      const d = res.data || {};
      const attempted = Number(d.attempted || 0);
      const updated = Number(d.updated || 0);
      const failed = Number(d.failed || 0);
      toast.success(`Provider charges refreshed: ${updated}/${attempted}${failed ? ` (${failed} skipped)` : ''}`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to refresh provider charges');
    } finally {
      setRefreshingProviderCharges(false);
    }
  };

  const handleSyncProviderStatuses = async () => {
    try {
      setSyncingProviderStatuses(true);
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const basePayload = {
        status: statusFilter,
        created_last: createdLast,
        provider_id: providerFilter,
        service_id: serviceFilter,
        mode: modeFilter,
        search: debouncedSearch.trim(),
        search_by: searchBy,
        limit: 50,
        min_age_ms: 0,
        only_pending: true,
      };

      let attempted = 0;
      let updated = 0;
      let statusUpdated = 0;
      let hasMore = true;

      for (let i = 0; i < 20 && hasMore; i += 1) {
        const res = await api.post('/admin/orders/sync-provider-statuses', basePayload, { headers, withCredentials: true });
        const d = res.data || {};
        const a = Number(d.attempted || 0);
        const u = Number(d.updated || 0);
        const su = Number(d.status_updated || 0);
        attempted += a;
        updated += u;
        statusUpdated += su;
        hasMore = d.has_more === true;
        if (a === 0) break;
      }

      toast.success(`Statuses synced: ${statusUpdated} status updates (${updated}/${attempted} checked)`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to sync provider statuses');
    } finally {
      setSyncingProviderStatuses(false);
    }
  };

  const openProviderCost = (order) => {
    setSetProviderCostOrder(order);
    const v = order?.provider_charge ?? order?.provider_cost ?? '';
    setProviderCostVal(v === 0 ? '0' : String(v ?? ''));
  };

  const saveProviderCost = async () => {
    if (!setProviderCostOrder?.order_id) return;
    const num = Number(providerCostVal);
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Invalid provider cost');
      return;
    }
    try {
      setSavingProviderCost(true);
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      await api.put('/admin/orders/' + setProviderCostOrder.order_id, { provider_charge: num }, { headers, withCredentials: true });
      toast.success('Provider cost updated');
      setSetProviderCostOrder(null);
      setProviderCostVal('');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update provider cost');
    } finally {
      setSavingProviderCost(false);
    }
  };

  return (
    <AdminLayout title="Order Management">
      <Toaster position="top-right" theme="dark" />

      <div className="space-y-6">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const count = countsByStatus[tab.value] ?? 0;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'bg-cyber-purple text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`min-w-[1.25rem] inline-flex justify-center font-bold tabular-nums ${isActive ? 'text-white/90' : statusCountColor(tab.value)}`}
                  aria-label={`${count} orders`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Attribute Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={createdLast} onValueChange={(v) => { setCreatedLast(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-deep-navy border-white/10 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              {CREATED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-deep-navy border-white/10 h-9">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              <SelectItem value="all">All providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p.provider_id} value={p.provider_id}>{p.alias || p.name || p.provider_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-deep-navy border-white/10 h-9">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              <SelectItem value="all">All services</SelectItem>
              {services.slice(0, 100).map((s) => (
                <SelectItem key={s.service_id} value={s.service_id}>{s.name || s.service_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={(v) => { setModeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] bg-deep-navy border-white/10 h-9">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Auto">Auto</SelectItem>
              <SelectItem value="Manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-400 hover:text-white h-9">
              <X size={14} className="mr-1" /> Clear filters
            </Button>
          )}
        </div>

        {/* Search & Export */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchBy === 'all' ? 'Search orders...' : `Search by ${searchBy === 'order_id' ? 'Order ID' : searchBy === 'user_id' ? 'Username' : searchBy === 'service_id' ? 'Service' : searchBy === 'provider_id' ? 'Provider ID' : 'Link'}...`}
              className="pl-10 bg-deep-navy border-white/10"
            />
          </div>
          <Select value={searchBy} onValueChange={(v) => { setSearchBy(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-deep-navy border-white/10">
              <SelectValue placeholder="Search by" />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="order_id">Order ID</SelectItem>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="user_id">Username</SelectItem>
              <SelectItem value="service_id">Service</SelectItem>
              <SelectItem value="provider_id">Provider ID</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportOrders} className="border-white/10" size="sm">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchOrders} className="border-white/10" size="sm">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleRefreshProviderCharges}
            className="border-white/10"
            size="sm"
            disabled={refreshingProviderCharges}
          >
            <RefreshCw size={16} className={`mr-2 ${refreshingProviderCharges ? 'animate-spin' : ''}`} />
            {refreshingProviderCharges ? 'Refreshing charges...' : 'Refresh provider charges'}
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncProviderStatuses}
            className="border-white/10"
            size="sm"
            disabled={syncingProviderStatuses}
          >
            <RefreshCw size={16} className={`mr-2 ${syncingProviderStatuses ? 'animate-spin' : ''}`} />
            {syncingProviderStatuses ? 'Syncing statuses...' : 'Sync provider statuses'}
          </Button>
        </div>

        {/* Orders Table */}
        <Card className="glass overflow-hidden border-cyber-purple/20">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/5">
                <BulkActionsBar
                  type="orders"
                  selectedIds={bulk.selectedIds}
                  onClear={bulk.clear}
                  onApplied={fetchOrders}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-cyber-purple/10">
                    <tr>
                      <th className="text-left p-4 text-gray-400 font-medium w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={orders.length > 0 && orders.every((o) => bulk.isSelected(o.order_id))}
                          onChange={(e) => bulk.setMany(orders.map((o) => o.order_id), e.target.checked)}
                        />
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">ID</th>
                      <th className="text-left p-4 text-gray-400 font-medium">User</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Charge</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Link</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Start count</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Quantity</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Service</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Remains</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Created</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Mode</th>
                      <th className="p-4 text-gray-400 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-gray-500">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                    orders.map((order) => {
                      const isBundle = order.is_bundle || !!(order.sub_order_details?.length || order.sub_orders?.length);
                      const isExpanded = expandedBundleId === order.order_id;
                      const subOrders = order.sub_order_details || [];
                      const st = String(order.status || '').toLowerCase();
                      const showRefill =
                        order.service_refill_supported &&
                        ['completed', 'partial'].includes(st) &&
                        !!order.provider_order_id;
                      return (
                      <React.Fragment key={order.order_id}>
                      <tr className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${order.order_id}`}
                            checked={bulk.isSelected(order.order_id)}
                            onChange={() => bulk.toggleOne(order.order_id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm text-white font-medium" title={`Full panel order id: ${order.order_id ?? ''}`}>
                              {displayOrderId(order.order_id)}
                            </span>
                            <span className="text-[10px] text-gray-400" title="Order id returned by the supplier API (not your panel order id)">
                              Supplier order: {order.provider_order_id ? String(order.provider_order_id) : '—'}
                            </span>
                            {order.provider_alias && (
                              <span className="text-[10px] text-neon-green" title="Current provider">Provider: {order.provider_alias}</span>
                            )}
                            {(order.needs_price_approval || ((order.provider_charge ?? 0) > (((order.charge ?? order.price) ?? 0)))) && (
                              <span className="text-[10px] text-red-400 font-semibold" title="Provider cost is higher than user charge. Review pricing before sending to provider.">
                                Cost &gt; Charge (review)
                              </span>
                            )}
                            {(order.switch_count > 0) && (
                              <span className="text-[10px] text-amber-400" title="Switched providers">Switched {order.switch_count}×</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-cyber-purple font-mono font-medium">{order.user_username || order.user_id || '—'}</span>
                            {order.user_name && <span className="text-xs text-gray-500">{order.user_name}</span>}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-electric-blue font-bold">
                              {formatPrice((order.charge ?? order.price) ?? 0)}
                            </span>
                            {(() => {
                              const providerCostRaw = order.provider_charge;
                              const providerCost = Number(providerCostRaw);
                              const hasProviderCharge = providerCostRaw != null && Number.isFinite(providerCost);
                              if (!hasProviderCharge) {
                                return <span className="text-xs text-gray-500">—</span>;
                              }
                              return (
                                <span className="text-xs text-gray-300 tabular-nums" title={`Provider cost ${formatProviderChargeDisplay(providerCostRaw)}`}>
                                  {formatProviderChargeDisplay(providerCostRaw)}
                                </span>
                              );
                            })()}
                          </div>
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
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-gray-400">{order.start_count != null ? order.start_count.toLocaleString() : '—'}</span>
                            {order.start_count_source && (
                              <span className="text-[10px] text-gray-500 capitalize">{order.start_count_source}</span>
                            )}
                            {order.needs_start_count_sync && (
                              <span className="text-[10px] text-yellow-500" title="Start count pending sync">⏳</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right text-gray-400">
                          {(order.quantity ?? 0).toLocaleString()}
                        </td>
                        <td className="p-4 max-w-[180px]">
                          <div className="flex items-center gap-2">
                            {isBundle && (
                              <button
                                type="button"
                                onClick={() => setExpandedBundleId((id) => (id === order.order_id ? null : order.order_id))}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyber-purple/20 text-cyber-purple text-[11px] hover:bg-cyber-purple/30"
                                title={isExpanded ? 'Hide sub-orders' : 'Show sub-orders'}
                              >
                                <Package size={12} />
                                Bundle
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}
                            <span className="text-white truncate block">{isBundle ? (order.bundle_name || 'Bundle') : (order.service_name || order.service_id || '—')}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Select value={order.status} onValueChange={(val) => handleStatusChange(order.order_id, val)}>
                            <SelectTrigger className="w-32 bg-transparent border-none p-0 h-auto">
                              <Badge className={`${getStatusClass(order.status)} capitalize cursor-pointer`}>
                                {(order.status || '').replace(/_/g, ' ')}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent className="bg-deep-navy border-white/10">
                              <SelectItem value="pending_manual">Manual Pending</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4 text-right text-gray-400">
                          {order.remains != null ? order.remains.toLocaleString() : '—'}
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {order.mode || 'Auto'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {showRefill && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 border-neon-green/40 text-neon-green hover:bg-neon-green/10"
                                onClick={() => handleAdminRefill(order.order_id)}
                                disabled={refillingId === order.order_id}
                              >
                                {refillingId === order.order_id ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw size={14} className="mr-1" />
                                    Refill
                                  </>
                                )}
                              </Button>
                            )}
                            {isBundle && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 border-cyber-purple/40 text-cyber-purple hover:bg-cyber-purple/10"
                                onClick={() => setExpandedBundleId((id) => (id === order.order_id ? null : order.order_id))}
                              >
                                {isExpanded ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
                                Sub-orders ({subOrders.length})
                              </Button>
                            )}
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2 border-white/10 text-gray-400 hover:text-white">
                                Actions <ChevronRight size={14} className="ml-0.5 rotate-[-90deg]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-deep-navy border-white/10 min-w-[180px]">
                              <DropdownMenuItem onClick={() => openDetails(order)}>
                                Details
                              </DropdownMenuItem>
                              {String(order.mode || '').toLowerCase() === 'manual' || String(order.status || '').toLowerCase() === 'pending_manual' ? (
                                <DropdownMenuItem onClick={() => openProviderCost(order)}>
                                  Set provider cost
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem onClick={() => { setEditLinkOrder(order); setEditLinkVal(order.link || ''); }}>
                                Edit link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSetStartCountOrder(order); setStartCountVal(String(order.start_count ?? '')); }}>
                                Set start count
                              </DropdownMenuItem>
                              {String(order.status || '').toLowerCase() !== 'partial' && !order.partial_set_at && (
                                <DropdownMenuItem onClick={() => { setSetPartialOrder(order); setPartialRemainsVal(String(order.remains ?? order.quantity ?? '')); }}>
                                  Set partial
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="bg-deep-navy border-white/10">
                                  <DropdownMenuItem onClick={() => handleStatusChange(order.order_id, 'in_progress')}>
                                    In progress
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(order.order_id, 'processing')}>
                                    Processing
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(order.order_id, 'completed')}>
                                    Completed
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              {order.status === 'pending_manual' && (
                                <DropdownMenuItem onClick={() => handleProcessManual(order.order_id)}>
                                  Process
                                </DropdownMenuItem>
                              )}
                              {(!isBundle && order.status !== 'completed') && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleResendAttached(order)}
                                    disabled={resending === order.order_id}
                                  >
                                    {resending === order.order_id ? 'Resending...' : 'Resend (Attached)'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openResendModal(order)}
                                    disabled={resending === order.order_id}
                                  >
                                    {resending === order.order_id ? 'Resending...' : 'Resend (Manual)'}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => setCancelRefundOrder(order)}
                                className="text-red-400"
                              >
                                Cancel and refund
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        </td>
                      </tr>
                      {isBundle && isExpanded && subOrders.length > 0 && (
                        <tr className="bg-white/5 border-l-2 border-cyber-purple/40">
                          <td colSpan={13} className="p-4">
                            <div className="rounded-lg border border-white/10 overflow-hidden">
                              <p className="text-xs text-gray-400 px-3 py-2 bg-white/5 border-b border-white/10">Sub-orders</p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 bg-white/5">
                                    <th className="py-2 px-3 text-left">ID</th>
                                    <th className="py-2 px-3 text-left">Service</th>
                                    <th className="py-2 px-3 text-right">Quantity</th>
                                    <th className="py-2 px-3 text-left">Status</th>
                                    <th className="py-2 px-3 text-left">Provider ID</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subOrders.map((s) => (
                                    <tr key={s.order_id} className="border-t border-white/5">
                                      <td className="py-2 px-3 text-gray-300 font-mono" title={String(s.order_id ?? '')}>{displayOrderId(s.order_id)}</td>
                                      <td className="py-2 px-3 text-gray-300">{s.service_name || s.service_id || '—'}</td>
                                      <td className="py-2 px-3 text-right text-gray-300">{(s.quantity ?? 0).toLocaleString()}</td>
                                      <td className="py-2 px-3">
                                        <Badge className={getStatusClass(s.status)}>{(s.status || '').replace(/_/g, ' ')}</Badge>
                                      </td>
                                      <td className="py-2 px-3 text-gray-400 font-mono">{s.provider_order_id || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                    })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-white/10">
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="border-white/10">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={!!detailsOrder} onOpenChange={(o) => !o && setDetailsOrder(null)}>
        <DialogContent className="bg-deep-navy border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{detailsOrder?.order_id}</DialogTitle>
          </DialogHeader>
          {detailsOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-400">User</span><span>{detailsOrder.user_id}</span>
                <span className="text-gray-400">Service</span><span>{detailsOrder.service_name || detailsOrder.service_id}</span>
                <span className="text-gray-400">Charge</span><span className="text-electric-blue">{formatPrice((detailsOrder.charge ?? detailsOrder.price) ?? 0)}</span>
                <span className="text-gray-400">Quantity</span><span>{detailsOrder.quantity?.toLocaleString()}</span>
                <span className="text-gray-400">Start count</span><span>{detailsOrder.start_count ?? '—'}</span>
                <span className="text-gray-400">Remains</span><span>{detailsOrder.remains ?? '—'}</span>
                <span className="text-gray-400">Status</span><span><Badge className={getStatusClass(detailsOrder.status)}>{(detailsOrder.status || '').replace(/_/g, ' ')}</Badge></span>
                <span className="text-gray-400">Mode</span><span>{detailsOrder.mode || 'Auto'}</span>
                {detailsOrder.provider_name && <span className="text-gray-400">Provider</span>}
                {detailsOrder.provider_name && <span className="text-neon-green">{detailsOrder.provider_name}{detailsOrder.switch_count > 0 ? ` (switched ${detailsOrder.switch_count}×)` : ''}</span>}
              </div>
              {detailsOrder.provider_attempts?.length > 0 && (
                <div>
                  <span className="text-gray-400 block mb-1">Provider history</span>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    {detailsOrder.provider_attempts.map((a, i) => (
                      <li key={i}>
                        {a.provider_name} → {a.result === 'success' ? 'Success' : a.result === 'switched' ? `Switched (${a.fail_reason || '—'})` : `Failed (${a.fail_reason || '—'})`}
                        {a.attempted_at && ` — ${new Date(a.attempted_at).toLocaleString()}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <span className="text-gray-400 block mb-1">Link</span>
                <a href={detailsOrder.link} target="_blank" rel="noopener noreferrer" className="text-electric-blue hover:underline break-all">{detailsOrder.link}</a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Link Dialog */}
      <Dialog open={!!editLinkOrder} onOpenChange={(o) => !o && (setEditLinkOrder(null), setEditLinkVal(''))}>
        <DialogContent className="bg-deep-navy border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit link — Order #{editLinkOrder?.order_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Link</Label>
              <Input value={editLinkVal} onChange={(e) => setEditLinkVal(e.target.value)} className="mt-2 bg-deep-navy border-white/10" placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => (setEditLinkOrder(null), setEditLinkVal(''))} className="border-white/10">Cancel</Button>
            <Button onClick={handleEditLink} disabled={actionLoading || !editLinkVal.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Cost Dialog */}
      <Dialog open={!!setProviderCostOrder} onOpenChange={(o) => !o && (setSetProviderCostOrder(null), setProviderCostVal(''))}>
        <DialogContent className="bg-deep-navy border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Provider cost — Order #{setProviderCostOrder?.order_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-gray-400">
              This updates provider cost used for profit calculation (manual orders only).
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Provider cost</Label>
              <Input
                value={providerCostVal}
                onChange={(e) => setProviderCostVal(e.target.value)}
                placeholder="0.00"
                className="mt-2 bg-deep-navy border-white/10"
                inputMode="decimal"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSetProviderCostOrder(null); setProviderCostVal(''); }} disabled={savingProviderCost}>
                Cancel
              </Button>
              <Button className="bg-cyber-purple hover:bg-cyber-purple/90" onClick={saveProviderCost} disabled={savingProviderCost}>
                {savingProviderCost ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Start Count Dialog */}
      <Dialog open={!!setStartCountOrder} onOpenChange={(o) => !o && (setSetStartCountOrder(null), setStartCountVal(''))}>
        <DialogContent className="bg-deep-navy border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Set start count — Order #{setStartCountOrder?.order_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Start count</Label>
              <Input type="number" min={0} value={startCountVal} onChange={(e) => setStartCountVal(e.target.value)} className="mt-2 bg-deep-navy border-white/10" placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => (setSetStartCountOrder(null), setStartCountVal(''))} className="border-white/10">Cancel</Button>
            <Button onClick={handleSetStartCount} disabled={actionLoading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Partial Dialog */}
      <Dialog open={!!setPartialOrder} onOpenChange={(o) => !o && (setSetPartialOrder(null), setPartialRemainsVal(''))}>
        <DialogContent className="bg-deep-navy border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Set partial — Order #{setPartialOrder?.order_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Remains (undelivered quantity) *</Label>
              <Input type="number" min={0} value={partialRemainsVal} onChange={(e) => setPartialRemainsVal(e.target.value)} className="mt-2 bg-deep-navy border-white/10" placeholder="e.g. 50" />
              <p className="text-xs text-gray-500 mt-1">Charge will become: (delivered / total) × price. Rest is refunded to user.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => (setSetPartialOrder(null), setPartialRemainsVal(''))} className="border-white/10">Cancel</Button>
            <Button onClick={handleSetPartial} disabled={actionLoading || partialRemainsVal === ''}>Set partial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend with Provider/API Service Dialog */}
      <Dialog open={!!resendModalOrder} onOpenChange={(o) => !o && setResendModalOrder(null)}>
        <DialogContent className="bg-deep-navy border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Resend Order with API Selection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Order ID</Label>
              <div className="mt-1 font-mono text-white">{resendModalOrder?.order_id || '—'}</div>
            </div>
            {resendModalOrder?.provider_order_id && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                This order was already sent once to provider (Provider Order ID: {String(resendModalOrder.provider_order_id)}).
                Approval checkbox is required before resending.
              </div>
            )}
            <div>
              <Label className="text-gray-400">Resend mode</Label>
              <Select value={resendMode} onValueChange={setResendMode}>
                <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-deep-navy border-white/10">
                  <SelectItem value="manual">Select provider + type API service ID</SelectItem>
                  <SelectItem value="attached">Use attached service provider mapping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400">API (Provider)</Label>
              <Select value={resendProviderId || '__none__'} onValueChange={(v) => setResendProviderId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="mt-2 bg-deep-navy border-white/10" disabled={resendMode === 'attached'}>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-deep-navy border-white/10">
                  <SelectItem value="__none__">Select provider</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.provider_id} value={p.provider_id}>
                      {p.alias || p.name || p.provider_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400">API Service ID</Label>
              <Input
                value={resendApiServiceId}
                onChange={(e) => setResendApiServiceId(e.target.value)}
                placeholder="e.g. 20"
                className="mt-2 bg-deep-navy border-white/10"
                disabled={resendMode === 'attached'}
              />
            </div>
            {resendMode === 'attached' && (
              <p className="text-xs text-gray-400">
                Uses provider + provider service id attached to this service mapping automatically.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={resendForceApproval}
                onChange={(e) => setResendForceApproval(e.target.checked)}
              />
              I approve resend
            </label>
            {resendModalOrder?.provider_order_id && !resendForceApproval && (
              <p className="text-xs text-red-400">Approval is required for orders already sent to provider.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setResendModalOrder(null)}>Cancel</Button>
            <Button
              onClick={confirmResendWithSelection}
              disabled={
                resending === resendModalOrder?.order_id ||
                (!!resendModalOrder?.provider_order_id && !resendForceApproval)
              }
            >
              {resending === resendModalOrder?.order_id ? 'Resending...' : 'Resend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel and Refund Confirm */}
      <AlertDialog open={!!cancelRefundOrder} onOpenChange={(o) => !o && setCancelRefundOrder(null)}>
        <AlertDialogContent className="bg-deep-navy border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel and refund?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel order #{cancelRefundOrder?.order_id} and refund {formatPrice((cancelRefundOrder?.charge ?? cancelRefundOrder?.price) ?? 0)} to the user. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">No</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelRefund} className="bg-red-600 hover:bg-red-700" disabled={actionLoading}>
              Yes, cancel and refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminOrders;
