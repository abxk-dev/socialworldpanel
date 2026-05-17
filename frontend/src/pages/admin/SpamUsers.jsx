import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  Ban,
  CheckCircle,
  Eye,
  RefreshCw,
  Wifi,
  Users,
  X,
} from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

function alertId(a) {
  if (a == null) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object' && a.$oid) return a.$oid;
  return String(a._id || a.id || '');
}

const defaultStats = {
  suspicious_users: 0,
  open_alerts: 0,
  banned_users: 0,
  high_risk_users: 0,
  last_scan_at: null,
  next_scan_at: null,
};

export default function SpamUsers() {
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [filterType, setFilterType] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginIpDetails, setLoginIpDetails] = useState([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banOptions, setBanOptions] = useState({
    reason: '',
    ban_referrals: false,
    ban_shared_ip_users: false,
    revoke_referral_bonus: false,
  });
  const [total, setTotal] = useState(0);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [stats, setStats] = useState(defaultStats);
  const [scanHistory, setScanHistory] = useState([]);
  const [countdown, setCountdown] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/spam-stats');
      const d = res.data || {};
      setStats({
        suspicious_users: d.suspicious_users ?? defaultStats.suspicious_users,
        open_alerts: d.open_alerts ?? defaultStats.open_alerts,
        banned_users: d.banned_users ?? defaultStats.banned_users,
        high_risk_users: d.high_risk_users ?? defaultStats.high_risk_users,
        last_scan_at: d.last_scan_at ?? null,
        next_scan_at: d.next_scan_at ?? null,
      });
    } catch {
      /* keep previous */
    }
  }, []);

  const fetchScanHistory = useCallback(async () => {
    try {
      const res = await api.get('/admin/spam-scan-history');
      setScanHistory(res.data?.history || []);
    } catch {
      setScanHistory([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, alertsRes] = await Promise.all([
        api.get(`/admin/spam-users?type=${encodeURIComponent(filterType)}`),
        api.get('/admin/spam-alerts?status=open'),
      ]);
      setUsers(usersRes.data?.users || []);
      setTotal(usersRes.data?.total ?? 0);
      setAlerts(alertsRes.data?.alerts || []);
      setAlertsTotal(alertsRes.data?.total ?? 0);
    } catch {
      toast.error('Failed to load spam data');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
    fetchScanHistory();
  }, [fetchStats, fetchScanHistory]);

  useEffect(() => {
    if (!stats.next_scan_at) {
      setCountdown('');
      return undefined;
    }
    const tick = () => {
      const now = new Date();
      const next = new Date(stats.next_scan_at);
      const diff = next.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('Scanning soon…');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hours}h ${mins}m ${secs}s`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [stats.next_scan_at]);

  const runScan = async () => {
    try {
      setScanning(true);
      const res = await api.post('/admin/spam-scan');
      const flagged = res.data?.flagged_users ?? res.data?.totalFlagged ?? 0;
      const groups = res.data?.shared_ip_groups ?? res.data?.sharedIpGroups ?? 0;
      toast.success(`Scan complete: ${flagged} user flags across ${groups} shared-IP groups`);
      await Promise.all([fetchData(), fetchStats(), fetchScanHistory()]);
    } catch {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const viewLoginHistory = async (user) => {
    setSelectedUser(user);
    setShowBanModal(false);
    try {
      const res = await api.get(`/admin/spam-users/${encodeURIComponent(user.user_id)}/login-history`);
      setLoginHistory(res.data?.history || []);
      setLoginIpDetails(res.data?.ip_details || []);
    } catch {
      toast.error('Failed to load history');
      setLoginHistory([]);
      setLoginIpDetails([]);
    }
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    if (!banOptions.reason?.trim()) {
      toast.error('Please enter a ban reason');
      return;
    }
    try {
      const res = await api.post(
        `/admin/spam-users/${encodeURIComponent(selectedUser.user_id)}/ban`,
        banOptions
      );
      toast.success(res.data?.message || 'Banned');
      setShowBanModal(false);
      setSelectedUser(null);
      fetchData();
      fetchStats();
    } catch {
      toast.error('Ban failed');
    }
  };

  const handleUnban = async (userId) => {
    try {
      await api.post(`/admin/spam-users/${encodeURIComponent(userId)}/unban`, {
        reason: 'Manually unbanned by admin',
      });
      toast.success('User unbanned');
      fetchData();
      fetchStats();
    } catch {
      toast.error('Unban failed');
    }
  };

  const dismissAlert = async (id) => {
    const aid = alertId(id);
    if (!aid) return;
    try {
      await api.post(`/admin/spam-alerts/${encodeURIComponent(aid)}/dismiss`);
      toast.success('Alert dismissed');
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to dismiss');
    }
  };

  const getRiskBadge = (level) => {
    if (level === 'high') {
      return (
        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-bold">
          HIGH RISK
        </span>
      );
    }
    if (level === 'medium') {
      return (
        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-bold">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">LOW</span>
    );
  };

  return (
    <AdminLayout title="Spam & referral security">
      <Toaster position="top-right" theme="dark" />
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-white">Spam Users</h1>
              <p className="text-gray-400 text-sm">
                Shared IPs, suspicious logins, referral fraud alerts
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning…' : 'Run IP scan'}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0d1b2e] border border-red-500/20 rounded-xl p-4">
            <div className="text-red-400 text-2xl font-bold">{stats.suspicious_users}</div>
            <div className="text-gray-400 text-sm">Suspicious users</div>
          </div>
          <div className="bg-[#0d1b2e] border border-yellow-500/20 rounded-xl p-4">
            <div className="text-yellow-400 text-2xl font-bold">{stats.open_alerts}</div>
            <div className="text-gray-400 text-sm">Open alerts</div>
          </div>
          <div className="bg-[#0d1b2e] border border-orange-500/20 rounded-xl p-4">
            <div className="text-orange-400 text-2xl font-bold">{stats.banned_users}</div>
            <div className="text-gray-400 text-sm">Banned users</div>
          </div>
          <div className="bg-[#0d1b2e] border border-purple-500/20 rounded-xl p-4">
            <div className="text-purple-400 text-2xl font-bold">{stats.high_risk_users}</div>
            <div className="text-gray-400 text-sm">High risk</div>
          </div>
        </div>

        <div className="bg-[#0d1b2e] border border-blue-500/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
            <span className="text-gray-400 text-sm">Auto IP scan runs every 6 hours</span>
            {stats.last_scan_at && (
              <span className="text-gray-500 text-xs">
                Last scan: {new Date(stats.last_scan_at).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {countdown && (
              <span className="text-blue-400 text-sm font-mono">Next scan in: {countdown}</span>
            )}
            <Button
              type="button"
              onClick={runScan}
              disabled={scanning}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning…' : 'Scan now'}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
          {[
            { id: 'users', label: `Suspicious users (${total})` },
            { id: 'alerts', label: `Alerts (${alertsTotal})` },
            { id: 'history', label: `Scan history (${scanHistory.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <>
            <div className="flex flex-wrap gap-2">
              {['all', 'shared_ip', 'referral_fraud', 'flagged', 'vpn'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filterType === type
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {type.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <div className="bg-[#0d1b2e] border border-white/10 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-4 text-gray-400 text-sm">User</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Risk</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Flags</th>
                    <th className="text-left p-4 text-gray-400 text-sm">IPs</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Shared with</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Status</th>
                    <th className="text-left p-4 text-gray-400 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-gray-400">
                        Loading…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-gray-400">
                        No suspicious users for this filter. Run an IP scan to populate shared-IP flags.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.user_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4">
                          <div className="font-medium text-white">
                            {user.username || user.email?.split('@')[0]}
                          </div>
                          <div className="text-gray-400 text-xs">{user.email}</div>
                          <div className="text-gray-500 text-xs font-mono">{user.user_id}</div>
                        </td>
                        <td className="p-4">{getRiskBadge(user.risk_level)}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {user.ip_flag && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                Shared IP
                              </span>
                            )}
                            {user.referral_fraud_flag && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                Referral fraud
                              </span>
                            )}
                            {user.is_flagged && (
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                Flagged
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-gray-400 text-sm">
                            <Wifi className="w-3 h-3 shrink-0" />
                            {user.known_ips?.length || 0} IPs
                          </div>
                          <div className="text-gray-500 text-xs">Last: {user.last_login_ip || '—'}</div>
                        </td>
                        <td className="p-4">
                          {user.shared_ip_users?.length > 0 ? (
                            <div className="flex items-center gap-1 text-yellow-400 text-sm">
                              <Users className="w-3 h-3 shrink-0" />
                              {user.shared_ip_users.length} users
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          {user.is_banned ? (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                              BANNED
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-blue-500/40 text-blue-400"
                              onClick={() => viewLoginHistory(user)}
                              title="Login / IP history"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {user.is_banned ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-green-500/40 text-green-400"
                                onClick={() => handleUnban(user.user_id)}
                                title="Unban"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-red-500/40 text-red-400"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBanModal(true);
                                }}
                                title="Ban"
                              >
                                <Ban className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No open alerts.</div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alertId(alert)}
                  className={`bg-[#0d1b2e] border rounded-xl p-4 ${
                    alert.severity === 'high' ? 'border-red-500/30' : 'border-yellow-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <AlertTriangle
                        className={`w-5 h-5 mt-0.5 shrink-0 ${
                          alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-white font-medium">
                          {String(alert.alert_type || '').replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="text-gray-400 text-sm mt-1 break-words">{alert.details}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          IP: {alert.ip_address || '—'} •{' '}
                          {alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-gray-400"
                      onClick={() => dismissAlert(alert._id || alert)}
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-[#0d1b2e] border border-white/10 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3 text-gray-400 text-sm">Date / time</th>
                  <th className="text-left p-3 text-gray-400 text-sm">Type</th>
                  <th className="text-right p-3 text-gray-400 text-sm">Flagged users</th>
                  <th className="text-right p-3 text-gray-400 text-sm">New alerts</th>
                  <th className="text-right p-3 text-gray-400 text-sm">IP groups</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-400">
                      No scans recorded yet. Run a scan or wait for the scheduled job.
                    </td>
                  </tr>
                ) : (
                  scanHistory.map((row, idx) => (
                    <tr key={row._id || idx} className="border-t border-white/5">
                      <td className="p-3 text-gray-300 text-sm">
                        {row.scanned_at ? new Date(row.scanned_at).toLocaleString() : '—'}
                      </td>
                      <td className="p-3 text-gray-400 text-sm capitalize">{row.scan_type || 'auto'}</td>
                      <td className="p-3 text-right text-gray-300">{row.flagged_users ?? '—'}</td>
                      <td className="p-3 text-right text-gray-300">{row.new_alerts ?? '—'}</td>
                      <td className="p-3 text-right text-gray-300">{row.shared_ip_groups ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedUser && !showBanModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10050] p-4">
            <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg pr-4">Login history: {selectedUser.email}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-2">
                {loginHistory.map((h, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white/5 rounded-lg p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-white text-sm font-mono">{h.ip_address}</div>
                      <div className="text-gray-400 text-xs truncate">
                        {h.is_suspicious ? '⚠ Suspicious UA heuristic · ' : ''}
                        {(h.user_agent || '').slice(0, 80)}
                        {(h.user_agent || '').length > 80 ? '…' : ''}
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs sm:text-right shrink-0">
                      {h.logged_in_at ? new Date(h.logged_in_at).toLocaleString() : '—'}
                    </div>
                  </div>
                ))}
                {loginHistory.length === 0 && (
                  <div className="text-center text-gray-400 py-4">No login history recorded yet.</div>
                )}
              </div>
              {loginIpDetails.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <h4 className="text-white text-sm font-medium mb-2">Shared IP check</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {loginIpDetails.map((d) => (
                      <div key={d.ip} className="text-xs text-gray-400 flex justify-between gap-2">
                        <span className="font-mono text-gray-300">{d.ip}</span>
                        <span>{d.is_shared ? `${d.other_users?.length || 0} other account(s)` : 'No overlap'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button
                type="button"
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowBanModal(true)}
              >
                Ban this user
              </Button>
            </div>
          </div>
        )}

        {showBanModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10060] p-4">
            <div className="bg-[#0d1b2e] border border-red-500/30 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <Ban className="w-6 h-6 text-red-400" />
                <h3 className="text-white font-bold text-lg">Ban user</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-400 text-sm">Ban reason *</Label>
                  <Input
                    value={banOptions.reason}
                    onChange={(e) => setBanOptions((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Referral fraud, shared IP abuse…"
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-gray-400 text-sm">Additional actions</Label>
                  {[
                    { key: 'ban_referrals', label: 'Also ban users referred by this account' },
                    { key: 'ban_shared_ip_users', label: 'Also ban users sharing the same IPs' },
                    { key: 'revoke_referral_bonus', label: 'Revoke referral bonuses (loyalty_transactions)' },
                  ].map((opt) => (
                    <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={banOptions[opt.key]}
                        onCheckedChange={(v) =>
                          setBanOptions((p) => ({ ...p, [opt.key]: v === true }))
                        }
                      />
                      <span className="text-gray-300 text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20 text-gray-300"
                    onClick={() => {
                      setShowBanModal(false);
                      setSelectedUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleBan}>
                    Confirm ban
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
