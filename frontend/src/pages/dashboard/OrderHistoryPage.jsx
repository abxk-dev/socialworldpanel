import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, RefreshCw, ExternalLink } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const OrderHistoryPage = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await axios.get(`${API}/orders?${params}`, { headers, withCredentials: true });
      setOrders(response.data.orders || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, token]);

  const handleRefill = async (orderId) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API}/orders/${orderId}/refill`, {}, { headers, withCredentials: true });
      toast.success(`Refill order created: ${response.data.order_id}`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Refill failed');
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

  const filteredOrders = orders.filter(order => 
    search ? order.service_name.toLowerCase().includes(search.toLowerCase()) || order.order_id.includes(search) : true
  );

  return (
    <DashboardLayout title="Order History">
      <Toaster position="top-right" theme="dark" />
      
      <div className="space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or service..."
              className="pl-10 bg-deep-navy border-white/10"
              data-testid="orders-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-deep-navy border-white/10" data-testid="orders-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchOrders} className="border-white/10" data-testid="orders-refresh">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </motion.div>

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No orders found
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left p-4 text-gray-400 font-medium">Order ID</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Service</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Link</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Quantity</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Charge</th>
                        <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.order_id} className="border-t border-white/5 hover:bg-white/5">
                          <td className="p-4">
                            <span className="font-mono text-sm text-gray-300">{order.order_id}</span>
                          </td>
                          <td className="p-4 max-w-[200px]">
                            <span className="text-white truncate block">{order.service_name}</span>
                          </td>
                          <td className="p-4 max-w-[150px]">
                            <a 
                              href={order.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-electric-blue hover:underline flex items-center gap-1 truncate"
                            >
                              <ExternalLink size={14} />
                              <span className="truncate">{order.link}</span>
                            </a>
                          </td>
                          <td className="p-4 text-right text-gray-400">{order.quantity.toLocaleString()}</td>
                          <td className="p-4">
                            <Badge className={`${getStatusClass(order.status)} capitalize`}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-4 text-right text-electric-blue font-bold">${order.charge?.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            {order.status === 'completed' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleRefill(order.order_id)}
                                className="border-neon-green/30 text-neon-green hover:bg-neon-green/10"
                                data-testid={`refill-${order.order_id}`}
                              >
                                Refill
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="border-white/10"
                      >
                        Previous
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="border-white/10"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default OrderHistoryPage;
