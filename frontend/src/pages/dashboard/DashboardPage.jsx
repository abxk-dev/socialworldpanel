import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Clock, CheckCircle, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import axios from 'axios';

const DashboardPage = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({ total_orders: 0, pending_orders: 0, completed_orders: 0, balance: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [statsRes, ordersRes] = await Promise.all([
          axios.get(`${API}/user/stats`, { headers, withCredentials: true }),
          axios.get(`${API}/orders?limit=5`, { headers, withCredentials: true })
        ]);
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data.orders || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const statCards = [
    { label: 'Balance', value: `$${stats.balance?.toFixed(2) || '0.00'}`, icon: DollarSign, color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
    { label: 'Total Orders', value: stats.total_orders, icon: ShoppingCart, color: 'text-electric-blue', bgColor: 'bg-electric-blue/10' },
    { label: 'Pending', value: stats.pending_orders, icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
    { label: 'Completed', value: stats.completed_orders, icon: CheckCircle, color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
  ];

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
      <div className="space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-exo font-bold text-white mb-2">
                Welcome back, <span className="neon-text">{user?.name}</span>!
              </h2>
              <p className="text-gray-400">Ready to grow your social media presence?</p>
            </div>
            <Link to="/dashboard/new-order">
              <Button className="bg-neon-green hover:bg-neon-green/90 text-black font-bold" data-testid="dashboard-new-order">
                <ShoppingCart size={18} className="mr-2" />
                Place New Order
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="glass p-6 hover:border-electric-blue/30 transition-all" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                    <p className={`text-2xl md:text-3xl font-exo font-bold ${stat.color}`}>
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon size={24} className={stat.color} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
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
                        <h3 className="font-bold text-white">{action.title}</h3>
                        <p className="text-sm text-gray-500">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-gray-500 group-hover:text-electric-blue transition-colors" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-exo font-bold text-white text-lg">Recent Orders</h3>
              <Link to="/dashboard/orders" className="text-electric-blue hover:underline text-sm">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No orders yet. Place your first order!</p>
                <Link to="/dashboard/new-order">
                  <Button className="mt-4 bg-electric-blue text-black">Place Order</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left p-4 text-gray-400 font-medium">Order ID</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Service</th>
                      <th className="text-left p-4 text-gray-400 font-medium hidden md:table-cell">Quantity</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.order_id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-4 text-gray-300 font-mono text-sm">{order.order_id}</td>
                        <td className="p-4 text-white max-w-[200px] truncate">{order.service_name}</td>
                        <td className="p-4 text-gray-400 hidden md:table-cell">{order.quantity.toLocaleString()}</td>
                        <td className="p-4">
                          <Badge className={`${getStatusClass(order.status)} capitalize`}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4 text-right text-electric-blue font-bold">${order.charge?.toFixed(2)}</td>
                      </tr>
                    ))}
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

export default DashboardPage;
