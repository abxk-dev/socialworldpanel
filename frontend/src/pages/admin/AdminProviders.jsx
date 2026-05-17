import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, Plus, Edit, Trash2, RefreshCw, TestTube, 
  CheckCircle, XCircle, AlertTriangle, Download, Eye, EyeOff,
  Loader2, Activity, DollarSign
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import { API } from '../../config';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { useCurrency } from '../../context/CurrencyContext';

const AdminProviders = () => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [providerServices, setProviderServices] = useState([]);
  const [providerLogs, setProviderLogs] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(null);
  const [refreshing, setRefreshing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showApiKey, setShowApiKey] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    api_token: '',
    alias: '',
    is_mock: false,
    notes: '',
    priority: 1,
    balance_threshold: 5
  });
  const [importMarkup, setImportMarkup] = useState(100);
  const [selectedServices, setSelectedServices] = useState([]);
  const [categoryMode, setCategoryMode] = useState('provider');
  const [assignCategory, setAssignCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [existingCategories, setExistingCategories] = useState([]);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchProviders = async () => {
    try {
      const res = await api.get('/admin/providers', { headers, withCredentials: true });
      const data = res.data;
      setProviders(Array.isArray(data) ? data : (data?.providers ?? []));
    } catch (error) {
      toast.error('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const providerId = (p) => p.id ?? p.provider_id;

  useEffect(() => {
    fetchProviders();
    (async () => {
      try {
        const res = await api.get('/public/categories', { withCredentials: true });
        const grouped = Array.isArray(res.data?.platforms)
          ? res.data.platforms
          : Object.values(res.data?.grouped || {});
        const flatCats = [];
        grouped.forEach((g) => (g.categories || []).forEach((c) => {
          flatCats.push({ category_id: String(c.category_id || c._id || ''), name: c.name || '' });
        }));
        if (Array.isArray(res.data?.flat)) {
          res.data.flat.forEach((c) => {
            flatCats.push({ category_id: String(c.category_id || c._id || ''), name: c.name || '' });
          });
        }
        const uniq = [];
        const seen = new Set();
        flatCats.forEach((c) => {
          const k = `${c.category_id}|${c.name}`;
          if (!c.name || seen.has(k)) return;
          seen.add(k);
          uniq.push(c);
        });
        setExistingCategories(uniq);
      } catch {
        setExistingCategories([]);
      }
    })();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const basePayload = {
        name: formData.name?.trim(),
        api_url: formData.api_url?.trim(),
        api_key: formData.api_key?.trim(),
        api_token: formData.api_token?.trim(),
        alias: formData.alias?.trim() || '',
        notes: formData.notes?.trim() || '',
        is_mock: !!formData.is_mock,
        balance_threshold: formData.balance_threshold ?? 5,
      };
      if (editingProvider) {
        await api.put(
          `/admin/providers/${providerId(editingProvider)}`,
          {
            ...editingProvider,
            ...basePayload,
          },
          { headers, withCredentials: true }
        );
        toast.success('Provider updated');
      } else {
        // Let backend auto-assign priority and other defaults
        await api.post(
          '/admin/providers',
          basePayload,
          { headers, withCredentials: true }
        );
        toast.success('Provider created');
      }
      setShowModal(false);
      resetForm();
      fetchProviders();
    } catch (error) {
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        'Failed to save provider';
      toast.error(detail);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this provider? It will be disabled.')) return;
    try {
      await api.delete(`/admin/providers/${id}`, { headers, withCredentials: true });
      toast.success('Provider deleted');
      fetchProviders();
    } catch (error) {
      toast.error('Failed to delete provider');
    }
  };

  const testConnection = async (provider) => {
    setTesting(providerId(provider));
    setTestResult(null);
    try {
      const res = await api.post(`/admin/providers/${providerId(provider)}/test`, {}, { headers, withCredentials: true });
      setTestResult({ providerId: providerId(provider), ...res.data });
      if (res.data.success) {
        toast.success(`Connected! Balance: ${formatPrice(res.data.balance ?? 0)}`);
      } else {
        toast.error(`Connection failed: ${res.data.error}`);
      }
      fetchProviders();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Test failed');
    } finally {
      setTesting(null);
    }
  };

  const refreshBalance = async (provider) => {
    setRefreshing(providerId(provider));
    try {
      const res = await api.post(`/admin/providers/${providerId(provider)}/refresh-balance`, {}, { headers, withCredentials: true });
      const balance = res.data?.balance;
      if (balance !== undefined) toast.success(`Balance: ${formatPrice(balance ?? 0)}`);
      else toast.success('Balance refreshed');
      fetchProviders();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to refresh balance');
    } finally {
      setRefreshing(null);
    }
  };

  const fetchProviderServices = async (provider) => {
    try {
      setProviderServices([]);
      setShowServicesModal(true);
      setCategoryMode('provider');
      setAssignCategory('');
      setNewCategoryName('');
      const res = await api.get(`/admin/providers/${providerId(provider)}/services`, { headers, withCredentials: true });
      setProviderServices(res.data.services || []);
      setEditingProvider(provider);
    } catch (error) {
      toast.error('Failed to fetch services');
    }
  };

  const fetchProviderLogs = async (provider) => {
    try {
      const res = await api.get(`/admin/providers/${providerId(provider)}/logs?limit=10`, { headers, withCredentials: true });
      setProviderLogs(Array.isArray(res.data?.logs) ? res.data.logs : []);
      setShowLogsModal(true);
      setEditingProvider(provider);
    } catch (error) {
      toast.error('Failed to fetch logs');
    }
  };

  const importServices = async () => {
    if (!editingProvider) return;
    setImporting(true);
    try {
      const assignedCategory =
        categoryMode === 'existing'
          ? assignCategory
          : categoryMode === 'new'
            ? newCategoryName.trim()
            : '';
      const res = await api.post(`/admin/providers/${providerId(editingProvider)}/import-services`, {
        service_ids: selectedServices.length > 0 ? selectedServices : [],
        markup: importMarkup,
        assigned_category: assignedCategory,
        update_existing: true,
      }, { headers, withCredentials: true });
      toast.success(`Imported ${res.data.imported} services`);
      setShowServicesModal(false);
      setSelectedServices([]);
      fetchProviders();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to import services');
    } finally {
      setImporting(false);
    }
  };

  const syncPrices = async (provider) => {
    try {
      const res = await api.post(`/admin/providers/${providerId(provider)}/sync-prices`, {
        markup: 100
      }, { headers, withCredentials: true });
      toast.success(`Updated ${res.data.updated} service prices`);
      fetchProviders();
    } catch (error) {
      toast.error('Failed to sync prices');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', api_url: '', api_key: '', api_token: '', alias: '', is_mock: false, notes: '', priority: 1, balance_threshold: 5 });
    setEditingProvider(null);
  };

  const openEditModal = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      api_url: provider.api_url,
      api_key: provider.api_key || '',
      api_token: provider.api_token || '',
      alias: provider.alias || '',
      is_mock: provider.is_mock || false,
      notes: provider.notes || '',
      priority: provider.priority ?? 1,
      balance_threshold: provider.balance_threshold ?? 5
    });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-emerald-500/20 text-emerald-400',
      inactive: 'bg-gray-500/20 text-gray-400',
      error: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || colors.inactive;
  };

  const getBalanceColor = (balance) => {
    if (balance >= 50) return 'text-emerald-400';
    if (balance >= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  const maskApiKey = (key) => {
    if (!key) return '';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <AdminLayout title="API Providers">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-cyber-purple animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="API Providers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm">Manage your SMM API providers</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-cyber-purple hover:bg-cyber-purple/80">
            <Plus size={18} className="mr-2" />
            Add Provider
          </Button>
        </div>

        {/* Providers Table */}
        <Card className="glass border-cyber-purple/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-cyber-purple/20">
                <TableHead className="text-gray-400">Priority</TableHead>
                <TableHead className="text-gray-400">Provider</TableHead>
                <TableHead className="text-gray-400">API URL</TableHead>
                <TableHead className="text-gray-400">API Key</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Balance</TableHead>
                <TableHead className="text-gray-400">Success / Services</TableHead>
                <TableHead className="text-gray-400">Last Sync</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-12">
                    No providers yet. Add your first provider to get started.
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={providerId(provider)} className="border-cyber-purple/10 hover:bg-white/5">
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {provider.priority === 1 ? 'Primary' : provider.priority === 2 ? 'Backup 1' : provider.priority === 3 ? 'Backup 2' : `#${provider.priority}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${provider.is_mock ? 'bg-yellow-500/20' : 'bg-cyber-purple/20'}`}>
                          <Server size={20} className={provider.is_mock ? 'text-yellow-400' : 'text-cyber-purple'} />
                        </div>
                        <div>
                          <div className="font-medium text-white">{provider.name}</div>
                          {provider.paused_reason === 'low_balance' && <span className="text-xs text-amber-400">Low balance</span>}
                          {provider.is_mock && <span className="text-xs text-yellow-400">Mock Provider</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm font-mono max-w-[200px] truncate">
                      {provider.alias || provider.api_url}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm font-mono">
                          {showApiKey[providerId(provider)] ? (provider.api_key || '') : (provider.api_key_masked || maskApiKey(provider.api_key))}
                        </span>
                        {provider.api_key && (
                          <button type="button" onClick={() => setShowApiKey(prev => ({ ...prev, [providerId(provider)]: !prev[providerId(provider)] }))}>
                            {showApiKey[providerId(provider)] ? <EyeOff size={14} className="text-gray-500" /> : <Eye size={14} className="text-gray-500" />}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(provider.status)}>
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${getBalanceColor(provider.balance)}`}>
                        {formatPrice(provider.balance ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400">{provider.success_rate != null ? `${provider.success_rate}%` : (provider.services_count ?? '—')}</TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {provider.last_sync ? new Date(provider.last_sync).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => testConnection(provider)} disabled={testing === providerId(provider)}>
                          {testing === providerId(provider) ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => refreshBalance(provider)} disabled={refreshing === providerId(provider)}>
                          {refreshing === providerId(provider) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        </Button>
                        {provider.status === 'active' && (
                          <Button variant="ghost" size="sm" onClick={async () => { try { await api.post(`/admin/providers/${providerId(provider)}/pause`, {}, { headers, withCredentials: true }); toast.success('Provider paused'); fetchProviders(); } catch (e) { toast.error(e.response?.data?.error || e.response?.data?.detail || 'Failed'); } }}>
                            Pause
                          </Button>
                        )}
                        {provider.status === 'paused' && (
                          <Button variant="ghost" size="sm" onClick={async () => { try { await api.post(`/admin/providers/${providerId(provider)}/resume`, {}, { headers, withCredentials: true }); toast.success('Provider resumed'); fetchProviders(); } catch (e) { toast.error(e.response?.data?.error || e.response?.data?.detail || 'Failed'); } }}>
                            Resume
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => fetchProviderServices(provider)}>
                          <Download size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => fetchProviderLogs(provider)}>
                          <Activity size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(provider)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(providerId(provider))}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Add/Edit Provider Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="glass border-cyber-purple/30 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-exo">{editingProvider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Provider Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My SMM Provider"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              <div>
                <Label>API URL</Label>
                <Input 
                  value={formData.api_url} 
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  placeholder="https://nakrutka.com/api or https://bigstata.com/api"
                  className="bg-white/5 border-white/10"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">BigStata/Nakrutka: https://nakrutka.com/api or https://bigstata.com/api | Venro: use https://venro.ru/api (not /en/cp/api)</p>
              </div>
              <div>
                <Label>API Key</Label>
                <Input 
                  value={formData.api_key} 
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="your_api_key_here"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              <div>
                <Label>API Token (optional)</Label>
                <Input
                  value={formData.api_token}
                  onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                  placeholder="Bearer token from provider profile (if enabled)"
                  className="bg-white/5 border-white/10"
                />
                <p className="text-xs text-gray-500 mt-1">Some providers require Authorization: Bearer token in addition to API key.</p>
              </div>
              <div>
                <Label>Alias (optional - hide real domain)</Label>
                <Input 
                  value={formData.alias} 
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="Provider A"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input 
                  value={formData.notes} 
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Mock Provider (for testing)</Label>
                <Switch 
                  checked={formData.is_mock} 
                  onCheckedChange={(checked) => setFormData({ ...formData, is_mock: checked })}
                />
              </div>
              <div>
                <Label>Low-balance Threshold</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.balance_threshold}
                  onChange={(e) => setFormData({ ...formData, balance_threshold: Number(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10"
                />
                <p className="text-xs text-gray-500 mt-1">Pause provider automatically when balance goes below this.</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-cyber-purple hover:bg-cyber-purple/80">
                  {editingProvider ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Services Modal */}
        <Dialog open={showServicesModal} onOpenChange={setShowServicesModal}>
          <DialogContent className="glass border-cyber-purple/30 text-white max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="font-exo">Import Services from {editingProvider?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Markup Percentage</Label>
                  <Input 
                    type="number" 
                    value={importMarkup} 
                    onChange={(e) => setImportMarkup(Number(e.target.value))}
                    className="bg-white/5 border-white/10"
                    min="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g., 100 = Your price is 2x provider price</p>
                </div>
                <div>
                  <Label>&nbsp;</Label>
                  <Button onClick={importServices} disabled={importing} className="bg-cyber-purple hover:bg-cyber-purple/80">
                    {importing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Download className="mr-2" size={16} />}
                    Import {selectedServices.length > 0 ? `(${selectedServices.length})` : 'All'}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Assign Category</Label>
                  <select
                    value={categoryMode}
                    onChange={(e) => setCategoryMode(e.target.value)}
                    className="mt-2 w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
                  >
                    <option value="provider">Use provider category</option>
                    <option value="existing">Use existing category</option>
                    <option value="new">Create new category</option>
                  </select>
                </div>
                {categoryMode === 'existing' && (
                  <div className="md:col-span-2">
                    <Label>Select Existing Category</Label>
                    <select
                      value={assignCategory}
                      onChange={(e) => setAssignCategory(e.target.value)}
                      className="mt-2 w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
                    >
                      <option value="">Select category</option>
                      {existingCategories.map((c) => (
                        <option key={c.category_id || c.name} value={c.category_id || c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {categoryMode === 'new' && (
                  <div className="md:col-span-2">
                    <Label>New Category Name</Label>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Instagram Story Views"
                      className="mt-2 bg-white/5 border-white/10"
                    />
                  </div>
                )}
              </div>
              <div className="border border-white/10 rounded-lg max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="w-12">
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices(providerServices.map(s => s.service));
                            } else {
                              setSelectedServices([]);
                            }
                          }}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead className="text-gray-400">ID</TableHead>
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Category</TableHead>
                      <TableHead className="text-gray-400">Rate</TableHead>
                      <TableHead className="text-gray-400">Min/Max</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providerServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                          <Loader2 className="animate-spin mx-auto mb-2" />
                          Loading services...
                        </TableCell>
                      </TableRow>
                    ) : (
                      providerServices.map((service) => (
                        <TableRow key={service.service} className="border-white/5">
                          <TableCell>
                            <input 
                              type="checkbox"
                              checked={selectedServices.includes(service.service)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServices([...selectedServices, service.service]);
                                } else {
                                  setSelectedServices(selectedServices.filter(s => s !== service.service));
                                }
                              }}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="text-gray-400 font-mono text-xs">{service.service}</TableCell>
                          <TableCell className="text-white text-sm">{service.name}</TableCell>
                          <TableCell className="text-gray-400 text-sm">{service.category}</TableCell>
                          <TableCell className="text-electric-blue font-bold">{formatPrice(service.rate)}</TableCell>
                          <TableCell className="text-gray-400 text-sm">{service.min} - {service.max}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Provider Logs Modal */}
        <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
          <DialogContent className="glass border-cyber-purple/30 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-exo">Activity Log - {editingProvider?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {providerLogs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No activity logs yet</div>
              ) : (
                providerLogs.map((log) => (
                  <div key={log.log_id} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={log.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                          {log.status}
                        </Badge>
                        <span className="ml-2 text-white font-medium">{log.action}</span>
                      </div>
                      <span className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.error_message && <p className="text-red-400 text-sm mt-2">{log.error_message}</p>}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminProviders;
