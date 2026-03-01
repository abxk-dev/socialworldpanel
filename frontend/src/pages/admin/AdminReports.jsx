import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Download, Calendar, DollarSign, ShoppingCart, 
  Users, CreditCard, Loader2, TrendingUp, TrendingDown
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const AdminReports = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [revenueReport, setRevenueReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [ordersReport, setOrdersReport] = useState(null);
  const [paymentsReport, setPaymentsReport] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const getDateParams = () => {
    if (dateRange === 'custom' && customStart && customEnd) {
      return `start_date=${customStart}&end_date=${customEnd}`;
    }
    const end = new Date().toISOString();
    const start = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();
    return `start_date=${start}&end_date=${end}`;
  };

  const fetchRevenueReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reports/revenue?${getDateParams()}`, { headers, withCredentials: true });
      setRevenueReport(res.data);
    } catch (error) {
      toast.error('Failed to fetch revenue report');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reports/profit?${getDateParams()}`, { headers, withCredentials: true });
      setProfitReport(res.data);
    } catch (error) {
      toast.error('Failed to fetch profit report');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reports/orders?${getDateParams()}`, { headers, withCredentials: true });
      setOrdersReport(res.data);
    } catch (error) {
      toast.error('Failed to fetch orders report');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentsReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reports/payments?${getDateParams()}`, { headers, withCredentials: true });
      setPaymentsReport(res.data);
    } catch (error) {
      toast.error('Failed to fetch payments report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueReport();
  }, [token]);

  const exportCSV = async (reportType) => {
    try {
      window.open(`${API}/admin/reports/${reportType}/export?${getDateParams()}`, '_blank');
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-deep-navy/95 border border-cyber-purple/30 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {typeof entry.value === 'number' ? (entry.name.includes('$') ? `$${entry.value.toFixed(2)}` : entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ label, value, icon: Icon, color, subtext }) => (
    <Card className="glass p-4 border-cyber-purple/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          <p className={`text-xl font-exo font-bold ${color}`}>{value}</p>
          {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color.replace('text-', '')}/10`}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </Card>
  );

  return (
    <AdminLayout title="Reports">
      <div className="space-y-6">
        {/* Date Range Filter */}
        <Card className="glass p-4 border-cyber-purple/20">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={customStart} 
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={customEnd} 
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="revenue" onClick={fetchRevenueReport} className="data-[state=active]:bg-cyber-purple">Revenue</TabsTrigger>
            <TabsTrigger value="profit" onClick={fetchProfitReport} className="data-[state=active]:bg-cyber-purple">Profit</TabsTrigger>
            <TabsTrigger value="orders" onClick={fetchOrdersReport} className="data-[state=active]:bg-cyber-purple">Orders</TabsTrigger>
            <TabsTrigger value="payments" onClick={fetchPaymentsReport} className="data-[state=active]:bg-cyber-purple">Payments</TabsTrigger>
          </TabsList>

          {/* Revenue Report */}
          <TabsContent value="revenue" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : revenueReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-exo font-bold text-white">Revenue Report</h3>
                  <Button onClick={() => exportCSV('revenue')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="Total Revenue" value={`$${revenueReport.summary.total_revenue.toFixed(2)}`} icon={DollarSign} color="text-neon-green" />
                  <StatCard label="Total Cost" value={`$${revenueReport.summary.total_cost.toFixed(2)}`} icon={TrendingDown} color="text-red-400" />
                  <StatCard label="Total Profit" value={`$${revenueReport.summary.total_profit.toFixed(2)}`} icon={TrendingUp} color="text-emerald-400" />
                  <StatCard label="Profit Margin" value={`${revenueReport.summary.profit_margin.toFixed(1)}%`} icon={BarChart3} color="text-cyber-purple" />
                  <StatCard label="Total Orders" value={revenueReport.summary.total_orders} icon={ShoppingCart} color="text-electric-blue" />
                </div>

                <Card className="glass p-6 border-cyber-purple/20">
                  <h4 className="text-white font-bold mb-4">Revenue Trend</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueReport.by_day}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="$ Revenue" stroke="#8B5CF6" strokeWidth={2} />
                        <Line type="monotone" dataKey="profit" name="$ Profit" stroke="#10B981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {revenueReport.by_payment_method.length > 0 && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Revenue by Payment Method</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={revenueReport.by_payment_method} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={80} label>
                            {revenueReport.by_payment_method.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Profit Report */}
          <TabsContent value="profit" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : profitReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-exo font-bold text-white">Profit Report</h3>
                  <Button onClick={() => exportCSV('profit')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Gross Revenue" value={`$${profitReport.summary.gross_revenue.toFixed(2)}`} icon={DollarSign} color="text-neon-green" />
                  <StatCard label="Provider Costs" value={`$${profitReport.summary.provider_costs.toFixed(2)}`} icon={TrendingDown} color="text-red-400" />
                  <StatCard label="Net Profit" value={`$${profitReport.summary.net_profit.toFixed(2)}`} icon={TrendingUp} color="text-emerald-400" />
                  <StatCard label="Profit Margin" value={`${profitReport.summary.profit_margin.toFixed(1)}%`} icon={BarChart3} color="text-cyber-purple" />
                </div>

                <Card className="glass p-6 border-cyber-purple/20">
                  <h4 className="text-white font-bold mb-4">Profit Trend</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitReport.by_day}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="gross" name="$ Gross" fill="#8B5CF6" />
                        <Bar dataKey="net" name="$ Net Profit" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {profitReport.top_profitable_services.length > 0 && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Top Profitable Services</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-cyber-purple/20">
                          <TableHead className="text-gray-400">Service</TableHead>
                          <TableHead className="text-gray-400">Orders</TableHead>
                          <TableHead className="text-gray-400">Revenue</TableHead>
                          <TableHead className="text-gray-400">Cost</TableHead>
                          <TableHead className="text-gray-400">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profitReport.top_profitable_services.map((svc, i) => (
                          <TableRow key={i} className="border-cyber-purple/10">
                            <TableCell className="text-white">{svc.service}</TableCell>
                            <TableCell className="text-gray-400">{svc.orders}</TableCell>
                            <TableCell className="text-electric-blue">${svc.revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-red-400">${svc.cost.toFixed(2)}</TableCell>
                            <TableCell className="text-neon-green font-bold">${svc.profit.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Orders Report */}
          <TabsContent value="orders" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : ordersReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-exo font-bold text-white">Orders Report</h3>
                  <Button onClick={() => exportCSV('orders')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="Total Orders" value={ordersReport.summary.total_orders} icon={ShoppingCart} color="text-electric-blue" />
                  {Object.entries(ordersReport.summary.by_status || {}).map(([status, count]) => (
                    <StatCard key={status} label={status.charAt(0).toUpperCase() + status.slice(1)} value={count} icon={ShoppingCart} color={status === 'completed' ? 'text-emerald-400' : status === 'failed' ? 'text-red-400' : 'text-yellow-400'} />
                  ))}
                </div>

                <Card className="glass p-6 border-cyber-purple/20">
                  <h4 className="text-white font-bold mb-4">Orders by Day</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersReport.by_day}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="orders" name="Orders" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {ordersReport.top_services.length > 0 && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Top Services by Volume</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersReport.top_services} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis type="number" stroke="#9CA3AF" fontSize={10} />
                          <YAxis dataKey="service" type="category" stroke="#9CA3AF" fontSize={10} width={150} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Orders" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Payments Report */}
          <TabsContent value="payments" className="mt-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyber-purple" size={32} /></div>
            ) : paymentsReport && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-exo font-bold text-white">Payments Report</h3>
                  <Button onClick={() => exportCSV('payments')} variant="outline" className="border-white/10">
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Deposits" value={paymentsReport.summary.total_deposits} icon={CreditCard} color="text-electric-blue" />
                  <StatCard label="Total Amount" value={`$${paymentsReport.summary.total_amount.toFixed(2)}`} icon={DollarSign} color="text-neon-green" />
                  <StatCard label="Total Bonus" value={`$${paymentsReport.summary.total_bonus.toFixed(2)}`} icon={TrendingUp} color="text-cyber-purple" />
                  <StatCard label="Total Credited" value={`$${paymentsReport.summary.total_credited.toFixed(2)}`} icon={DollarSign} color="text-emerald-400" />
                </div>

                {paymentsReport.by_method.length > 0 && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Deposits by Payment Method</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-cyber-purple/20">
                          <TableHead className="text-gray-400">Method</TableHead>
                          <TableHead className="text-gray-400">Count</TableHead>
                          <TableHead className="text-gray-400">Amount</TableHead>
                          <TableHead className="text-gray-400">Bonus Given</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsReport.by_method.map((m, i) => (
                          <TableRow key={i} className="border-cyber-purple/10">
                            <TableCell className="text-white capitalize">{m.method}</TableCell>
                            <TableCell className="text-gray-400">{m.count}</TableCell>
                            <TableCell className="text-neon-green">${m.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-cyber-purple">${m.bonus.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}

                {paymentsReport.recent_deposits.length > 0 && (
                  <Card className="glass p-6 border-cyber-purple/20">
                    <h4 className="text-white font-bold mb-4">Recent Deposits</h4>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-cyber-purple/20">
                            <TableHead className="text-gray-400">ID</TableHead>
                            <TableHead className="text-gray-400">User</TableHead>
                            <TableHead className="text-gray-400">Amount</TableHead>
                            <TableHead className="text-gray-400">Bonus</TableHead>
                            <TableHead className="text-gray-400">Method</TableHead>
                            <TableHead className="text-gray-400">Status</TableHead>
                            <TableHead className="text-gray-400">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentsReport.recent_deposits.slice(0, 20).map((d) => (
                            <TableRow key={d.deposit_id} className="border-cyber-purple/10">
                              <TableCell className="text-gray-400 font-mono text-xs">{d.deposit_id}</TableCell>
                              <TableCell className="text-gray-400 font-mono text-xs">{d.user_id?.slice(0, 15)}...</TableCell>
                              <TableCell className="text-neon-green">${d.amount?.toFixed(2)}</TableCell>
                              <TableCell className="text-cyber-purple">${d.bonus_amount?.toFixed(2)}</TableCell>
                              <TableCell className="text-white capitalize">{d.method}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${d.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                  {d.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-gray-400 text-xs">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
