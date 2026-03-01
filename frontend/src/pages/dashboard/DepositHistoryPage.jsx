import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const DepositHistoryPage = () => {
  const { token } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/deposits?page=${page}&limit=20`, { headers, withCredentials: true });
      setDeposits(response.data.deposits || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      toast.error('Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [page, token]);

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      completed: 'status-completed',
      failed: 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <DashboardLayout title="Deposit History">
      <Toaster position="top-right" theme="dark" />
      
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button variant="outline" onClick={fetchDeposits} className="border-white/10" data-testid="deposits-refresh">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </motion.div>

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
            ) : deposits.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No deposits yet
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Transaction ID</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Method</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.map((deposit) => (
                        <tr key={deposit.deposit_id} className="border-t border-white/5 hover:bg-white/5">
                          <td className="p-4 text-gray-400 text-sm">{formatDate(deposit.created_at)}</td>
                          <td className="p-4">
                            <span className="font-mono text-sm text-gray-300">{deposit.transaction_id || deposit.deposit_id}</span>
                          </td>
                          <td className="p-4 text-white capitalize">{deposit.method}</td>
                          <td className="p-4">
                            <Badge className={`${getStatusClass(deposit.status)} capitalize`}>
                              {deposit.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right text-neon-green font-bold">+${deposit.amount?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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

export default DepositHistoryPage;
