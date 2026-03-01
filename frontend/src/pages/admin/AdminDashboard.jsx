import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, Users, ShoppingCart, Clock, TrendingUp, 
  TrendingDown, AlertTriangle, CheckCircle, XCircle, Loader2,
  ArrowUpRight, ArrowDownRight, Server
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const AdminDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [dashboardRes, chartsRes] = await Promise.all([
          axios.get(`${API}/admin/dashboard`, { headers, withCredentials: true }),
          axios.get(`${API}/admin/dashboard/charts`, { headers, withCredentials: true })
        ]);
        setData(dashboardRes.data);
        setCharts(chartsRes.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const summaryCards = data ? [
    { 
      label: "Today's Revenue", 
      value: `$${data.revenue_today?.toFixed(2) || '0.00'}`, 
      icon: DollarSign, 
      color: 'text-neon-green', 
      bgColor: 'bg-neon-green/10',
      subtext: `Profit: $${data.profit_today?.toFixed(2) || '0.00'}`
    },
    { 
      label: 'Total Revenue', 
      value: `$${data.revenue_total?.toFixed(2) || '0.00'}`, 
      icon: TrendingUp, 
      color: 'text-electric-blue', 
      bgColor: 'bg-electric-blue/10',
      subtext: `Profit: $${data.total_profit?.toFixed(2) || '0.00'}`
    },
    { 
      label: 'Pending Orders', 
      value: data.pending_orders || 0, 
      icon: Clock, 
      color: 'text-yellow-400', 
      bgColor: 'bg-yellow-400/10',
      subtext: `Processing: ${data.processing_orders || 0}`
    },
    { 
      label: 'Total Users', 
      value: data.total_users || 0, 
      icon: Users, 
      color: 'text-cyber-purple', 
      bgColor: 'bg-cyber-purple/10',
      subtext: `New today: ${data.new_users_today || 0}`
    },
    { 
      label: 'Active Providers', 
      value: data.active_providers || 0, 
      icon: Server, 
      color: 'text-cyan-400', 
      bgColor: 'bg-cyan-400/10',
      subtext: `Low balance: ${data.low_balance_providers?.length || 0}`
    },
    { 
      label: 'Total Profit', 
      value: `$${data.total_profit?.toFixed(2) || '0.00'}`, 
      icon: TrendingUp, 
      color: 'text-emerald-400', 
      bgColor: 'bg-emerald-400/10',
      subtext: `Margin: ${data.revenue_total > 0 ? ((data.total_profit / data.revenue_total) * 100).toFixed(1) : 0}%`
    },
  ] : [];

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      processing: '#06B6D4',
      completed: '#10B981',
      failed: '#EF4444',
      cancelled: '#6B7280',
      partial: '#8B5CF6'
    };
    return colors[status] || '#6B7280';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-deep-navy/95 border border-cyber-purple/30 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {typeof entry.value === 'number' && entry.name.includes('$') ? `$${entry.value.toFixed(2)}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-cyber-purple animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {summaryCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="glass p-4 border-cyber-purple/20 h-full" data-testid={`admin-stat-${stat.label.toLowerCase().replace(/[' ]/g, '-')}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                    <p className={`text-xl font-exo font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{stat.subtext}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1: Revenue & Orders */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Line Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <h3 className="font-exo font-bold text-white mb-4">Revenue (Last 30 Days)</h3>
              <div className="h-72" style={{ minWidth: '300px', minHeight: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts?.revenue_by_day || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="$ Revenue" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="profit" name="$ Profit" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Orders Bar Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <h3 className="font-exo font-bold text-white mb-4">Orders (Last 30 Days)</h3>
              <div className="h-72" style={{ minWidth: '300px', minHeight: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.revenue_by_day || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" name="Orders" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row 2: Users & Donut Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* New Users Line Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <h3 className="font-exo font-bold text-white mb-4">New Users (Last 30 Days)</h3>
              <div className="h-64" style={{ minWidth: '200px', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts?.users_by_day || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="users" name="New Users" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Orders by Status Donut */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <h3 className="font-exo font-bold text-white mb-4">Orders by Status</h3>
              <div className="h-64" style={{ minWidth: '200px', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts?.orders_by_status || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      label={({ status, count }) => `${status}: ${count}`}
                      labelLine={false}
                    >
                      {(charts?.orders_by_status || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Revenue by Payment Method */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <h3 className="font-exo font-bold text-white mb-4">Revenue by Payment Method</h3>
              <div className="h-64" style={{ minWidth: '200px', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts?.revenue_by_method || []}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      label={({ method, amount }) => `${method}: $${amount}`}
                      labelLine={false}
                    >
                      {(charts?.revenue_by_method || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Top Services */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <h3 className="font-exo font-bold text-white mb-4">Top 5 Best-Selling Services</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.top_services || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="orders" name="Orders" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card className="glass overflow-hidden border-cyber-purple/20">
              <div className="p-4 border-b border-cyber-purple/20 flex justify-between items-center">
                <h3 className="font-exo font-bold text-white">Recent Orders</h3>
                <ShoppingCart className="text-cyber-purple" size={20} />
              </div>
              {data?.recent_orders?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No orders yet</div>
              ) : (
                <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                  {data?.recent_orders?.slice(0, 8).map((order) => (
                    <div key={order.order_id} className="p-4 hover:bg-white/5">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{order.service_name}</div>
                          <div className="text-xs text-gray-500 font-mono">{order.order_id}</div>
                        </div>
                        <div className="text-right ml-2">
                          <Badge style={{ backgroundColor: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                            {order.status}
                          </Badge>
                          <div className="text-electric-blue font-bold mt-1">${order.charge?.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Recent Deposits */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            <Card className="glass overflow-hidden border-cyber-purple/20">
              <div className="p-4 border-b border-cyber-purple/20 flex justify-between items-center">
                <h3 className="font-exo font-bold text-white">Recent Deposits</h3>
                <DollarSign className="text-neon-green" size={20} />
              </div>
              {data?.recent_deposits?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No deposits yet</div>
              ) : (
                <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                  {data?.recent_deposits?.slice(0, 8).map((deposit) => (
                    <div key={deposit.deposit_id} className="p-4 hover:bg-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium capitalize">{deposit.method}</div>
                          <div className="text-xs text-gray-500 font-mono">{deposit.transaction_id || deposit.deposit_id}</div>
                        </div>
                        <div className="text-right">
                          <Badge className={deposit.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}>
                            {deposit.status}
                          </Badge>
                          <div className="text-neon-green font-bold mt-1">+${deposit.amount?.toFixed(2)}</div>
                          {deposit.bonus_amount > 0 && (
                            <div className="text-xs text-cyber-purple">+${deposit.bonus_amount?.toFixed(2)} bonus</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Low Balance Providers Alert */}
        {data?.low_balance_providers?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
            <Card className="glass p-4 border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-400" size={24} />
                <div>
                  <h4 className="text-red-400 font-bold">Low Balance Providers</h4>
                  <p className="text-gray-400 text-sm">
                    {data.low_balance_providers.map(p => p.name).join(', ')} - Please top up!
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
