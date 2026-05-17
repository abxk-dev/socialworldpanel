import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Edit,
  UserX,
  UserCheck,
  DollarSign,
  MapPin,
  MoreVertical,
  Lock,
  LogIn,
  MessageCircle,
  Wifi,
  SlidersHorizontal,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Switch } from '../../components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import { API } from '../../config';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import api from '../../lib/axios';
import BulkActionsBar from '../../components/admin/BulkActionsBar';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useCurrency } from '../../context/CurrencyContext';

// Shared role badge used in table and modals
const RoleBadge = ({ role }) => {
  const config = {
    user:       { icon: '👤', label: 'User',       color: '#64748b' },
    support:    { icon: '🎧', label: 'Support',    color: '#10b981' },
    admin:      { icon: '🔧', label: 'Admin',      color: '#3b82f6' },
    main_admin: { icon: '👑', label: 'Main Admin', color: '#f59e0b' }
  };
  const key = role && config[role] ? role : 'user';
  const { icon, label, color } = config[key];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
};

const roleOptions = [
  {
    value: 'user',
    title: '👤 User (Default)',
    description: 'Regular platform user. Can buy services but no admin access.',
  },
  {
    value: 'support',
    title: '🎧 Support',
    description: 'Can view tickets, users & orders. Limited read-only admin access.',
  },
  {
    value: 'admin',
    title: '🔧 Admin',
    description: 'Full admin panel access except logs and some financial controls.',
  },
  {
    value: 'main_admin',
    title: '👑 Main Admin (Super Admin)',
    description: 'Complete access including logs, financials and team management.',
  },
];

const AdminUsers = () => {
  const { token, user: currentUser, permissions } = useAuth();
  const { formatPrice } = useCurrency();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sameIpFilter, setSameIpFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [signupFilter, setSignupFilter] = useState('all');
  const [joinedAfter, setJoinedAfter] = useState('');
  const [joinedBefore, setJoinedBefore] = useState('');
  const [balanceMin, setBalanceMin] = useState('');
  const [balanceMax, setBalanceMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterTick, setFilterTick] = useState(0);
  const [countries, setCountries] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [hiddenServicesConfig, setHiddenServicesConfig] = useState({ hidden_service_ids: [], hidden_access: {} });
  const [allServices, setAllServices] = useState([]);
  const [hiddenServicesSearch, setHiddenServicesSearch] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [editRole, setEditRole] = useState('user');
  const initialEditRoleRef = useRef('user');
  const bulk = useBulkSelection();
  const canSetUserPassword = !!permissions?.canManageUsers;

  const flagFromCode = (code) => {
    if (!code || code.length !== 2) return '';
    return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  };

  /** Merge nested `location` and legacy/top-level geo fields so the table always shows country when stored anywhere. */
  const normalizeUserLocation = (user) => {
    const loc = user?.location && typeof user.location === 'object' ? user.location : {};
    const countryName =
      (typeof loc.country === 'string' && loc.country.trim()) ||
      (typeof loc.country_name === 'string' && loc.country_name.trim()) ||
      (typeof user?.country_name === 'string' && user.country_name.trim()) ||
      (typeof user?.country === 'string' && user.country.trim()) ||
      '';
    const codeRaw = loc.country_code || user?.country_code || user?.countryCode || '';
    const countryCode = String(codeRaw).trim().toUpperCase().slice(0, 2);
    const city =
      (typeof loc.city === 'string' && loc.city.trim()) ||
      (typeof user?.city === 'string' && user.city.trim()) ||
      '';
    const region =
      (typeof loc.region === 'string' && loc.region.trim()) ||
      (typeof user?.region === 'string' && user.region.trim()) ||
      '';
    let primary = '';
    if (countryName) {
      primary = countryName + (city ? ` • ${city}` : '');
    } else if (countryCode) {
      primary = countryCode + (city ? ` • ${city}` : '');
    } else if (city) {
      primary = city;
    }
    return { countryName, countryCode, city, region, primary };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (countryFilter && countryFilter !== 'all') params.append('country', countryFilter);
      if (sameIpFilter) params.append('same_ip', sameIpFilter);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (signupFilter && signupFilter !== 'all') params.append('signup', signupFilter);
      if (joinedAfter) params.append('joined_after', joinedAfter);
      if (joinedBefore) params.append('joined_before', joinedBefore);
      if (balanceMin !== '' && balanceMin != null) params.append('balance_min', String(balanceMin));
      if (balanceMax !== '' && balanceMax != null) params.append('balance_max', String(balanceMax));

      const response = await api.get(`/admin/users?${params}`, { headers, withCredentials: true });
      setUsers(response.data.users || []);
      setTotalPages(response.data.pages || 1);
      if (response.data.countries) setCountries(response.data.countries);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [
    page,
    token,
    countryFilter,
    sameIpFilter,
    roleFilter,
    statusFilter,
    signupFilter,
    joinedAfter,
    joinedBefore,
    balanceMin,
    balanceMax,
    filterTick,
  ]);

  useEffect(() => {
    if (!editOpen || !token) return;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      api.get('/admin/hidden-services', { headers, withCredentials: true }),
      api.get('/admin/services', { headers, withCredentials: true }),
    ]).then(([hRes, sRes]) => {
      const d = hRes.data;
      setHiddenServicesConfig({
        hidden_service_ids: Array.isArray(d?.hidden_service_ids) ? d.hidden_service_ids : [],
        hidden_access: d && typeof d.hidden_access === 'object' ? d.hidden_access : {},
      });
      setAllServices(Array.isArray(sRes.data) ? sRes.data : []);
    }).catch(() => {});
  }, [editOpen, token]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const resetAdvancedFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSignupFilter('all');
    setJoinedAfter('');
    setJoinedBefore('');
    setBalanceMin('');
    setBalanceMax('');
    setCountryFilter('all');
    setRoleFilter('all');
    setSameIpFilter('');
    setPage(1);
    setFilterTick((t) => t + 1);
  };

  const runBulkAction = async (action) => {
    const ids = bulk.selectedIds;
    if (!ids.length) {
      toast.error('Select at least one user');
      return;
    }
    const label = action === 'suspend' ? 'suspend' : 'activate';
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${ids.length} user(s)?`)) return;
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.post(
        '/admin/users/bulk',
        { action, user_ids: ids },
        { headers, withCredentials: true }
      );
      const n = res.data?.modified ?? res.data?.matched ?? ids.length;
      toast.success(`Updated ${n} user(s)`);
      bulk.clear();
      fetchUsers();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Bulk action failed';
      toast.error(typeof msg === 'string' ? msg : 'Bulk action failed');
    }
  };

  const exportSelectedCsv = () => {
    const rows = users.filter((u) => bulk.isSelected(u.user_id));
    if (!rows.length) {
      toast.error('Select users on this page to export (select rows with checkboxes)');
      return;
    }
    const cols = [
      'user_id',
      'email',
      'username',
      'name',
      'balance',
      'role',
      'is_suspended',
      'is_active',
      'created_at',
      'last_login_at',
      'last_login_ip',
    ];
    const esc = (v) => {
      const s = String(v ?? '');
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      cols.join(','),
      ...rows.map((u) => cols.map((c) => esc(u[c])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `users-selected-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV downloaded');
  };

  const handleUpdateUser = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const pw = adminNewPassword.trim();
      if (pw) {
        if (!canSetUserPassword) {
          toast.error('You do not have permission to set passwords');
          return;
        }
        if (pw.length < 8) {
          toast.error('Password must be at least 8 characters');
          return;
        }
        if (pw !== adminConfirmPassword.trim()) {
          toast.error('Passwords do not match');
          return;
        }
      }

      const loc = editingUser.location && typeof editingUser.location === 'object' ? editingUser.location : {};
      const body = {
        name: (editingUser.name || '').trim(),
        email: (editingUser.email || '').trim().toLowerCase(),
        username: typeof editingUser.username === 'string' ? editingUser.username.trim() : editingUser.username,
        full_name: typeof editingUser.full_name === 'string' ? editingUser.full_name.trim() : editingUser.full_name,
        whatsapp:
          editingUser.whatsapp === '' || editingUser.whatsapp == null
            ? ''
            : String(editingUser.whatsapp).trim(),
        phone:
          editingUser.phone === '' || editingUser.phone == null
            ? ''
            : String(editingUser.phone).trim(),
        is_suspended: !!(editingUser.is_suspended || editingUser.is_active === false),
        is_active: !(editingUser.is_suspended || editingUser.is_active === false),
        location: {
          country: typeof loc.country === 'string' ? loc.country.trim() : loc.country || '',
          country_code: String(loc.country_code || '')
            .trim()
            .toUpperCase()
            .slice(0, 2),
          city: typeof loc.city === 'string' ? loc.city.trim() : loc.city || '',
          region: typeof loc.region === 'string' ? loc.region.trim() : loc.region || '',
        },
      };

      if (balanceAmount !== '' && balanceAmount != null) {
        const b = parseFloat(String(balanceAmount).replace(/,/g, ''));
        if (Number.isFinite(b)) body.balance = b;
      }
      if (pw) body.new_password = pw;

      if (canChangeRoles && editRole !== initialEditRoleRef.current) {
        try {
          await api.put(
            `/admin/users/${editingUser.user_id}/role`,
            { new_role: editRole, note: '' },
            { headers, withCredentials: true }
          );
        } catch (roleErr) {
          const st = roleErr?.response?.status;
          if (st === 404 || st === 405) {
            body.role = editRole;
          } else {
            throw roleErr;
          }
        }
      }

      await api.put(`/admin/users/${editingUser.user_id}`, body, { headers, withCredentials: true });
      toast.success(pw ? 'User updated and password changed' : 'User updated');
      setEditOpen(false);
      setEditingUser(null);
      setBalanceAmount('');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      fetchUsers();
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to update user';
      toast.error(typeof msg === 'string' ? msg : 'Failed to update user');
    }
  };

  const setHiddenAccessForUser = (serviceId, allowed) => {
    const next = { ...hiddenServicesConfig.hidden_access };
    const list = Array.isArray(next[serviceId]) ? next[serviceId].filter((id) => id !== editingUser?.user_id) : [];
    if (allowed) list.push(editingUser?.user_id);
    next[serviceId] = list.length ? list : [];
    if (!next[serviceId].length) delete next[serviceId];
    setHiddenServicesConfig((c) => ({ ...c, hidden_access: next }));
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    api.put('/admin/hidden-services', { hidden_access: next }, { headers, withCredentials: true })
      .then((res) => res.data && setHiddenServicesConfig((c) => ({ ...c, hidden_access: res.data.hidden_access || next })))
      .catch(() => toast.error('Failed to update access'));
  };

  const handleToggleStatus = async (user) => {
    const suspended = user.is_suspended || !user.is_active;
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const nextSuspended = !suspended;
      await api.put(
        `/admin/users/${user.user_id}`,
        {
          is_suspended: nextSuspended,
          // Keep is_active in sync for both Node and Python backends
          is_active: !nextSuspended,
        },
        { headers, withCredentials: true }
      );
      toast.success(suspended ? 'User activated' : 'User suspended');
      fetchUsers();
    } catch (error) {
      const msg = error?.response?.data?.detail || error?.message || 'Failed to update user';
      console.error('Toggle user status failed', msg);
      toast.error(msg);
    }
  };

  const handleShowSameIp = (ip) => {
    setSameIpFilter(ip || '');
    setPage(1);
  };

  const handleLoginAs = async (user) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.post(`/admin/users/${user.user_id}/login-as`, {}, { headers, withCredentials: true });
      const { access_token, user: userData } = res.data || {};
      if (!access_token) {
        toast.error('Could not get login token');
        return;
      }
      // Preserve current admin session so dashboard can show "Back to Admin Session".
      const currentToken = token || localStorage.getItem('token');
      if (currentToken) {
        localStorage.setItem('admin_backup_token', currentToken);
      }
      localStorage.setItem('token', access_token);
      // Hard redirect so AuthProvider picks up new token cleanly
      window.location.href = '/dashboard';
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to login as user');
    }
  };

  const openEditUser = (user) => {
    initialEditRoleRef.current = user.role || 'user';
    setEditRole(user.role || 'user');
    setEditingUser({
      ...user,
      location: user.location && typeof user.location === 'object' ? { ...user.location } : {},
    });
    const bal = user.balance;
    setBalanceAmount(
      bal === '' || bal == null || !Number.isFinite(Number(bal))
        ? ''
        : (Math.round(Number(bal) * 100) / 100).toFixed(2)
    );
    setAdminNewPassword('');
    setAdminConfirmPassword('');
    setEditOpen(true);
  };

  const resolveLastLoginAt = (user) =>
    user?.last_login_at ||
    user?.lastLoginAt ||
    user?.last_sign_in_at ||
    user?.lastSignInAt ||
    null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const canChangeRoles = permissions?.canChangeRoles && currentUser?.role === 'main_admin';

  return (
    <AdminLayout title="User Management">
      <Toaster position="top-right" theme="dark" />
      
      <div className="space-y-4">
        {/* Search & Filters */}
        <Card className="glass border-cyber-purple/20 p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, name, username, or user ID..."
                className="pl-10 bg-deep-navy border-white/10"
              />
            </div>
            <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 bg-deep-navy border-white/10">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="bg-deep-navy border-white/10 max-h-64">
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{flagFromCode(c)} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44 bg-deep-navy border-white/10">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-deep-navy border-white/10">
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="user">👤 Regular Users</SelectItem>
                <SelectItem value="support">🎧 Support</SelectItem>
                <SelectItem value="admin">🔧 Admins</SelectItem>
                <SelectItem value="main_admin">👑 Main Admins</SelectItem>
                <SelectItem value="admin_all">🔧👑 All admin types</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 bg-deep-navy border-white/10">
                <SelectValue placeholder="Account status" />
              </SelectTrigger>
              <SelectContent className="bg-deep-navy border-white/10">
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="suspended">Suspended only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={signupFilter} onValueChange={(v) => { setSignupFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44 bg-deep-navy border-white/10">
                <SelectValue placeholder="Sign-up method" />
              </SelectTrigger>
              <SelectContent className="bg-deep-navy border-white/10">
                <SelectItem value="all">Any sign-up</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="email">Email / password</SelectItem>
              </SelectContent>
            </Select>
            {sameIpFilter && (
              <Button type="button" variant="outline" size="sm" onClick={() => { setSameIpFilter(''); setPage(1); }} className="border-cyber-purple/50">
                Clear IP filter
              </Button>
            )}
            <Button type="submit" className="bg-cyber-purple text-white">Apply search</Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/15 text-gray-300"
              onClick={() => setShowAdvancedFilters((v) => !v)}
            >
              <SlidersHorizontal size={14} className="mr-1.5 shrink-0" />
              Advanced filters
              {showAdvancedFilters ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-gray-500" onClick={resetAdvancedFilters}>
              Reset all filters
            </Button>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10">
              <div>
                <Label className="text-gray-400 text-xs">Joined on or after</Label>
                <Input
                  type="date"
                  value={joinedAfter}
                  onChange={(e) => { setJoinedAfter(e.target.value); setPage(1); }}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Joined on or before</Label>
                <Input
                  type="date"
                  value={joinedBefore}
                  onChange={(e) => { setJoinedBefore(e.target.value); setPage(1); }}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Min balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={balanceMin}
                  onChange={(e) => { setBalanceMin(e.target.value); setPage(1); }}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Max balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Any"
                  value={balanceMax}
                  onChange={(e) => { setBalanceMax(e.target.value); setPage(1); }}
                  className="mt-1 bg-deep-navy border-white/10"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Users Table */}
        <Card className="glass overflow-hidden border-cyber-purple/20">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-white/5">
                <BulkActionsBar type="users" selectedIds={bulk.selectedIds} onClear={bulk.clear}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs h-8"
                    onClick={() => runBulkAction('suspend')}
                  >
                    <UserX size={14} className="mr-1.5 shrink-0" />
                    Suspend
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs h-8"
                    onClick={() => runBulkAction('activate')}
                  >
                    <UserCheck size={14} className="mr-1.5 shrink-0" />
                    Activate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/15 text-gray-300 text-xs h-8"
                    onClick={exportSelectedCsv}
                  >
                    <Download size={14} className="mr-1.5 shrink-0" />
                    Export CSV
                  </Button>
                </BulkActionsBar>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] table-fixed">
                  <thead className="bg-cyber-purple/10">
                    <tr>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={users.length > 0 && users.every((u) => bulk.isSelected(u.user_id))}
                          onChange={(e) => bulk.setMany(users.map((u) => u.user_id), e.target.checked)}
                        />
                      </th>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-[140px]">User</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-[100px]">Username</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-[180px]">Email</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-[120px]">Location</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium text-sm w-[150px]">Login IPs</th>
                      <th className="text-center p-2.5 text-gray-400 font-medium w-[72px]">WhatsApp</th>
                      <th className="text-right p-2.5 text-gray-400 font-medium w-[88px]">Balance</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-[100px]">Role</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-[88px]">Status</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium w-[100px]">Joined</th>
                      <th className="text-left p-2.5 text-gray-400 font-medium text-sm w-[158px]">Last login</th>
                      <th className="text-center p-2.5 text-gray-400 font-medium w-14">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const lastLogin = resolveLastLoginAt(user);
                      return (
                      <tr
                        key={user.user_id}
                        className={`border-t border-white/5 hover:bg-white/5 ${
                          user.is_suspended || !user.is_active
                            ? 'bg-red-500/5 border-red-500/40 hover:bg-red-500/10'
                            : ''
                        }`}
                      >
                        <td className="p-2.5">
                          <input
                            type="checkbox"
                            aria-label={`Select ${user.user_id}`}
                            checked={bulk.isSelected(user.user_id)}
                            onChange={() => bulk.toggleOne(user.user_id)}
                          />
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center shrink-0">
                              {user.picture ? (
                                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                              ) : (
                                <span className="text-white font-bold text-sm">{user.name?.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span className="text-cyber-purple font-mono text-sm">{user.username || '—'}</span>
                        </td>
                        <td className="p-2.5 text-gray-400 text-sm">{user.email}</td>
                        <td className="p-2.5 align-top">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default block min-w-0">
                                  {(() => {
                                    const geo = normalizeUserLocation(user);
                                    if (!geo.primary) {
                                      return <span className="text-gray-500">—</span>;
                                    }
                                    return (
                                      <span className="flex items-center gap-1.5 text-sm min-w-0">
                                        {geo.countryCode.length === 2 ? (
                                          <span className="shrink-0" aria-hidden>
                                            {flagFromCode(geo.countryCode)}
                                          </span>
                                        ) : null}
                                        <span className="text-white truncate" title={geo.primary}>
                                          {geo.primary}
                                        </span>
                                      </span>
                                    );
                                  })()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-deep-navy border-white/10 max-w-xs">
                                {(() => {
                                  const geo = normalizeUserLocation(user);
                                  const parts = [];
                                  if (geo.countryName) parts.push(geo.countryName);
                                  if (geo.countryCode) parts.push(geo.countryCode);
                                  if (geo.city) parts.push(geo.city);
                                  if (geo.region) parts.push(geo.region);
                                  return (
                                    <>
                                      {parts.length > 0 ? (
                                        <span className="block">{parts.join(' • ')}</span>
                                      ) : (
                                        <span className="text-gray-400">No location on file</span>
                                      )}
                                      {(user.last_login_ip || user.last_ip) && (
                                        <span className="block mt-1 text-gray-400">
                                          Last login IP: {user.last_login_ip || user.last_ip}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="p-2.5 align-top">
                          <div className="space-y-1 min-w-0">
                            {(user.last_login_ip || user.last_ip) && (
                              <div className="flex flex-wrap items-center gap-1 min-w-0">
                                <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                                <span className="text-xs font-mono text-gray-300 truncate max-w-[130px]" title={user.last_login_ip || user.last_ip}>
                                  {user.last_login_ip || user.last_ip}
                                </span>
                                <span className="text-xs text-gray-500 shrink-0">(latest)</span>
                              </div>
                            )}
                            {user.google_id || user.google_sub ? (
                              <span className="text-[10px] text-gray-500 block">Google</span>
                            ) : null}
                            {user.known_ips?.length > 1 && (
                              <div className="text-xs text-gray-500">
                                +{user.known_ips.length - 1} more IPs
                              </div>
                            )}
                            {user.ip_flag && (
                              <span className="inline-block px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                Shared IP
                              </span>
                            )}
                            {!user.last_login_ip && !user.last_ip && (!user.known_ips || user.known_ips.length === 0) && (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          {user.whatsapp ? (
                            <a
                              href={`https://wa.me/${encodeURIComponent(String(user.whatsapp).replace(/[^0-9+]/g, ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                              title={`Chat with ${user.name || user.username} on WhatsApp`}
                            >
                              <MessageCircle size={14} />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right text-electric-blue font-bold text-sm">{formatPrice(user.balance ?? 0)}</td>
                        <td className="p-2.5">
                          <RoleBadge role={user.role || 'user'} />
                        </td>
                        <td className="p-2.5">
                          <Badge className={(user.is_suspended || !user.is_active) ? 'status-cancelled' : 'status-completed'}>
                            {(user.is_suspended || !user.is_active) ? 'Suspended' : 'Active'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-gray-400 text-sm">{formatDate(user.created_at)}</td>
                        <td className="p-2.5 text-gray-400 text-xs align-top leading-snug">
                          <span className="line-clamp-2" title={lastLogin ? String(lastLogin) : undefined}>
                            {formatDateTime(lastLogin)}
                          </span>
                        </td>
                        <td className="p-2.5 text-center align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-white h-8 w-8 p-0"
                                aria-label="User actions"
                              >
                                <MoreVertical size={18} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-deep-navy border-white/10 min-w-[200px]">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openEditUser(user)}>
                                <Edit size={14} className="mr-2 shrink-0" />
                                Edit user
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-cyber-purple" onClick={() => handleLoginAs(user)}>
                                <LogIn size={14} className="mr-2 shrink-0" />
                                Login as this user
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleStatus(user)}>
                                {(user.is_suspended || !user.is_active) ? (
                                  <>
                                    <UserCheck size={14} className="mr-2 shrink-0 text-neon-green" />
                                    Activate user
                                  </>
                                ) : (
                                  <>
                                    <UserX size={14} className="mr-2 shrink-0 text-red-400" />
                                    Suspend user
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                disabled={!(user.last_login_ip || user.last_ip)}
                                onClick={() => handleShowSameIp(user.last_login_ip || user.last_ip)}
                              >
                                <MapPin size={14} className="mr-2 shrink-0 text-amber-300" />
                                Filter by same IP
                              </DropdownMenuItem>
                              {canChangeRoles && (
                                <>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem
                                    className="cursor-pointer text-cyan-300 focus:text-cyan-200"
                                    onClick={() => {
                                      setRoleModalUser(user);
                                      setRoleModalOpen(true);
                                    }}
                                  >
                                    Change role
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-3 border-t border-white/5 flex justify-between items-center">
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

        {/* Edit User Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="glass border-cyber-purple/30 max-h-[90vh] flex flex-col sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-exo">Edit User</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 mt-2 overflow-y-auto max-h-[calc(90vh-7rem)] pr-1">
                <div>
                  <Label className="text-gray-400">User ID</Label>
                  <Input
                    readOnly
                    value={editingUser.user_id || '—'}
                    className="mt-2 bg-black/30 border-white/10 text-gray-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Joined</Label>
                    <Input
                      readOnly
                      value={formatDate(editingUser.created_at)}
                      className="mt-2 bg-black/30 border-white/10 text-gray-400 text-sm"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Label className="text-gray-400">Sign-in</Label>
                    <div className="mt-2 text-sm text-gray-300">
                      {editingUser.google_id || editingUser.google_sub ? (
                        <span className="text-cyan-300">Google</span>
                      ) : (
                        <span>Email / password</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingUser.name ?? ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div>
                  <Label>Full name (optional)</Label>
                  <Input
                    value={editingUser.full_name ?? ''}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    placeholder="Legal / display full name"
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input
                    value={editingUser.username ?? ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="mt-2 bg-deep-navy border-white/10 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingUser.email ?? ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-emerald-400" />
                      WhatsApp
                    </Label>
                    <Input
                      value={editingUser.whatsapp ?? ''}
                      onChange={(e) => setEditingUser({ ...editingUser, whatsapp: e.target.value })}
                      placeholder="+91… or digits"
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editingUser.phone ?? ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      placeholder="Optional"
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                </div>
                <div className="border border-white/10 rounded-lg p-3 space-y-3 bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <MapPin size={16} className="text-cyber-purple shrink-0" />
                    Location
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">Country</Label>
                      <Input
                        value={editingUser.location?.country ?? ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            location: { ...(editingUser.location || {}), country: e.target.value },
                          })
                        }
                        className="mt-1 bg-deep-navy border-white/10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Country code</Label>
                      <Input
                        value={editingUser.location?.country_code ?? ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            location: {
                              ...(editingUser.location || {}),
                              country_code: e.target.value.toUpperCase().slice(0, 2),
                            },
                          })
                        }
                        placeholder="IN"
                        maxLength={2}
                        className="mt-1 bg-deep-navy border-white/10 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">City</Label>
                      <Input
                        value={editingUser.location?.city ?? ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            location: { ...(editingUser.location || {}), city: e.target.value },
                          })
                        }
                        className="mt-1 bg-deep-navy border-white/10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Region / state</Label>
                      <Input
                        value={editingUser.location?.region ?? ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            location: { ...(editingUser.location || {}), region: e.target.value },
                          })
                        }
                        className="mt-1 bg-deep-navy border-white/10 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-white/10 rounded-lg p-3">
                  <div>
                    <Label>Account status</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingUser.is_suspended || editingUser.is_active === false
                        ? 'User cannot sign in or use the panel.'
                        : 'User can sign in normally.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-gray-400">Suspended</span>
                    <Switch
                      checked={!(editingUser.is_suspended || editingUser.is_active === false)}
                      onCheckedChange={(active) =>
                        setEditingUser({
                          ...editingUser,
                          is_suspended: !active,
                          is_active: active,
                        })
                      }
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <span className="text-sm text-gray-300">Active</span>
                  </div>
                </div>
                {canChangeRoles ? (
                  <div>
                    <Label>Role</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-deep-navy border-white/10">
                        {roleOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Main admin only. Changing role is audited like &quot;Change role&quot; in the row menu.
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label>Role</Label>
                    <div className="mt-2">
                      <RoleBadge role={editingUser.role || 'user'} />
                    </div>
                  </div>
                )}
                {canSetUserPassword && (
                  <div className="border border-amber-500/25 rounded-lg p-3 space-y-3 bg-amber-500/5">
                    <div className="flex items-center gap-2 text-amber-200/90 text-sm font-medium">
                      <Lock size={16} className="text-amber-400 shrink-0" />
                      Set login password
                    </div>
                    <p className="text-xs text-gray-500">
                      Leave blank to keep the current password. User can sign in with email and this password (min. 8 characters).
                    </p>
                    <div>
                      <Label className="text-gray-400 text-xs">New password</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 bg-deep-navy border-white/10"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Confirm password</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 bg-deep-navy border-white/10"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label className="flex items-center gap-2">
                    <DollarSign size={16} />
                    Balance
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-blue-400" />
                    Login IP history
                  </h4>
                  <p className="text-sm text-gray-400 mb-2">
                    <span className="text-gray-500">Last login:</span>{' '}
                    {formatDateTime(resolveLastLoginAt(editingUser))}
                  </p>
                  <div className="space-y-1">
                    {editingUser.known_ips?.map((ip, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white/5 rounded px-3 py-1.5"
                      >
                        <span className="font-mono text-sm text-gray-300">{ip}</span>
                        {ip === (editingUser.last_login_ip || editingUser.last_ip) && (
                          <span className="text-xs text-green-400">Latest</span>
                        )}
                      </div>
                    ))}
                    {(!editingUser.known_ips || editingUser.known_ips.length === 0) && (
                      <p className="text-gray-500 text-sm">
                        No IP history yet (user has not logged in since tracking was enabled)
                      </p>
                    )}
                  </div>
                  {editingUser.ip_flag && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                      {editingUser.ip_flag_reason || 'Flagged for shared IP'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => window.open(`/admin/spam-users?highlight=${encodeURIComponent(editingUser.user_id)}`, '_blank')}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    View full security report →
                  </button>
                </div>

                {hiddenServicesConfig.hidden_service_ids?.length > 0 && (
                  <div className="border border-white/10 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock size={16} className="text-amber-400" />
                      <Label>Access to Hidden Services</Label>
                    </div>
                    <Input
                      placeholder="Search hidden services..."
                      value={hiddenServicesSearch}
                      onChange={(e) => setHiddenServicesSearch(e.target.value)}
                      className="bg-deep-navy border-white/10 text-sm"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {hiddenServicesConfig.hidden_service_ids
                        .filter((sid) => {
                          if (!hiddenServicesSearch.trim()) return true;
                          const s = allServices.find((x) => x.service_id === sid);
                          const name = (s?.name || sid).toLowerCase();
                          return name.includes(hiddenServicesSearch.trim().toLowerCase());
                        })
                        .map((sid) => {
                          const s = allServices.find((x) => x.service_id === sid);
                          const name = s?.name || sid;
                          const allowed = Array.isArray(hiddenServicesConfig.hidden_access?.[sid]) && hiddenServicesConfig.hidden_access[sid].includes(editingUser?.user_id);
                          return (
                            <div key={sid} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
                              <span className="text-sm text-gray-300 truncate">{name}</span>
                              <Switch
                                checked={!!allowed}
                                onCheckedChange={(v) => setHiddenAccessForUser(sid, v)}
                                className="data-[state=checked]:bg-cyber-purple"
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <Button onClick={handleUpdateUser} className="w-full bg-cyber-purple text-white">
                  Update User
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {canChangeRoles && (
          <ChangeRoleModal
            open={roleModalOpen}
            user={roleModalUser}
            onClose={() => {
              setRoleModalOpen(false);
              setRoleModalUser(null);
            }}
            onSuccess={() => {
              setRoleModalOpen(false);
              setRoleModalUser(null);
              fetchUsers();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

const ChangeRoleModal = ({ user, open, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user?.role || 'user');
  const [note, setNote] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedRole(user?.role || 'user');
      setNote('');
      setConfirmText('');
      setSaving(false);
    } else if (user) {
      setSelectedRole(user.role || 'user');
    }
  }, [open, user]);

  if (!user) return null;

  const isPromotingToMain = selectedRole === 'main_admin';
  const isSameRole = (user.role || 'user') === selectedRole;

  const handleSubmit = async () => {
    if (!selectedRole || isSameRole) {
      toast.error('Select a different role');
      return;
    }
    if (isPromotingToMain && confirmText !== 'CONFIRM') {
      toast.error('Type CONFIRM to grant Main Admin access');
      return;
    }
    try {
      setSaving(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.put(
        `/admin/users/${user.user_id}/role`,
        { new_role: selectedRole, note },
        { headers, withCredentials: true }
      );
      toast.success('User role updated');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-cyber-purple/40 max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-exo flex items-center gap-2">
            🔄 Change User Role
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-3">
          <div className="border border-white/10 rounded-lg p-3 flex items-center gap-3 bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
              <span className="text-white font-bold">
                {(user.name || user.username || user.email || '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-white font-semibold">{user.name || user.username || 'User'}</div>
              <div className="text-xs text-gray-400">{user.email}</div>
              <div className="text-xs text-gray-500 mt-1">
                Current:&nbsp;
                <span className="inline-block align-middle">
                  <RoleBadge role={user.role || 'user'} />
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">Select new role</Label>
            <div className="space-y-2">
              {roleOptions.map((opt) => {
                const isCurrent = (user.role || 'user') === opt.value;
                const isSelected = selectedRole === opt.value;
                const isMain = opt.value === 'main_admin';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setSelectedRole(opt.value)}
                    className={[
                      'w-full text-left px-4 py-3 rounded-lg border transition-colors',
                      isSelected
                        ? isMain
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 bg-black/20 hover:border-cyan-500/60',
                      isCurrent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">{opt.title}</span>
                      {isCurrent && (
                        <span className="text-xs text-gray-400 border border-gray-500/40 rounded-full px-2 py-0.5">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 mt-1">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-gray-300 mb-1 block">Reason (optional)</Label>
            <textarea
              className="w-full min-h-[70px] bg-deep-navy border border-white/10 rounded-md px-3 py-2 text-sm text-white resize-y focus:outline-none focus:ring-1 focus:ring-cyber-purple"
              placeholder="Add a reason for this role change..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {selectedRole !== 'user' && (
            <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
              This will grant admin panel access. This action is logged and cannot be hidden from the audit trail.
            </div>
          )}

          {isPromotingToMain && (
            <div className="space-y-2">
              <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/40 rounded-md px-3 py-2">
                You are granting FULL SUPER ADMIN access. This user will have complete control over the platform,
                including financial data and activity logs.
              </div>
              <div>
                <Label className="text-xs text-red-200">Type "CONFIRM" to proceed</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 bg-deep-navy border-red-500/50 text-sm"
                  placeholder="CONFIRM"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/15 text-gray-200"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || isSameRole || (isPromotingToMain && confirmText !== 'CONFIRM')}
              className={isPromotingToMain ? 'bg-red-600 hover:bg-red-700' : 'bg-cyber-purple hover:bg-cyber-purple/80'}
            >
              {saving
                ? 'Updating role...'
                : isPromotingToMain
                ? '⚠️ Grant Main Admin Access'
                : 'Confirm Role Change'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUsers;
