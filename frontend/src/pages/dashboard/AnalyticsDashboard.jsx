import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart2,
  DollarSign,
  Calendar,
  Package,
  TrendingUp,
  Loader2,
  Lightbulb,
  Clock,
  Award,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useReseller } from '../../context/ResellerContext';
import { useCurrency } from '../../context/CurrencyContext';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const PLATFORM_COLORS = {
  Instagram: '#E1306C',
  YouTube: '#FF0000',
  Facebook: '#1877F2',
  'X/Twitter': '#1DA1F2',
  TikTok: '#69C9D0',
  Spotify: '#1DB954',
  Other: '#7b82a8',
};

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
};

function formatDateShort(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRelativeTime(str) {
  if (!str) return '';
  const d = new Date(str);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDateShort(str);
}

function aggregateToWeekly(chartData) {
  if (!chartData || chartData.length <= 60) return chartData;
  const byWeek = {};
  chartData.forEach((row) => {
    const d = new Date(row.date);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const key = start.toISOString().split('T')[0];
    if (!byWeek[key]) byWeek[key] = { date: key, spent: 0, orders: 0 };
    byWeek[key].spent += row.spent || 0;
    byWeek[key].orders += row.orders || 0;
  });
  return Object.values(byWeek).sort((a, b) => a.date.localeCompare(b.date));
}

const SkeletonCard = () => (
  <div className="rounded-xl border border-[var(--border)] p-6 bg-[var(--bg-tertiary)] animate-pulse">
    <div className="h-4 w-24 bg-[var(--bg-hover)] rounded mb-4" />
    <div className="h-8 w-32 bg-[var(--bg-hover)] rounded" />
  </div>
);

const AnalyticsDashboard = () => {
  const { token } = useDashboardAuth();
  const { isReseller } = useReseller();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.toISOString().split('T')[0];
  }, []);
  const monthStart = useMemo(() => {
    const m = new Date();
    m.setDate(1);
    m.setHours(0, 0, 0, 0);
    return m.toISOString().split('T')[0];
  }, []);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(today);
  const [dashData, setDashData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const fetchAll = async (fromVal, toVal) => {
    if (isReseller || !token) return;
    setLoading(true);
    setLoadingChart(true);
    setLoadingActivity(true);
    const fromStr = fromVal || from;
    const toStr = toVal || to;
    const params = `from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`;
    try {
      const [dashRes, chartRes, activityRes] = await Promise.all([
        api.get(`/analytics/dashboard?${params}`, { withCredentials: true }),
        api.get(`/analytics/spending-chart?${params}`, { withCredentials: true }),
        api.get('/analytics/activity', { withCredentials: true }),
      ]);
      setDashData(dashRes.data);
      setChartData(chartRes.data?.chart_data || []);
      setActivity(activityRes.data?.activity || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load analytics');
      setDashData(null);
      setChartData([]);
      setActivity([]);
    } finally {
      setLoading(false);
      setLoadingChart(false);
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token, isReseller]);

  const applyRange = () => fetchAll(from, to);

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFrom(start.toISOString().split('T')[0]);
    setTo(end.toISOString().split('T')[0]);
    setTimeout(() => fetchAll(start.toISOString().split('T')[0], end.toISOString().split('T')[0]), 0);
  };

  const setThisMonth = () => {
    setFrom(monthStart);
    setTo(today);
    setTimeout(() => fetchAll(monthStart, today), 0);
  };

  const chartDataToShow = useMemo(() => {
    const diffDays = chartData.length;
    if (diffDays > 60) return aggregateToWeekly(chartData);
    return chartData;
  }, [chartData]);

  const maxSpent = useMemo(() => Math.max(...chartDataToShow.map((d) => d.spent), 1), [chartDataToShow]);
  const maxServiceSpent = useMemo(
    () => Math.max(...(dashData?.top_services?.map((s) => s.total_spent) || [1]), 1),
    [dashData?.top_services]
  );

  if (isReseller) {
    return (
      <DashboardLayout title="Analytics">
        <Card className="glass p-6 border-cyber-purple/20">
          <p className="text-[var(--text-muted)]">Analytics is not available for reseller accounts.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Analytics">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header + Date Range */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BarChart2 className="text-cyber-purple" size={28} />
                My Analytics
              </h1>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-[var(--text-muted)] text-sm">From</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 bg-deep-navy border-[var(--border)] w-40"
                />
              </div>
              <div>
                <Label className="text-[var(--text-muted)] text-sm">To</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 bg-deep-navy border-[var(--border)] w-40"
                />
              </div>
              <Button onClick={applyRange} className="bg-cyber-purple hover:bg-cyber-purple/90">
                Apply
              </Button>
              <div className="flex flex-wrap gap-2 ml-2">
                {[
                  { label: '7D', days: 7 },
                  { label: '30D', days: 30 },
                  { label: '90D', days: 90 },
                  { label: 'This Month', fn: setThisMonth },
                ].map((q) => (
                  <Button
                    key={q.label}
                    variant="outline"
                    size="sm"
                    onClick={q.fn || (() => setQuickRange(q.days))}
                    className="border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array(4)
                .fill(0)
                .map((_, i) => <SkeletonCard key={i} />)
            : dashData?.stats && (
                <>
                  <Card className="rounded-xl border border-[var(--border)] p-6 bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                      <DollarSign size={16} />
                      Range Spent
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatPrice(dashData.stats.range_spent ?? 0)}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      All time: {formatPrice(dashData.stats.all_time_spent ?? 0)}
                    </div>
                  </Card>
                  <Card className="rounded-xl border border-[var(--border)] p-6 bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                      <Calendar size={16} />
                      This Month
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatPrice(dashData.stats.this_month_spent ?? 0)}
                    </div>
                  </Card>
                  <Card className="rounded-xl border border-[var(--border)] p-6 bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                      <Package size={16} />
                      Orders
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                      {dashData.stats.total_orders_in_range ?? 0} total
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      ✅{dashData.stats.completed_orders ?? 0} ⏳{dashData.stats.pending_orders ?? 0} ❌
                      {dashData.stats.failed_orders ?? 0}
                    </div>
                  </Card>
                  <Card className="rounded-xl border border-[var(--border)] p-6 bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                      <TrendingUp size={16} />
                      Avg Order
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatPrice(dashData.stats.avg_order_value ?? 0)}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">per order</div>
                  </Card>
                </>
              )}
        </div>

        {/* Spending Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Daily Spending — {formatDateShort(from)} to {formatDateShort(to)}
            </h2>
            {loadingChart ? (
              <div className="h-[220px] bg-[var(--bg-card)] rounded-lg animate-pulse" />
            ) : chartDataToShow.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-[var(--text-muted)]">
                No spending data for this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartDataToShow}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#7b82a8', fontSize: 11 }}
                    tickFormatter={(d) => (d ? d.slice(5) : '')}
                    interval={chartDataToShow.length > 14 ? Math.floor(chartDataToShow.length / 14) : 0}
                  />
                  <YAxis
                    tick={{ fill: '#7b82a8', fontSize: 11 }}
                    tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                    }}
                    labelFormatter={(l) => l}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Spent']}
                  />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="var(--success)"
                    strokeWidth={2}
                    fill="url(#spendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Top Services + Platform Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass p-6 border-cyber-purple/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Top 5 Services</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-[var(--bg-hover)] rounded animate-pulse" />
                ))}
              </div>
            ) : !dashData?.top_services?.length ? (
              <p className="text-[var(--text-muted)]">No orders in this range</p>
            ) : (
              <div className="space-y-3">
                {(dashData.top_services.slice(0, 5) || []).map((s, i) => (
                  <div key={s.service_id} className="flex flex-col gap-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[var(--text-primary)] truncate pr-2">{s.service_name}</span>
                      <span className="text-electric-blue font-medium shrink-0">
                        {formatPrice(s.total_spent ?? 0)} ({s.order_count} orders)
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyber-purple/70 rounded-full transition-all duration-500"
                        style={{
                          width: `${maxServiceSpent > 0 ? Math.min(100, ((s.total_spent || 0) / maxServiceSpent) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="glass p-6 border-cyber-purple/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Platform Breakdown</h2>
            {loading ? (
              <div className="h-[220px] bg-[var(--bg-card)] rounded animate-pulse" />
            ) : !dashData?.platform_breakdown?.length ? (
              <p className="text-[var(--text-muted)]">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={dashData.platform_breakdown}
                    dataKey="percentage"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ platform, percentage }) => `${platform} ${percentage}%`}
                  >
                    {dashData.platform_breakdown.map((entry, i) => (
                      <Cell
                        key={entry.platform}
                        fill={PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.Other}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                    }}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Loyalty Widget */}
        {dashData?.loyalty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Award size={20} className="text-cyber-purple" />
                  <span
                    className="px-2 py-0.5 rounded capitalize"
                    style={{
                      backgroundColor: `${TIER_COLORS[dashData.loyalty.tier] || TIER_COLORS.bronze}22`,
                      color: TIER_COLORS[dashData.loyalty.tier] || TIER_COLORS.bronze,
                    }}
                  >
                    {dashData.loyalty.tier} member
                  </span>
                </h2>
                <span className="text-electric-blue font-medium">
                  💎 {dashData.loyalty.points ?? 0} pts = {formatPrice(dashData.loyalty.points_value_usd ?? 0)}
                </span>
              </div>
              {dashData.loyalty.next_tier && (
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-[var(--text-muted)] mb-1">
                    <span>Progress to {dashData.loyalty.next_tier}</span>
                    <span>{dashData.loyalty.progress_to_next ?? 0}%</span>
                  </div>
                  <div className="h-3 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon-green rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, dashData.loyalty.progress_to_next ?? 0)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {dashData.loyalty.next_tier_min != null &&
                      `$${Number(dashData.loyalty.total_spent_alltime || 0).toFixed(2)} / $${dashData.loyalty.next_tier_min} — `}
                    This period: earned {formatPrice(dashData.loyalty.cashback_earned_in_range ?? 0)} cashback
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Smart Insights */}
        {dashData?.insights?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Lightbulb size={20} className="text-[var(--warning)]" />
                Insights
              </h2>
              <div className="space-y-3">
                {dashData.insights.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-lg bg-[var(--bg-card)] border-l-4 border-cyber-purple/50"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <p className="text-[var(--text-secondary)] text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Clock size={20} />
              Recent Activity
            </h2>
            {loadingActivity ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-[var(--bg-hover)] rounded animate-pulse" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <p className="text-[var(--text-muted)]">No recent activity</p>
            ) : (
              <div className="space-y-1">
                {activity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`flex items-center gap-4 py-3 px-3 rounded-lg border border-[var(--border)] ${
                      item.type === 'deposit' ? 'bg-neon-green/5' : 'bg-[var(--bg-card)]'
                    }`}
                  >
                    <span
                      className={`font-bold ${item.amount >= 0 ? 'text-neon-green' : 'text-[var(--error)]'}`}
                    >
                      {item.amount >= 0 ? '+' : ''}
                      {formatPrice(Math.abs(item.amount))}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--text-primary)] truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[var(--text-muted)] text-sm truncate">{item.subtitle}</div>
                      )}
                    </div>
                    <div className="text-[var(--text-muted)] text-sm shrink-0">
                      {formatRelativeTime(item.created_at)}
                    </div>
                    {item.type === 'order' && (
                      <span className="text-xs text-[var(--text-muted)] shrink-0">{item.status}</span>
                    )}
                    {item.type === 'order' && item.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-cyber-purple"
                        onClick={() => navigate(`/dashboard/orders?highlight=${item.id}`)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Empty state when no orders in range */}
        {!loading && dashData?.stats?.total_orders_in_range === 0 && (
          <Card className="glass p-8 border-cyber-purple/20 text-center">
            <p className="text-[var(--text-muted)] mb-2">No orders found for this date range.</p>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              Try selecting a wider range or place your first order!
            </p>
            <Button asChild className="bg-cyber-purple hover:bg-cyber-purple/90">
              <Link to="/dashboard/new-order">Browse Services →</Link>
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
