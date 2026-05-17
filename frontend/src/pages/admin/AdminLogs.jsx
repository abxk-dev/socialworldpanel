import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Toaster } from '../../components/ui/sonner';
import { toast } from 'sonner';

const AdminLogs = () => {
  const { token, permissions } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('all');
  const [riskLevel, setRiskLevel] = useState('all');

  useEffect(() => {
    if (!permissions?.canViewLogs) return;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (search.trim()) params.append('search', search.trim());
        if (actionType !== 'all') params.append('action_type', actionType);
        if (riskLevel !== 'all') params.append('risk_level', riskLevel);
        const res = await api.get(`/admin/logs?${params.toString()}`, { headers, withCredentials: true });
        setLogs(res.data?.logs || []);
        setTotalPages(res.data?.pages || 1);
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, token, permissions, search, actionType, riskLevel]);

  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  if (!permissions?.canViewLogs) {
    return (
      <AdminLayout title="Activity Logs">
        <Toaster position="top-right" theme="dark" />
        <Card className="glass p-6 border-red-500/40">
          <p className="text-red-300 text-sm">
            Only Main Admin can view activity logs. Your current role does not have access.
          </p>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Activity Logs">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        <form
          className="flex flex-wrap gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, admin or target..."
            className="flex-1 min-w-[200px] bg-deep-navy border-white/10"
          />
          <Select value={actionType} onValueChange={(v) => { setActionType(v); setPage(1); }}>
            <SelectTrigger className="w-48 bg-deep-navy border-white/10">
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="USER_ROLE_CHANGED">User role changes</SelectItem>
              <SelectItem value="UNAUTHORIZED_ACCESS_ATTEMPT">Unauthorized attempts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskLevel} onValueChange={(v) => { setRiskLevel(v); setPage(1); }}>
            <SelectTrigger className="w-40 bg-deep-navy border-white/10">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent className="bg-deep-navy border-white/10">
              <SelectItem value="all">All risks</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="bg-cyber-purple text-white">
            Apply
          </Button>
        </form>

        <Card className="glass overflow-hidden border-cyber-purple/20">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-cyber-purple/10 text-gray-300">
                    <tr>
                      <th className="p-3 text-left">Time</th>
                      <th className="p-3 text-left">Admin</th>
                      <th className="p-3 text-left">Action</th>
                      <th className="p-3 text-left">Target</th>
                      <th className="p-3 text-left">Risk</th>
                      <th className="p-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td className="p-4 text-center text-gray-500" colSpan={6}>
                          No activity logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr key={`${log.created_at || ''}-${idx}`} className="border-t border-white/5 hover:bg-white/5">
                          <td className="p-3 text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                          <td className="p-3">
                            <div className="text-white text-xs font-medium">
                              {log.admin_username || log.admin_email || log.admin_id || '—'}
                            </div>
                            {log.admin_role && (
                              <div className="text-[11px] text-gray-400 uppercase tracking-wide">
                                {log.admin_role}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-cyan-300 font-mono text-xs">{log.action_type}</div>
                            <div className="text-[11px] text-gray-500">{log.action_category}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-white text-xs">{log.target_name || '—'}</div>
                            {log.target_type && (
                              <div className="text-[11px] text-gray-500">
                                {log.target_type} {log.target_id ? `#${log.target_id}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                log.risk_level === 'critical'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : log.risk_level === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-white/10 text-gray-200 border border-white/20'
                              }`}
                            >
                              {log.risk_level || 'info'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300 max-w-[340px]">
                            <div className="text-xs whitespace-pre-wrap break-words">
                              {log.action_description || '—'}
                            </div>
                            {log.ip && (
                              <div className="text-[11px] text-gray-500 mt-1">IP: {log.ip}</div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex justify-between items-center text-xs text-gray-400">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="border-white/10"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
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
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;

