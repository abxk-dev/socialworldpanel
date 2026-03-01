import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, ExternalLink } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const AdminOrders = () => {
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
      
      const response = await axios.get(`${API}/admin/orders?${params}`, { headers, withCredentials: true });
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

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API}/admin/orders/${orderId}`, { status: newStatus }, { headers, withCredentials: true });
      toast.success('Order updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
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
    search ? order.order_id.includes(search) || order.service_name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <AdminLayout title="Order Management">
      <Toaster position="top-right" theme="dark" />
      
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or service..."
              className="pl-10 bg-deep-navy border-white/10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-deep-navy border-white/10">
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
          <Button variant="outline" onClick={fetchOrders} className="border-white/10">
            <RefreshCw size={16} className="mr-2" />
            Refresh
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-cyber-purple/10">
                    <tr>
                      <th className="text-left p-4 text-gray-400 font-medium">Order ID</th>
                      <th className="text-left p-4 text-gray-400 font-medium">User</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Service</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Link</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Qty</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.order_id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <span className="font-mono text-sm text-gray-300">{order.order_id}</span>
                        </td>
                        <td className="p-4 text-gray-400">{order.user_id}</td>
                        <td className="p-4">
                          <span className="text-white truncate block max-w-[200px]">{order.service_name}</span>
                        </td>
                        <td className="p-4">
                          <a 
                            href={order.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-electric-blue hover:underline flex items-center gap-1 max-w-[150px] truncate"
                          >
                            <ExternalLink size={12} />
                            <span className="truncate">{order.link}</span>
                          </a>
                        </td>
                        <td className="p-4 text-right text-gray-400">{order.quantity.toLocaleString()}</td>
                        <td className="p-4">
                          <Select value={order.status} onValueChange={(val) => handleStatusChange(order.order_id, val)}>
                            <SelectTrigger className="w-32 bg-transparent border-none p-0 h-auto">
                              <Badge className={`${getStatusClass(order.status)} capitalize cursor-pointer`}>
                                {order.status.replace('_', ' ')}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent className="bg-deep-navy border-white/10">
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4 text-right text-electric-blue font-bold">${order.charge?.toFixed(2)}</td>
                      </tr>
                    ))}
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
    </AdminLayout>
  );
};

export default AdminOrders;
