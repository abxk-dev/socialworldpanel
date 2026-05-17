import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, HelpCircle, RefreshCw, Star } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import OrderProgressTimeline from '../../components/OrderProgressTimeline';
import { useAuth } from '../../App';
import { useCurrency } from '../../context/CurrencyContext';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import api from '../../lib/axios';

const displayServiceName = (nameOrId) => {
  if (nameOrId == null || nameOrId === '') return '—';
  const s = String(nameOrId);
  if (s.startsWith('srv_')) return '—';
  return s;
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

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.get(`/orders/${id}/status`, { headers, withCredentials: true });
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to load order');
      setOrder(null);
      if (err.response?.status === 404) toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id, token]);

  useEffect(() => {
    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [id, token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const progressPercent = () => {
    if (!order) return 0;
    if (order.progress != null) return Math.min(100, Math.max(0, Number(order.progress)));
    const qty = order.quantity || 0;
    const start = order.start_count;
    if (qty > 0 && start != null) return Math.min(100, Math.round((Number(start) / qty) * 100));
    return 0;
  };

  const formatEta = () => {
    const m = order?.eta_minutes;
    if (m == null) return null;
    const n = Number(m);
    if (n < 60) return `~${Math.round(n)} min remaining`;
    const h = Math.floor(n / 60);
    const r = Math.round(n % 60);
    return r ? `~${h}h ${r}m remaining` : `~${h} hour(s) remaining`;
  };

  const ticketUrl = `/dashboard/tickets${order?.order_id ? `?order=${encodeURIComponent(order.order_id)}` : ''}`;

  if (loading && !order) {
    return (
      <DashboardLayout title="Order Details">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !order) {
    return (
      <DashboardLayout title="Order Details">
        <Toaster position="top-right" theme="dark" />
        <Card className="p-8 text-center">
          <p className="text-[var(--text-muted)] mb-4">{error}</p>
          <Button onClick={() => navigate('/dashboard/orders')} variant="outline" className="border-[var(--border)]">
            <ArrowLeft size={16} className="mr-2" />
            Back to Order History
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const percent = progressPercent();
  const strokeDash = 2 * Math.PI * 90;
  const offset = strokeDash - (percent / 100) * strokeDash;

  return (
    <DashboardLayout title="Order Details">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/orders')}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={18} className="mr-1" />
            Back to Order History
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Progress circle + status */}
          <Card className="p-6 flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border)" strokeWidth="12" />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke={
                    order.status === 'completed'
                      ? 'var(--success)'
                      : order.status === 'failed' || order.status === 'error' || order.status === 'cancelled'
                        ? 'var(--error)'
                        : 'var(--accent)'
                  }
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={strokeDash}
                  strokeDashoffset={offset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{percent}%</span>
              </div>
            </div>
            <Badge className={`${getStatusClass(order.status)} mt-4 capitalize`}>
              {(order.status || '').replace(/_/g, ' ')}
            </Badge>
            {formatEta() && (
              <p className="text-cyber-purple text-sm mt-2">{formatEta()}</p>
            )}
            <Button variant="outline" size="sm" onClick={fetchOrder} className="mt-3 border-[var(--border)]" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin mr-2' : 'mr-2'} />
              Refresh
            </Button>
          </Card>

          {/* Center: Order info */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Order info</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <dt className="text-[var(--text-secondary)]">Order ID</dt>
              <dd className="font-mono text-[var(--text-primary)]">{order.order_id}</dd>
              <dt className="text-[var(--text-secondary)]">Service</dt>
              <dd className="text-[var(--text-primary)]">{displayServiceName(order.service_name || order.service_id)}</dd>
              <dt className="text-[var(--text-secondary)]">Link</dt>
              <dd>
                <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-electric-blue hover:underline flex items-center gap-1 truncate">
                  <ExternalLink size={12} />
                  <span className="truncate">{order.link}</span>
                </a>
              </dd>
              <dt className="text-[var(--text-secondary)]">Quantity</dt>
              <dd className="text-[var(--text-primary)]">{(order.quantity ?? 0).toLocaleString()}</dd>
              <dt className="text-[var(--text-secondary)]">Start count</dt>
              <dd className="text-[var(--text-secondary)]">{order.start_count != null ? order.start_count.toLocaleString() : '—'}</dd>
              {order.start_count != null && order.start_count > 0 && (
                <>
                  <dt className="text-[var(--text-secondary)]">Expected end</dt>
                  <dd className="text-neon-green">{(order.start_count + (order.quantity ?? 0)).toLocaleString()}</dd>
                </>
              )}
              <dt className="text-[var(--text-secondary)]">Remains</dt>
              <dd className="text-[var(--text-secondary)]">{order.remains != null ? order.remains.toLocaleString() : '—'}</dd>
              <dt className="text-[var(--text-secondary)]">Charge</dt>
              <dd className="text-electric-blue font-bold">{formatPrice(order.charge ?? order.price ?? 0)}</dd>
              <dt className="text-[var(--text-secondary)]">Created</dt>
              <dd className="text-[var(--text-secondary)]">{formatDate(order.created_at)}</dd>
            </dl>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Timeline</h3>
          <OrderProgressTimeline status={order.status} timeline={order.timeline || []} />
        </Card>

        {/* Rate this service - for completed non-bundle orders */}
        {order.status === 'completed' && !order.is_bundle && order.service_id && (
          <Card className="p-6 flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Rate this service</h3>
              <p className="text-[var(--text-muted)] text-sm">Share your experience with a star rating and help others choose.</p>
            </div>
            <Link to={`/reviews/${order.service_id}`}>
              <Button className="bg-[var(--warning-bg)] text-[var(--warning)] hover:bg-[var(--warning-bg)] border border-[var(--warning)]/40">
                <Star size={16} className="mr-2" />
                Leave a review
              </Button>
            </Link>
          </Card>
        )}

        {/* Need help */}
        <Card className="p-6 flex flex-row items-center justify-between">
          <p className="text-[var(--text-muted)]">Need help with this order?</p>
          <Link to={ticketUrl}>
            <Button className="bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30">
              <HelpCircle size={16} className="mr-2" />
              Open support ticket
            </Button>
          </Link>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OrderDetailPage;
