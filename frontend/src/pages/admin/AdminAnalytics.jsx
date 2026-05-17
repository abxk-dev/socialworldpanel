import React, { useState, useEffect } from 'react';
import { BarChart3, Loader2, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/card';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const AdminAnalytics = () => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await api.get('/admin/dashboard/charts', { headers, withCredentials: true });
        setCharts(res.data || {});
      } catch (e) {
        console.error('Analytics fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCharts();
  }, [token]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-deep-navy/95 border border-cyber-purple/30 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {typeof entry.value === 'number' && (entry.name.includes('$') || entry.name.includes('Revenue') || entry.name.includes('Profit')) ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <AdminLayout title="Analytics">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-cyber-purple animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const revenueByDay = charts?.revenue_by_day || [];
  const usersByDay = charts?.users_by_day || [];
  const ordersByStatus = charts?.orders_by_status || [];
  const revenueByMethod = charts?.revenue_by_method || [];
  const topServices = charts?.top_services || [];

  return (
    <AdminLayout title="Analytics Dashboard">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Calendar className="h-4 w-4" />
          Last 30 days
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass p-6 border-cyber-purple/20">
            <h3 className="font-exo font-bold text-white mb-4">Revenue & Profit Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="glass p-6 border-cyber-purple/20">
            <h3 className="font-exo font-bold text-white mb-4">Orders Per Day</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="orders" name="Orders" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass p-6 border-cyber-purple/20">
            <h3 className="font-exo font-bold text-white mb-4">New Users Per Day</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="users" name="New Users" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="glass p-6 border-cyber-purple/20">
            <h3 className="font-exo font-bold text-white mb-4">Orders by Status</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {ordersByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v) => [v, 'Orders']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass p-6 border-cyber-purple/20">
            <h3 className="font-exo font-bold text-white mb-4">Revenue by Payment Method</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByMethod}
                    dataKey="amount"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ method, amount }) => `${method}: ${formatPrice(amount)}`}
                  >
                    {revenueByMethod.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v) => [formatPrice(v), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="glass p-6 border-cyber-purple/20">
            <h3 className="font-exo font-bold text-white mb-4">Top Services by Order Count</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="orders" name="Orders" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
