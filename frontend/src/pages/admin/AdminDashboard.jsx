import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, ShoppingCart, Clock, TrendingUp } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import axios from 'axios';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState({
    total_users: 0,
    total_orders: 0,
    pending_orders: 0,
    total_revenue: 0,
    recent_orders: [],
    recent_deposits: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API}/admin/dashboard`, { headers, withCredentials: true });
        setData(response.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const stats = [
    { label: 'Total Revenue', value: `$${data.total_revenue?.toFixed(2) || '0.00'}`, icon: DollarSign, color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
    { label: 'Total Users', value: data.total_users, icon: Users, color: 'text-electric-blue', bgColor: 'bg-electric-blue/10' },
    { label: 'Total Orders', value: data.total_orders, icon: ShoppingCart, color: 'text-cyber-purple', bgColor: 'bg-cyber-purple/10' },
    { label: 'Pending', value: data.pending_orders, icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
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
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="glass p-6 border-cyber-purple/20" data-testid={`admin-stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass overflow-hidden border-cyber-purple/20">
              <div className="p-4 border-b border-cyber-purple/20 flex justify-between items-center">
                <h3 className="font-exo font-bold text-white">Recent Orders</h3>
                <TrendingUp className="text-cyber-purple" size={20} />
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-cyber-purple border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : data.recent_orders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No orders yet</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {data.recent_orders.slice(0, 5).map((order) => (
                    <div key={order.order_id} className="p-4 hover:bg-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium truncate max-w-[200px]">{order.service_name}</div>
                          <div className="text-xs text-gray-500 font-mono">{order.order_id}</div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${getStatusClass(order.status)} capitalize`}>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass overflow-hidden border-cyber-purple/20">
              <div className="p-4 border-b border-cyber-purple/20 flex justify-between items-center">
                <h3 className="font-exo font-bold text-white">Recent Deposits</h3>
                <DollarSign className="text-neon-green" size={20} />
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : data.recent_deposits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No deposits yet</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {data.recent_deposits.slice(0, 5).map((deposit) => (
                    <div key={deposit.deposit_id} className="p-4 hover:bg-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium capitalize">{deposit.method}</div>
                          <div className="text-xs text-gray-500 font-mono">{deposit.transaction_id || deposit.deposit_id}</div>
                        </div>
                        <div className="text-right">
                          <Badge className={deposit.status === 'completed' ? 'status-completed' : 'status-pending'}>
                            {deposit.status}
                          </Badge>
                          <div className="text-neon-green font-bold mt-1">+${deposit.amount?.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
