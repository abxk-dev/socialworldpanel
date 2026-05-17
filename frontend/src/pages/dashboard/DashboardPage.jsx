import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Clock, CheckCircle, DollarSign, TrendingUp, ArrowRight, RotateCcw, Crown } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import FreeTrialBanner from '../../components/FreeTrialBanner';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useReseller } from '../../context/ResellerContext';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { displayOrderId } from '../../lib/utils';

const DashboardPage = () => {
  const { user, token, refreshUser } = useDashboardAuth();
  const { isReseller } = useReseller();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState({ total_orders: 0, pending_orders: 0, completed_orders: 0, balance: 0, total_spent: 0 });
  const [vipTiers, setVipTiers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reorderModal, setReorderModal] = useState({ open: false, order: null });
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isReseller) {
          const [balanceRes, ordersRes] = await Promise.all([
            api.get('/reseller/balance'),
            api.get('/reseller/orders'),
          ]);
          const orders = ordersRes.data?.orders ?? [];
          const balance = balanceRes.data?.balance ?? 0;
          const pending = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
          const completed = orders.filter((o) => o.status === 'completed').length;
          setStats({ total_orders: orders.length, pending_orders: pending, completed_orders: completed, balance, total_spent: 0 });
          setRecentOrders(orders.slice(0, 5));
          setVipTiers([]);
        } else {
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const [statsRes, ordersRes, tiersRes] = await Promise.all([
            api.get('/user/stats', { headers, withCredentials: true }),
            api.get('/orders?limit=5', { headers, withCredentials: true }),
            api.get('/public/vip-tiers', { withCredentials: true })
          ]);
          const statsPayload = statsRes?.data?.stats && typeof statsRes.data.stats === 'object'
            ? statsRes.data.stats
            : (statsRes?.data && typeof statsRes.data === 'object' ? statsRes.data : null);
          setStats(
            statsPayload
              ? { total_orders: 0, pending_orders: 0, completed_orders: 0, balance: 0, total_spent: 0, ...statsPayload }
              : { total_orders: 0, pending_orders: 0, completed_orders: 0, balance: 0, total_spent: 0 }
          );
          {
            const tiersData = tiersRes?.data;
            setVipTiers(
              Array.isArray(tiersData)
                ? tiersData
                : (Array.isArray(tiersData?.vip_tiers) ? tiersData.vip_tiers : [])
            );
          }
          setRecentOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders ?? []));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats({ total_orders: 0, pending_orders: 0, completed_orders: 0, balance: 0, total_spent: 0 });
        setRecentOrders([]);
        setVipTiers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, isReseller]);

  const totalSpent = stats.total_spent ?? 0;
  const sortedTiers = [...vipTiers].sort((a, b) => (a.min_total_spend ?? 0) - (b.min_total_spend ?? 0));
  const currentVipTier = sortedTiers.filter((t) => totalSpent >= (t.min_total_spend ?? 0)).pop() || null;
  const nextVipTier = sortedTiers.find((t) => (t.min_total_spend ?? 0) > totalSpent) || null;
  const spendToNext = nextVipTier ? Math.max(0, (nextVipTier.min_total_spend ?? 0) - totalSpent) : 0;

  const statCards = [
    { label: 'Balance', value: formatPrice(stats.balance ?? 0), icon: DollarSign, color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
    { label: 'Total Orders', value: stats.total_orders, icon: ShoppingCart, color: 'text-electric-blue', bgColor: 'bg-electric-blue/10' },
    { label: 'Pending', value: stats.pending_orders, icon: Clock, color: 'text-[var(--warning)]', bgColor: 'bg-[var(--warning-bg)]' },
    { label: 'Completed', value: stats.completed_orders, icon: CheckCircle, color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
  ];

  const completedForReorder = recentOrders.filter((o) => o.status === 'completed').slice(0, 5);

  const getQuickReorderLabel = (order, index) => {
    const candidate = String(
      order?.service_name ||
      order?.service ||
      order?.name ||
      ''
    ).trim();
    if (candidate && !/^srv_[a-z0-9]+$/i.test(candidate)) return candidate;

    const serviceId = String(order?.service_id || '').trim();
    if (serviceId && !/^srv_[a-z0-9]+$/i.test(serviceId)) return serviceId;

    return `#${index + 1}`;
  };

  const handleReorderConfirm = async () => {
    const o = reorderModal.order;
    if (!o) return;
    if (isReseller) { setReorderModal({ open: false, order: null }); return; }
    setReordering(true);
    try {
      const res = await api.post('/orders/reorder', { order_id: o.order_id }, { withCredentials: true });
      setReorderModal({ open: false, order: null });
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/user/stats', { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }),
        api.get('/orders?limit=5', { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }),
      ]);
      const refreshedStats = statsRes?.data?.stats && typeof statsRes.data.stats === 'object'
        ? statsRes.data.stats
        : (statsRes?.data && typeof statsRes.data === 'object' ? statsRes.data : null);
      setStats(
        refreshedStats
          ? { total_orders: 0, pending_orders: 0, completed_orders: 0, balance: 0, total_spent: 0, ...refreshedStats }
          : stats
      );
      setRecentOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders ?? []));
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setReordering(false);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      in_progress: 'status-active',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      partial: 'status-partial'
    };
    return classes[status] || 'status-pending';
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-5">
        <FreeTrialBanner />
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-1">
                Welcome back, <span className="neon-text">{user?.name}</span>!
              </h2>
              <p className="text-[var(--text-muted)] text-sm">Ready to grow your social media presence?</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link to="/dashboard/recommend">
                <Button variant="outline" size="sm" className="border-neon-green/50 text-neon-green hover:bg-neon-green/10 whitespace-nowrap text-sm" data-testid="dashboard-find-best">
                  Find Best Service
                </Button>
              </Link>
              <Link to="/dashboard/new-order">
                <Button size="sm" className="bg-neon-green hover:bg-neon-green/90 text-black font-bold whitespace-nowrap text-sm" data-testid="dashboard-new-order">
                  <ShoppingCart size={16} className="mr-1.5 shrink-0" />
                  Place New Order
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="min-w-0"
            >
              <Card className="glass p-2.5 sm:p-4 hover:border-electric-blue/30 transition-all h-full" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                <div className="flex items-start justify-between gap-2 min-w-0 h-full">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-[var(--text-muted)] text-xs mb-0.5 break-words leading-tight">{stat.label}</p>
                    <p className={`text-base sm:text-xl md:text-2xl font-exo font-bold ${stat.color} truncate`} title={loading ? '' : String(stat.value)}>
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <div className={`p-1.5 sm:p-2.5 rounded-lg flex-shrink-0 ${stat.bgColor}`}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* VIP Tier status — only when tiers exist */}
        {vipTiers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass p-4 border-[var(--warning)]/20" data-testid="vip-status-card">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[var(--warning-bg)]">
                    <Crown size={20} className="text-[var(--warning)]" />
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">Current VIP tier</p>
                    <p className="text-xl font-exo font-bold text-[var(--warning)]">
                      {currentVipTier ? `${currentVipTier.name} (${currentVipTier.discount_percent ?? 0}% off orders)` : 'None'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-sm">Lifetime spend</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{formatPrice(totalSpent)}</p>
                </div>
                {nextVipTier && spendToNext > 0 && (
                  <div className="text-sm text-[var(--text-muted)]">
                    Spend <span className="text-[var(--warning)] font-medium">{formatPrice(spendToNext)}</span> more for <span className="text-[var(--text-primary)] font-medium">{nextVipTier.name}</span> ({nextVipTier.discount_percent ?? 0}% off)
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { title: 'Add Funds', desc: 'Top up your balance', path: '/dashboard/add-funds', icon: DollarSign, color: 'neon-green' },
            { title: 'View Orders', desc: 'Check order status', path: '/dashboard/orders', icon: Clock, color: 'electric-blue' },
            { title: 'Get Support', desc: 'Need help? Contact us', path: '/dashboard/tickets', icon: TrendingUp, color: 'cyber-purple' },
          ].map((action, idx) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <Link to={action.path}>
                <Card className="glass p-6 hover:border-electric-blue/30 transition-all group cursor-pointer" data-testid={`quick-${action.title.toLowerCase().replace(' ', '-')}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-${action.color}/10`}>
                        <action.icon size={24} className={`text-${action.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)]">{action.title}</h3>
                        <p className="text-sm text-[var(--text-muted)]">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-[var(--text-muted)] group-hover:text-electric-blue transition-colors" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Reorder — SWP only */}
        {!isReseller && completedForReorder.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="glass overflow-hidden">
              <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
                <h3 className="font-exo font-bold text-[var(--text-primary)]">Quick Reorder</h3>
                <Link to="/dashboard/orders" className="text-electric-blue hover:underline text-sm">View all</Link>
              </div>
              <div className="p-4 overflow-x-auto flex gap-4 pb-4">
                {completedForReorder.map((order, index) => (
                  <div
                    key={order.order_id}
                    className="flex-shrink-0 w-[260px] p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-neon-green/30 transition-colors"
                  >
                    <p className="text-[var(--text-primary)] font-medium truncate">{getQuickReorderLabel(order, index)}</p>
                    <p className="text-[var(--text-muted)] text-xs truncate mt-1" title={order.link}>{order.link}</p>
                    <p className="text-[var(--text-muted)] text-xs mt-2">Last ordered: {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</p>
                    <p className="text-neon-green font-bold mt-1">{formatPrice(order.charge ?? order.price ?? 0)}</p>
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30"
                      onClick={() => setReorderModal({ open: true, order })}
                    >
                      <RotateCcw size={14} className="mr-2" />
                      Reorder
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="font-exo font-bold text-[var(--text-primary)] text-lg">Recent Orders</h3>
              <Link to="/dashboard/orders" className="text-electric-blue hover:underline text-sm">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <p>No orders yet. Place your first order!</p>
                <Link to="/dashboard/new-order">
                  <Button className="mt-4 bg-electric-blue text-black">Place Order</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-card)]">
                    <tr>
                      <th className="text-left p-4 text-[var(--text-muted)] font-medium">Order ID</th>
                      <th className="text-left p-4 text-[var(--text-muted)] font-medium">Service</th>
                      <th className="text-left p-4 text-[var(--text-muted)] font-medium hidden md:table-cell">Quantity</th>
                      <th className="text-left p-4 text-[var(--text-muted)] font-medium">Status</th>
                      <th className="text-right p-4 text-[var(--text-muted)] font-medium">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.order_id} className="border-t border-[var(--border)] hover:bg-[var(--bg-card)]">
                        <td
                          className="p-4 text-[var(--text-secondary)] font-mono text-sm"
                          title={String(order.order_id ?? '')}
                        >
                          {displayOrderId(order.order_id)}
                        </td>
                        <td className="p-4 text-[var(--text-primary)] max-w-[200px] truncate">{order.service_name}</td>
                        <td className="p-4 text-[var(--text-muted)] hidden md:table-cell">{order.quantity.toLocaleString()}</td>
                        <td className="p-4">
                          <Badge className={`${getStatusClass(order.status)} capitalize`}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4 text-right text-electric-blue font-bold">{formatPrice(order.charge ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <Dialog open={reorderModal.open} onOpenChange={(open) => !open && setReorderModal({ open: false, order: null })}>
        <DialogContent className="glass border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">
              Reorder {reorderModal.order ? getQuickReorderLabel(reorderModal.order, 0) : 'this order'}?
            </DialogTitle>
          </DialogHeader>
          {reorderModal.order && (
            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>Link: <span className="text-[var(--text-primary)] truncate block">{reorderModal.order.link}</span></p>
              <p>Quantity: {(reorderModal.order.quantity ?? 0).toLocaleString()}</p>
              <p>Estimated: <span className="text-neon-green font-bold">{formatPrice(reorderModal.order.charge ?? reorderModal.order.price ?? 0)}</span></p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReorderModal({ open: false, order: null })} className="border-[var(--border)]">Cancel</Button>
            <Button onClick={handleReorderConfirm} disabled={reordering} className="bg-neon-green hover:bg-neon-green/90 text-black">
              {reordering ? 'Placing...' : 'Confirm Reorder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardPage;
