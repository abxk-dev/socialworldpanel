import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, CheckCircle, XCircle, Loader2, Search, ChevronRight,
  Eye, Zap, Download
} from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Slider } from '../../components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useAuth } from '../../App';
import { useCurrency } from '../../context/CurrencyContext';
import { API } from '../../config';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const STORAGE_KEY = 'swp_import_last_url';

/** Pre-added providers: minimal built-ins.
 * We only keep a manual option here; all real providers should be created
 * in Admin → Providers and will appear as "saved providers" in the dropdown.
 */
const PRE_ADDED_PROVIDERS = [
  { id: '_manual_', name: 'Custom / Enter manually', apiUrl: '', providerName: '' },
];

const STEPS = [
  { id: 1, label: 'Connect' },
  { id: 2, label: 'Browse' },
  { id: 3, label: 'Configure' },
  { id: 4, label: 'Import' },
];

const CAT_COLORS = {
  YouTube: 'cat-youtube',
  Instagram: 'cat-instagram',
  TikTok: 'cat-tiktok',
  Facebook: 'cat-facebook',
  Twitter: 'cat-twitter',
  Telegram: 'cat-telegram',
  Spotify: 'cat-spotify',
  LinkedIn: 'cat-linkedin',
  Other: 'cat-other',
};

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

const AdvancedImport = () => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [step, setStep] = useState(1);

  // Step 1
  const [presetProviderId, setPresetProviderId] = useState('_manual_');
  const [savedProviders, setSavedProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [providerName, setProviderName] = useState('');
  const [apiUrl, setApiUrl] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    api.get('/admin/providers', { headers, withCredentials: true })
      .then((res) => setSavedProviders(Array.isArray(res.data?.providers) ? res.data.providers : []))
      .catch(() => setSavedProviders([]));
  }, [token]);

  useEffect(() => {
    Promise.all([
      api.get('/admin/categories/flat', { headers, withCredentials: true }).catch(() => ({ data: null })),
      api.get('/public/categories', { withCredentials: true }).catch(() => ({ data: null })),
    ])
      .then(([adminRes, publicRes]) => {
        const byKey = new Map();
        const addOne = (c) => {
          if (!c) return;
          const id = String(c.category_id || c._id || '').trim();
          const name = String(c.name || '').trim();
          if (!name) return;
          const key = id || name.toLowerCase();
          if (!byKey.has(key)) byKey.set(key, { category_id: id || name, name, is_active: c.is_active !== false });
        };
        const adminList = Array.isArray(adminRes?.data)
          ? adminRes.data
          : (Array.isArray(adminRes?.data?.categories) ? adminRes.data.categories : []);
        adminList.forEach(addOne);
        const grouped = Array.isArray(publicRes?.data?.platforms)
          ? publicRes.data.platforms
          : Object.values(publicRes?.data?.grouped || {});
        grouped.forEach((g) => (g.categories || []).forEach(addOne));
        (publicRes?.data?.flat || []).forEach(addOne);
        const list = Array.from(byKey.values())
          .filter((c) => c.is_active !== false)
          .sort((a, b) => a.name.localeCompare(b.name));
        setAdminCategories(list);
      })
      .catch(() => setAdminCategories([]));
  }, [token]);

  const applyPresetProvider = (id) => {
    if (id.startsWith('saved_')) {
      const providerId = id.replace(/^saved_/, '');
      const saved = savedProviders.find((p) => p.provider_id === providerId);
      if (saved) {
        setApiUrl(saved.api_url || '');
        setProviderName(saved.name || '');
        setApiKey(saved.api_key || '');
        setApiToken(saved.api_token || saved.token || '');
        setSelectedProviderId(saved.provider_id || saved.id || null);
      }
      return;
    }
    // Custom / manual provider selection
    setSelectedProviderId(null);
    const preset = PRE_ADDED_PROVIDERS.find((p) => p.id === id);
    if (preset) {
      const url = (preset.apiUrl || '').trim();
      setApiUrl(url);
      if (preset.providerName) setProviderName(preset.providerName);
      const matchingSaved = savedProviders.find((p) => (p.api_url || '').trim().toLowerCase() === url.toLowerCase());
      if (matchingSaved && matchingSaved.api_key) {
        setApiKey(matchingSaved.api_key);
        setSelectedProviderId(matchingSaved.provider_id || null);
        setApiToken(matchingSaved.api_token || matchingSaved.token || '');
      } else {
        setApiKey('');
        setApiToken('');
        setSelectedProviderId(null);
      }
    }
  };
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [serviceCount, setServiceCount] = useState(0);
  const [connectionError, setConnectionError] = useState('');

  // Step 2
  const [allServices, setAllServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState(null);
  const [categories, setCategories] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    showImported: true,
    showNew: true,
    minRate: 0,
    maxRate: 9999,
  });
  const [loadingServices, setLoadingServices] = useState(false);
  const [previewService, setPreviewService] = useState(null);

  // Step 3 – admin-created categories for Assign Category dropdown
  const [adminCategories, setAdminCategories] = useState([]);
  const [globalMarkup, setGlobalMarkup] = useState(30);
  const [globalCategory, setGlobalCategory] = useState('Auto-detect');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [setInactive, setSetInactive] = useState(false);
  const [renamePattern, setRenamePattern] = useState('{name}');
  const [perServiceOverrides, setPerServiceOverrides] = useState({});

  // Step 4
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLog, setImportLog] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const logEndRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 200);

  useEffect(() => {
    if (connected && step >= 2) return;
    setConnectionError('');
  }, [step, connected]);

  const testConnection = async () => {
    if (!apiUrl?.trim() || !apiKey) {
      toast.error('API URL and API Key required');
      return;
    }
    setTesting(true);
    setConnectionError('');
    try {
      const res = await api.post(
        '/admin/providers/test',
        { api_url: apiUrl.trim(), api_key: apiKey, api_token: apiToken || '' },
        { headers, withCredentials: true }
      );
      if (res.data?.success) {
        setConnected(true);
        setServiceCount(res.data.service_count ?? 0);
        setConnectionError('');
        try {
          localStorage.setItem(STORAGE_KEY, apiUrl.trim());
        } catch {}
        toast.success(res.data.message || 'Connected!');
      } else {
        setConnectionError(res.data?.error || 'Connection failed');
      }
    } catch (e) {
      const err = e.response?.data?.error || e.message || 'Connection failed';
      setConnectionError(err);
    } finally {
      setTesting(false);
    }
  };

  const fetchServices = async () => {
    if (!apiUrl?.trim() || !apiKey) return;
    setLoadingServices(true);
    try {
      const res = await api.post(
        '/admin/providers/fetch-services',
        {
          api_url: apiUrl.trim(),
          api_key: apiKey,
          api_token: apiToken || '',
          provider_name: providerName || 'API Provider',
        },
        { headers, withCredentials: true }
      );
      if (res.data?.success) {
        setAllServices(res.data.services || []);
        setCategories(res.data.categories || {});
        setSelectedIds(new Set());
        setLastClickedIndex(null);
        toast.success(`Loaded ${res.data.total} services`);
      } else {
        toast.error(res.data?.error || 'Failed to fetch');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to fetch services');
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    let list = [...allServices];
    if (activeCategory !== 'All') {
      list = list.filter((s) => (s.category || 'Other') === activeCategory);
    }
    if (filters.showNew === false) list = list.filter((s) => s.already_imported);
    if (filters.showImported === false) list = list.filter((s) => !s.already_imported);
    if (filters.minRate > 0) list = list.filter((s) => (s.rate || 0) >= filters.minRate);
    if (filters.maxRate < 9999) list = list.filter((s) => (s.rate || 0) <= filters.maxRate);
    if (debouncedSearch?.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.category || '').toLowerCase().includes(q) ||
          (s.provider_id || '').toLowerCase().includes(q)
      );
    }
    setFilteredServices(list);
  }, [allServices, activeCategory, filters, debouncedSearch]);

  const handleRowClick = (e, providerId, index) => {
    const id = providerId;
    if (!id) return;
    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const next = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        const sid = filteredServices[i]?.provider_id;
        if (sid) next.add(sid);
      }
      setSelectedIds(next);
    } else if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
      setLastClickedIndex(index);
    } else {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
      setLastClickedIndex(index);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size >= filteredServices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredServices.map((s) => s.provider_id).filter(Boolean)));
    }
  };

  const selectedServices = allServices.filter((s) => selectedIds.has(s.provider_id));

  const applyRenamePattern = (svc) => {
    const n = renamePattern
      .replace(/{name}/g, svc.name || '')
      .replace(/{id}/g, svc.provider_id || '')
      .replace(/{category}/g, svc.category || 'Other');
    return n || svc.name;
  };

  const getFinalServices = () => {
    const defaultMarkup = globalMarkup;
    const catMap = {
      'Auto-detect': null,
      YouTube: 'YouTube',
      Instagram: 'Instagram',
      TikTok: 'TikTok',
      Facebook: 'Facebook',
      Twitter: 'Twitter',
      Telegram: 'Telegram',
      Spotify: 'Spotify',
      LinkedIn: 'LinkedIn',
      Other: 'Other',
    };
    // Pass through admin category ids: cat_* OR MongoDB ObjectId strings (24 hex).
    // Previously only cat_* was passed; ObjectId ids fell through to null and ignored the user's pick.
    let assignCat = null;
    if (globalCategory === '__new__') {
      assignCat = String(newCategoryName || '').trim() || null;
    } else if (globalCategory === 'Auto-detect' || !globalCategory) {
      assignCat = null;
    } else if (Object.prototype.hasOwnProperty.call(catMap, globalCategory)) {
      assignCat = catMap[globalCategory];
    } else {
      assignCat = globalCategory;
    }
    return selectedServices.map((s) => {
      const over = perServiceOverrides[s.provider_id] || {};
      const markup = over.markup_percent ?? defaultMarkup;
      const finalRate = s.rate * (1 + markup / 100);
      return {
        ...s,
        custom_name: over.custom_name ?? applyRenamePattern(s),
        markup_percent: markup,
        assigned_category: over.assigned_category ?? assignCat ?? s.category ?? s.auto_category,
        custom_min: over.custom_min ?? s.min,
        custom_max: over.custom_max ?? s.max,
        is_active: over.is_active ?? !setInactive,
      };
    });
  };

  const fetchAsStream = async () => {
    const services = getFinalServices();
    if (services.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    setImportLog([]);
    setImportResults(null);
    const base = API.endsWith('/api') ? API.slice(0, -4) : API.replace(/\/api\/?$/, '');
    const url = `${base}/api/admin/services/bulk-import`;
    try {
      const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            services,
            api_url: apiUrl.trim(),
            api_key: apiKey,
            provider_name: providerName || 'API Provider',
            provider_id: selectedProviderId,
            default_markup: globalMarkup,
            update_existing: updateExisting,
          }),
        }
      );
      if (!response.ok) throw new Error('Import failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastResults = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            setImportProgress(data.progress ?? 0);
            if (data.results) {
              lastResults = data.results;
              const r = data.results;
              setImportLog((prev) => [
                ...prev.slice(-20),
                `[${data.current}/${data.total}] ✅ ${r.imported} imported | 🔄 ${r.updated} updated | ⏭️ ${r.skipped} skipped | ❌ ${r.failed} failed`,
              ]);
            }
          } catch {}
        }
      }
      setImportResults(lastResults);
      toast.success('Import complete');
    } catch (e) {
      toast.error(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleStartImport = () => {
    fetchAsStream();
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [importLog]);

  const allSelected = filteredServices.length > 0 && selectedIds.size >= filteredServices.length;
  const someSelected = selectedIds.size > 0;

  return (
    <AdminLayout title="⬇️ Import Services">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => step >= s.id && setStep(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  step >= s.id
                    ? 'bg-[#22c55e]/20 text-[#22c55e]'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                {step > s.id ? (
                  <CheckCircle size={18} />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-current/30 flex items-center justify-center text-xs font-bold">
                    {s.id}
                  </span>
                )}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={20} className="text-gray-600" />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto"
            >
              <Card className="glass p-6 border-white/10">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Link2 size={24} />
                  Connect to API Provider
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Pre-added or saved provider (optional)</Label>
                    <Select
                      value={presetProviderId}
                      onValueChange={(id) => {
                        setPresetProviderId(id);
                        applyPresetProvider(id);
                      }}
                    >
                      <SelectTrigger className="mt-2 bg-[#0f0f1a] border-white/10 text-white">
                        <SelectValue placeholder="Choose to auto-fill URL and key from template or saved" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="z-[100] bg-deep-navy border-white/15 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] max-h-72 overflow-y-auto"
                      >
                        {PRE_ADDED_PROVIDERS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                        {savedProviders.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs text-gray-500 border-t border-white/10 mt-1">Saved providers (URL + API key loaded)</div>
                            {savedProviders.map((p) => {
                              let host = '—';
                              try { if (p.api_url) host = new URL(p.api_url).hostname; } catch {}
                              return (
                                <SelectItem key={p.provider_id} value={`saved_${p.provider_id}`}>
                                  {p.name || p.provider_id} — {host}
                                </SelectItem>
                              );
                            })}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose <strong>Custom / Enter manually</strong> to paste API details, or pick a saved provider to load the same API URL and key you configured in Admin → Providers.
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Provider Name (optional)</Label>
                    <Input
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      placeholder="My SMM Provider"
                      className="mt-2 bg-[#0f0f1a] border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">API URL</Label>
                    <Input
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://provider.com/api/v2"
                      className="mt-2 bg-[#0f0f1a] border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">API Key</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="••••••••"
                        className="flex-1 bg-[#0f0f1a] border-white/10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-white/10"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        <Eye size={18} />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400">API Token (optional)</Label>
                    <Input
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="Bearer token if provider requires it"
                      className="mt-2 bg-[#0f0f1a] border-white/10"
                    />
                  </div>
                  <Button
                    onClick={testConnection}
                    disabled={testing || !apiUrl?.trim() || !apiKey}
                    className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold"
                  >
                    {testing ? (
                      <Loader2 size={20} className="animate-spin mr-2" />
                    ) : (
                      <CheckCircle size={20} className="mr-2" />
                    )}
                    Test Connection
                  </Button>
                  {connectionError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      <XCircle size={18} />
                      {connectionError}
                    </div>
                  )}
                  {connected && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]">
                      <CheckCircle size={18} />
                      Connected! Found {serviceCount} services
                    </div>
                  )}
                </div>
                {connected && (
                  <Button
                    onClick={() => {
                      fetchServices();
                      setStep(2);
                    }}
                    className="mt-6 w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold"
                  >
                    Next: Browse Services
                    <ChevronRight size={18} className="ml-2" />
                  </Button>
                )}
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {allServices.length === 0 && !loadingServices && (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No services loaded. Go back and fetch services.</p>
                  <Button variant="outline" onClick={() => setStep(1)}>← Back to Connect</Button>
                </div>
              )}
              {allServices.length > 0 && (
                <>
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Sidebar */}
                    <div className="w-full lg:w-60 flex-shrink-0 space-y-4">
                      <Card className="glass p-4 border-white/10">
                        <h3 className="font-bold text-white mb-3">📦 Categories</h3>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => setActiveCategory('All')}
                            className={`cat-item w-full text-left ${activeCategory === 'All' ? 'active' : ''}`}
                          >
                            <span>All</span>
                            <span className="cat-count">{allServices.length}</span>
                          </button>
                          {Object.entries(categories).map(([cat, count]) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setActiveCategory(cat)}
                              className={`cat-item w-full text-left ${activeCategory === cat ? 'active' : ''}`}
                            >
                              <span className={CAT_COLORS[cat] ? `cat-badge ${CAT_COLORS[cat]}` : ''}>{cat}</span>
                              <span className="cat-count">{count}</span>
                            </button>
                          ))}
                        </div>
                      </Card>
                      <Card className="glass p-4 border-white/10">
                        <h3 className="font-bold text-white mb-3">Quick Filters</h3>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.showNew}
                            onChange={(e) => setFilters((f) => ({ ...f, showNew: e.target.checked }))}
                            className="rounded"
                          />
                          Show new only
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer mt-2">
                          <input
                            type="checkbox"
                            checked={filters.showImported}
                            onChange={(e) => setFilters((f) => ({ ...f, showImported: e.target.checked }))}
                            className="rounded"
                          />
                          Show already imported
                        </label>
                        <div className="mt-3">
                          <Label className="text-xs text-gray-500">Min Rate</Label>
                          <Input
                            type="number"
                            min={0}
                            value={filters.minRate}
                            onChange={(e) => setFilters((f) => ({ ...f, minRate: Number(e.target.value) || 0 }))}
                            className="mt-1 bg-[#0f0f1a] border-white/10 h-8"
                          />
                        </div>
                        <div className="mt-2">
                          <Label className="text-xs text-gray-500">Max Rate</Label>
                          <Input
                            type="number"
                            min={0}
                            value={filters.maxRate}
                            onChange={(e) => setFilters((f) => ({ ...f, maxRate: Number(e.target.value) || 9999 }))}
                            className="mt-1 bg-[#0f0f1a] border-white/10 h-8"
                          />
                        </div>
                      </Card>
                    </div>

                    {/* Main */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="🔍 Search services..."
                            className="pl-10 bg-[#0f0f1a] border-white/10"
                          />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-white/10">
                              <Zap size={16} className="mr-2" />
                              Quick Select ▾
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-deep-navy border-white/10 w-56">
                            {Object.keys(categories).map((cat) => (
                              <DropdownMenuItem
                                key={cat}
                                onClick={() => {
                                  const ids = new Set(
                                    allServices.filter((s) => (s.category || 'Other') === cat).map((s) => s.provider_id).filter(Boolean)
                                  );
                                  setSelectedIds((prev) => new Set([...prev, ...ids]));
                                }}
                              >
                                Select all {cat}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                              onClick={() => {
                                const ids = allServices.filter((s) => !s.already_imported).map((s) => s.provider_id).filter(Boolean);
                                setSelectedIds(new Set(ids));
                              }}
                            >
                              Select all NEW
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedIds(new Set())}>
                              Clear selection
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span className="text-sm text-gray-400">
                          Selected: {selectedIds.size} services
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleSelectAll}
                          className="border-white/10"
                        >
                          {allSelected ? 'Clear All' : 'Select All Visible'}
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedIds.size > 0) setStep(3);
                            else toast.error('Select at least one service');
                          }}
                          disabled={selectedIds.size === 0}
                          className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold"
                        >
                          Next: Configure →
                        </Button>
                      </div>

                      {someSelected && (
                        <div className="selection-bar mb-4">
                          <span className="text-[#22c55e] font-medium">✅ {selectedIds.size} selected</span>
                          <Button
                            onClick={() => setStep(3)}
                            className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black"
                          >
                            Configure & Import
                          </Button>
                        </div>
                      )}

                      <Card className="glass overflow-hidden border-white/10">
                        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                          <table className="import-table">
                            <thead>
                              <tr>
                                <th onClick={toggleSelectAll} className="w-12 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
                                    onChange={toggleSelectAll}
                                    className="import-checkbox"
                                  />
                                </th>
                                <th>#</th>
                                <th>Service Name</th>
                                <th>Category</th>
                                <th>Rate</th>
                                <th>Min</th>
                                <th>Max</th>
                                <th>Status</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {loadingServices ? (
                                <tr>
                                  <td colSpan={9} className="text-center py-8 text-gray-400">
                                    <Loader2 size={32} className="animate-spin mx-auto" />
                                  </td>
                                </tr>
                              ) : (
                                filteredServices.map((s, idx) => (
                                  <tr
                                    key={s.provider_id}
                                    className={selectedIds.has(s.provider_id) ? 'selected' : ''}
                                    onClick={(e) => handleRowClick(e, s.provider_id, idx)}
                                  >
                                    <td onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={selectedIds.has(s.provider_id)}
                                        onChange={() => handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, s.provider_id, idx)}
                                        className="import-checkbox"
                                      />
                                    </td>
                                    <td className="text-gray-500 text-xs">{s.provider_id}</td>
                                    <td>{s.name}</td>
                                    <td>
                                      <span className={`cat-badge ${CAT_COLORS[s.category] || 'cat-other'}`}>
                                        {s.category || 'Other'}
                                      </span>
                                    </td>
                                    <td>{formatPrice(s.rate || 0)}/1k</td>
                                    <td>{s.min}</td>
                                    <td>{s.max}</td>
                                    <td>
                                      <span className={s.already_imported ? 'status-imported' : 'status-new'}>
                                        {s.already_imported ? '🔄 Imported' : '✅ New'}
                                      </span>
                                    </td>
                                    <td>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewService(s);
                                        }}
                                      >
                                        <Eye size={16} />
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="glass p-6 border-white/10">
                <h2 className="text-xl font-bold text-white mb-2">Configure {selectedServices.length} services</h2>
                <div className="space-y-6 mt-6">
                  <div>
                    <Label className="text-gray-400">Markup %</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[globalMarkup]}
                        onValueChange={([v]) => setGlobalMarkup(v)}
                        min={0}
                        max={200}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-[#22c55e] font-bold w-16">{globalMarkup}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Provider $1.00 → Your price {formatPrice(1 * (1 + globalMarkup / 100))}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Assign Category</Label>
                    <Select value={globalCategory} onValueChange={setGlobalCategory}>
                      <SelectTrigger className="mt-2 bg-[#0f0f1a] border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        className="z-[10060] max-h-[min(70vh,22rem)] bg-deep-navy border-white/10 text-gray-100 shadow-xl"
                        position="popper"
                        side="bottom"
                        sideOffset={6}
                        align="start"
                        collisionPadding={16}
                      >
                        <SelectItem value="Auto-detect">Auto-detect</SelectItem>
                        {adminCategories.map((c, idx) => (
                          <SelectItem
                            key={`${String(c.category_id)}-${idx}-${c.name || ''}`}
                            value={String(c.category_id)}
                          >
                            {c.name || c.category_id}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__">+ New Category</SelectItem>
                        {adminCategories.length === 0 && (
                          <>
                            {['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Twitter', 'Telegram', 'Spotify', 'LinkedIn', 'Other'].map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {globalCategory === '__new__' && (
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter new category name"
                        className="mt-2 bg-[#0f0f1a] border-white/10"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-400">Rename Pattern (variables: {'{name}'} {'{id}'} {'{category}'})</Label>
                    <Input
                      value={renamePattern}
                      onChange={(e) => setRenamePattern(e.target.value)}
                      placeholder="{name}"
                      className="mt-2 bg-[#0f0f1a] border-white/10"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="rounded"
                    />
                    Update existing services (if already imported)
                  </label>
                </div>
                <div className="flex gap-4 mt-8">
                  <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold"
                  >
                    Preview Import →
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="glass p-6 border-white/10">
                {!importing && !importResults ? (
                  <>
                    <h2 className="text-xl font-bold text-white mb-4">Import Summary</h2>
                    <div className="space-y-2 text-gray-400">
                      <p>Total to process: {selectedServices.length}</p>
                    </div>
                    <div className="flex gap-4 mt-6">
                      <Button variant="outline" onClick={() => setStep(3)}>← Back</Button>
                      <Button
                        onClick={handleStartImport}
                        className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold"
                      >
                        Start Import
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-white mb-4">
                      {importing ? 'Importing...' : '🎉 Import Complete!'}
                    </h2>
                    <div className="import-progress mb-4">
                      <div
                        className="import-progress-fill"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    {importLog.length > 0 && (
                      <div className="import-log mb-4">
                        {importLog.map((line, i) => (
                          <div key={i} className={line.includes('❌') ? 'log-error' : line.includes('✅') ? 'log-success' : 'log-skip'}>
                            {line}
                          </div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    )}
                    {importResults && !importing && (
                      <div className="space-y-4 mt-4">
                        <div className="space-y-1">
                          <p className="text-[#22c55e]">✅ Imported: {importResults.imported} new</p>
                          <p className="text-blue-400">🔄 Updated: {importResults.updated}</p>
                          <p className="text-gray-500">⏭️ Skipped: {importResults.skipped}</p>
                          <p className="text-red-400">❌ Failed: {importResults.failed}</p>
                        </div>
                        {(importResults.ai_rewritten_from_description != null ||
                          importResults.ai_generated_from_name != null ||
                          importResults.ai_used_original != null) && (
                          <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-4">
                            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                              <span className="text-lg">📊</span>
                              <span>AI Processing Summary</span>
                            </h3>
                            <div className="space-y-1 text-sm text-gray-300">
                              <p>
                                <span className="text-emerald-400">🤖 Rewritten from description:</span>{' '}
                                {importResults.ai_rewritten_from_description ?? 0}
                              </p>
                              <p>
                                <span className="text-violet-400">✨ Generated from name only:</span>{' '}
                                {importResults.ai_generated_from_name ?? 0}
                              </p>
                              <p>
                                <span className="text-gray-400">📄 Used original (AI failed):</span>{' '}
                                {importResults.ai_used_original ?? 0}
                              </p>
                              <p className="text-xs text-gray-500 pt-1">
                                Total processed:{' '}
                                {(importResults.ai_rewritten_from_description ?? 0) +
                                  (importResults.ai_generated_from_name ?? 0) +
                                  (importResults.ai_used_original ?? 0)}{' '}
                                / {selectedServices.length}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-4 mt-4">
                          <Link to="/admin/services">
                            <Button className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black">View Imported Services</Button>
                          </Link>
                          <Button variant="outline" onClick={() => { setStep(1); setImportResults(null); }}>Import More</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={!!previewService} onOpenChange={() => setPreviewService(null)}>
        <DialogContent className="glass border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Service Preview</DialogTitle>
          </DialogHeader>
          {previewService && (
            <div className="space-y-2 text-sm">
              <p><strong className="text-gray-400">Name:</strong> {previewService.name}</p>
              <p><strong className="text-gray-400">Provider ID:</strong> {previewService.provider_id}</p>
              <p><strong className="text-gray-400">Rate:</strong> {formatPrice(previewService.rate || 0)}/1000</p>
              <p><strong className="text-gray-400">Min:</strong> {previewService.min} | Max: {previewService.max}</p>
              <p><strong className="text-gray-400">Category:</strong> {previewService.category}</p>
              {previewService.description && <p className="text-gray-500 mt-2">{previewService.description}</p>}
              <Button
                className="mt-4 bg-[#22c55e] text-black"
                onClick={() => {
                  setSelectedIds((prev) => new Set([...prev, previewService.provider_id]));
                  setPreviewService(null);
                }}
              >
                Select this service
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdvancedImport;
