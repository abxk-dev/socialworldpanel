import React, { useState, useEffect } from 'react';
import { RefreshCw, RotateCcw, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { toast } from 'sonner';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const AdminRefills = () => {
  const { token } = useAuth();
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [retryingId, setRetryingId] = useState(null);

  const fetchRefills = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ page, limit: 50 });
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/admin/refills?${params}`, { headers, withCredentials: true });
      const data = res.data;
      setRefills(Array.isArray(data.refills) ? data.refills : []);
      setTotal(Number(data.total) || 0);
      setPages(Math.max(1, Number(data.pages) || 1));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load refills');
      setRefills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefills();
  }, [page, statusFilter, token]);

  const hasActive = refills.some((r) => r.status === 'pending' || r.status === 'processing');
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(fetchRefills, 30000);
    return () => clearInterval(t);
  }, [hasActive, page, statusFilter, token]);

  const refillId = (r) => (typeof r._id === 'string' ? r._id : r._id?.toString?.()) || r.order_id;
  const handleRetry = async (refill) => {
    const id = refillId(refill);
    setRetryingId(id);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post(`/admin/refills/${id}/retry`, {}, { headers, withCredentials: true });
      toast.success('Refill retry sent');
      fetchRefills();
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.detail || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '—');
  const cooldownEnds = (r) => {
    if (!r.last_requested_at) return '—';
    const end = new Date(r.last_requested_at).getTime() + 24 * 60 * 60 * 1000;
    return new Date(end).toLocaleString();
  };

  const statusClass = (s) => {
    switch (s) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'completed': return 'bg-neon-green/20 text-neon-green';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <AdminLayout title="Refill Requests">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.value ? 'bg-cyber-purple text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="glass overflow-hidden border-cyber-purple/20">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-cyber-purple" size={32} />
            </div>
          ) : refills.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No refill requests found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-cyber-purple/10">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">User</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Service</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Order ID</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Attempt #</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Provider Refill ID</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Last Requested</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Cooldown Ends</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {refills.map((r) => (
                    <tr key={refillId(r)} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <span className="text-white font-medium">{r.user_email || r.user_id || '—'}</span>
                      </td>
                      <td className="p-4 text-gray-300">{r.service_name || r.service_id || '—'}</td>
                      <td className="p-4 font-mono text-sm text-gray-400">{r.order_id || '—'}</td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className="border-cyber-purple/40 text-cyber-purple">#{r.attempt || 1}</Badge>
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-400">{r.provider_refill_id || '—'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs capitalize ${statusClass(r.status)}`}>
                          {r.status || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{formatDate(r.last_requested_at)}</td>
                      <td className="p-4 text-gray-500 text-sm">{cooldownEnds(r)}</td>
                      <td className="p-4 text-center">
                        {r.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(r)}
                            disabled={retryingId === refillId(r)}
                            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                          >
                            {retryingId === refillId(r) ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <><RotateCcw size={14} className="mr-1" />Retry</>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="p-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-gray-500 text-sm">Page {page} of {pages} • {total} total</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-white/10">Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="border-white/10">Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRefills;
