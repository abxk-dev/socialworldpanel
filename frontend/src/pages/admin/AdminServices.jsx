import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit, Trash2, Search, Type, Code, HelpCircle, ListChecks, FileText, ChevronDown, ChevronRight, ChevronUp, Info, Link2, MoreVertical, Eye, EyeOff, GripVertical, Download, Lock, LockOpen, Copy } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Switch } from '../../components/ui/switch';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth } from '../../App';
import { API } from '../../config';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import api from '../../lib/axios';
import { getServiceDisplayNumber } from '../../lib/utils';
import BulkActionsBar from '../../components/admin/BulkActionsBar';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useCurrency } from '../../context/CurrencyContext';

const SWP_CATEGORY_ORDER_KEY = 'swp_category_order';
const SWP_SERVICE_ORDER_PREFIX = 'swp_service_order_';

function getSavedCategoryOrder() {
  try {
    const raw = localStorage.getItem(SWP_CATEGORY_ORDER_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function getSavedServiceOrder(categoryId) {
  try {
    const raw = localStorage.getItem(SWP_SERVICE_ORDER_PREFIX + categoryId);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveCategoryOrder(order) {
  try {
    localStorage.setItem(SWP_CATEGORY_ORDER_KEY, JSON.stringify(order));
  } catch {}
}

function saveServiceOrder(categoryId, order) {
  try {
    localStorage.setItem(SWP_SERVICE_ORDER_PREFIX + categoryId, JSON.stringify(order));
  } catch {}
}

const DEFAULT_FAQ = [
  { question: 'Will this get my channel banned?', answer: 'No. Our delivery methods are safe and comply with platform guidelines.' },
  { question: 'How long until delivery is complete?', answer: 'Typically 24-72 hours depending on order size.' },
  { question: 'Can I order for multiple videos?', answer: 'Yes. Place separate orders for each video link.' },
  { question: 'What if hours drop after delivery?', answer: 'We offer a non-drop guarantee. Contact support if hours decrease.' },
];
const DEFAULT_REQUIREMENTS = [
  'Video must be Public (not Unlisted or Private)',
  'Minimum video length: 10 minutes for maximum delivery efficiency',
  'Channel must be in good standing (no active strikes)',
  'Do not delete or change the video to Private during delivery',
];
const DEFAULT_ABOUT = {
  description: 'Reach platform requirements faster with high-quality delivery. Our service uses real traffic sources for safe, sustainable results.',
  items: [
    { title: 'Non-Drop Guarantee', text: 'delivery is stable and won\'t decrease after completion' },
    { title: 'High Retention', text: 'content is engaged with for extended durations' },
    { title: 'Safe Delivery', text: 'compliant method, no bots or fake accounts' },
    { title: 'Works on Public Content', text: 'your content must be set to Public' },
  ],
};

const PLATFORM_COLORS = {
  instagram: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
  youtube: '#ff0000',
  tiktok: '#000000',
  twitter: '#1da1f2',
  facebook: '#1877f2',
  telegram: '#0088cc',
  spotify: '#1db954',
  linkedin: '#0a66c2',
};

const PlatformIcon = ({ platform, className = 'w-6 h-6 rounded' }) => {
  const bg = PLATFORM_COLORS[(platform || '').toLowerCase()] || 'linear-gradient(135deg, #6366f1, #8b5cf6)';
  return (
    <div
      className={`${className} shrink-0 flex items-center justify-center text-white text-xs font-bold`}
      style={{ background: bg }}
      title={platform}
    >
      {(platform || '?').charAt(0).toUpperCase()}
    </div>
  );
};

const EditablePreview = ({ value, onChange, placeholder = 'Nothing to preview' }) => {
  const domRef = React.useRef(null);
  const isFocused = React.useRef(false);
  const debounceTimer = React.useRef(null);
  React.useEffect(() => {
    if (!isFocused.current && domRef.current) {
      domRef.current.innerHTML = value || `<span class="text-gray-500">${placeholder}</span>`;
    }
  }, [value, placeholder]);
  const syncOut = (html) => {
    const ph = `<span class="text-gray-500">${placeholder}</span>`;
    if (!html || html === ph || html.replace(/\s/g, '') === ph.replace(/\s/g, '')) return onChange('');
    onChange(html);
  };
  const scheduleSyncOut = (html, { flush = false } = {}) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (flush) return syncOut(html);
    debounceTimer.current = setTimeout(() => syncOut(html), 120);
  };
  return (
    <div
      ref={domRef}
      contentEditable
      suppressContentEditableWarning
      className="min-h-[60px] p-2 rounded outline-none focus:ring-1 focus:ring-cyber-purple/50 text-sm text-white [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_b]:font-bold [&_i]:italic [&_u]:underline [&_a]:text-cyber-purple [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5"
      onFocus={() => { isFocused.current = true; }}
      onBlur={(e) => {
        isFocused.current = false;
        scheduleSyncOut((e.target.innerHTML || '').trim(), { flush: true });
      }}
      onInput={(e) => {
        scheduleSyncOut((e.target.innerHTML || '').trim());
      }}
    />
  );
};

const AdminServices = () => {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const dndAccessibility = React.useMemo(() => {
    // DndKit accessibility renders hidden screen-reader elements that can break table nesting.
    // Put those into `document.body` to keep <table>/<tbody>/<tr> structure valid.
    if (typeof document === 'undefined') return undefined;
    return { container: document.body };
  }, []);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [providerServicesModal, setProviderServicesModal] = useState(false);
  const [providerServices, setProviderServices] = useState([]);
  const [fetchingProviderServices, setFetchingProviderServices] = useState(false);
  // Cache of provider service details so we can show provider rate under our own rate.
  // Shape: { [provider_id]: { [provider_service_id]: { rate, min, max, name, type } } }
  const [providerServiceRatesCache, setProviderServiceRatesCache] = useState({});
  // Track which providers are currently being fetched to avoid duplicate calls.
  const providerRatesInFlightRef = React.useRef(new Set());
  // Memoize resolved provider rate per service to avoid expensive matching on re-renders.
  // Reset whenever providerServiceRatesCache updates.
  const providerRateResultCacheRef = React.useRef({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: '', category_id: '', platform: 'instagram', rate: 0, min_order: 100, max_order: 10000, description: '', is_active: true,
    show_faq: false, faq: JSON.parse(JSON.stringify(DEFAULT_FAQ)),
    show_requirements: false, requirements: [...DEFAULT_REQUIREMENTS],
    show_about: false, about: JSON.parse(JSON.stringify(DEFAULT_ABOUT)),
    mode: 'Auto', service_type: 'Default', deny_link_duplicates: 'No',
    drip_feed: false, drip_feed_min_interval: 1, drip_feed_max_interval: 60,
    increment: 0, overflow_percent: 0, provider_id: '', provider_service_id: '',
    visibility: 'public', visible_to_users: [], cancel_window_minutes: 0, partial_refund: false, bulk_discount_percent: 0,
    refill_enabled: false, refill_days: 30,
    start_count_enabled: false, start_count_platform: 'instagram', start_count_metric: 'likes', start_count_fallback: 0,
  });
  const [descriptionMode, setDescriptionMode] = useState('plain');
  const descTextareaRef = React.useRef(null);
  const bulk = useBulkSelection();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [sortColumn, setSortColumn] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [savedCategoryOrder, setSavedCategoryOrder] = useState(getSavedCategoryOrder);
  const [savedServiceOrder, setSavedServiceOrder] = useState(() => ({}));
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importProviderId, setImportProviderId] = useState('');
  const [importMarkup, setImportMarkup] = useState(100);
  const [importing, setImporting] = useState(false);
  const [hiddenServicesConfig, setHiddenServicesConfig] = useState({ hidden_service_ids: [], hidden_access: {} });
  const [showHiddenInTable, setShowHiddenInTable] = useState(true);
  const [avgTimesByService, setAvgTimesByService] = useState({});
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [duplicateForm, setDuplicateForm] = useState({ name: '', rate: '' });

  const fetchHiddenConfig = async () => {
    try {
      const hRes = await api.get('/admin/hidden-services', { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true });
      const d = hRes.data;
      setHiddenServicesConfig({
        hidden_service_ids: Array.isArray(d?.hidden_service_ids) ? d.hidden_service_ids : [],
        hidden_access: d && typeof d.hidden_access === 'object' ? d.hidden_access : {},
      });
    } catch (_) {
      setHiddenServicesConfig({ hidden_service_ids: [], hidden_access: {} });
    }
  };

  const addToHidden = async (serviceIds) => {
    const ids = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
    const set = new Set([...hiddenServicesConfig.hidden_service_ids, ...ids]);
    const next = Array.from(set);
    try {
      await api.put('/admin/hidden-services', { hidden_service_ids: next }, { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true });
      setHiddenServicesConfig((c) => ({ ...c, hidden_service_ids: next }));
      toast.success(ids.length > 1 ? `${ids.length} services set as hidden` : 'Service set as hidden');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    }
  };

  const removeFromHidden = async (serviceId) => {
    const next = hiddenServicesConfig.hidden_service_ids.filter((id) => id !== serviceId);
    const nextAccess = { ...hiddenServicesConfig.hidden_access };
    delete nextAccess[serviceId];
    try {
      await api.put('/admin/hidden-services', { hidden_service_ids: next, hidden_access: nextAccess }, { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true });
      setHiddenServicesConfig((c) => ({ ...c, hidden_service_ids: next, hidden_access: nextAccess }));
      toast.success('Service no longer hidden');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    }
  };

  const updateHiddenAccess = async (payload) => {
    try {
      const res = await api.put('/admin/hidden-services', payload, { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true });
      setHiddenServicesConfig((c) => ({ ...c, ...res.data }));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update access');
    }
  };

  const handleBulkSortByRate = (direction) => {
    const selectedIds = bulk.selectedIds || [];
    if (selectedIds.length === 0) {
      toast.error('Select at least one service');
      return;
    }
    const byCat = {};
    for (const s of services) {
      const cid = s.category_id || '__uncategorized__';
      if (!byCat[cid]) byCat[cid] = [];
      byCat[cid].push(s);
    }
    let sortedCount = 0;
    let skippedCount = 0;
    const nextSaved = { ...savedServiceOrder };
    for (const [cid, list] of Object.entries(byCat)) {
      const allSelected = list.length > 0 && list.every((s) => selectedIds.includes(s.service_id));
      if (!allSelected) {
        if (list.length > 0) skippedCount++;
        continue;
      }
      const sorted = [...list].sort((a, b) => {
        const ra = Number(a.rate) || 0;
        const rb = Number(b.rate) || 0;
        return direction === 'asc' ? ra - rb : rb - ra;
      });
      const newOrder = sorted.map((s) => s.service_id);
      saveServiceOrder(cid, newOrder);
      nextSaved[cid] = newOrder;
      sortedCount++;
    }
    setSavedServiceOrder(nextSaved);
    if (sortedCount > 0) toast.success(`${sortedCount} categor${sortedCount === 1 ? 'y' : 'ies'} sorted successfully`);
    if (skippedCount > 0) toast.warning(`${skippedCount} categor${skippedCount === 1 ? 'y' : 'ies'} skipped (not all services selected)`);
    bulk.clear();
  };

  const fetchData = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [srvRes, catRes, provRes] = await Promise.all([
        api.get('/admin/services', { headers, withCredentials: true }),
        // Category Management uses `/admin/category-management` (Mongo `categories` collection).
        // Service Management was previously using `/admin/categories` (different collection),
        // which caused category headers to show raw ids.
        api.get('/admin/category-management/flat', { headers, withCredentials: true }),
        api.get('/admin/providers', { headers, withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setServices(Array.isArray(srvRes.data) ? srvRes.data : (srvRes.data?.services ?? []));
      const flatCats =
        // `/admin/category-management/flat` returns: { success, categories: [...] }
        (Array.isArray(catRes?.data) ? catRes.data : catRes?.data?.categories) || [];

      // Normalize to the shape expected across this file + BulkActionsBar:
      // - `category_id` is the join key with `service.category_id`
      // - `name` is the display label
      const normalizeId = (v) => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        const s = typeof v?.toString === 'function' ? v.toString() : String(v);
        // Handle ObjectId("...") stringification
        const m = s.match(/^ObjectId\(\"?([0-9a-fA-F]{24})\"?\)$/);
        return m ? m[1] : s;
      };

      const normalizedCats = flatCats.map((c) => {
        const id = normalizeId(c?._id ?? c?.id ?? c?.category_id ?? c?.categoryId);
        const platform = c?.platform ?? c?.platform_slug ?? '';
        const sortOrder = c?.order ?? c?.sort_order ?? c?.global_order ?? 999;
        return {
          // UI join key
          category_id: id,
          name: c?.name ?? c?.category_name ?? id,
          platform,
          order: sortOrder,
          is_active: c?.is_active ?? (c?.status ? c.status === 'active' : true),
          // keep original fields (useful for other lookups)
          ...c,
        };
      }).filter((c) => c.category_id);

      setCategories(normalizedCats);
      setProviders(Array.isArray(provRes.data) ? provRes.data : (provRes.data?.providers ?? []));
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openDuplicateModal = (service) => {
    setDuplicateSource(service);
    setDuplicateForm({
      name: `${service.name} (Copy)`,
      rate: String(service.rate ?? ''),
    });
    setDuplicateModalOpen(true);
  };

  const handleDuplicateSubmit = async (e) => {
    e.preventDefault();
    if (!duplicateSource) return;
    const name = (duplicateForm.name || '').trim();
    const rateNum = parseFloat(duplicateForm.rate);
    if (!name) {
      toast.error('New service name is required');
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      toast.error('New rate must be a positive number');
      return;
    }
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.post(
        `/admin/services/${duplicateSource.service_id}/duplicate`,
        { name, rate: rateNum },
        { headers, withCredentials: true }
      );
      toast.success('Service duplicated successfully.');
      setDuplicateModalOpen(false);
      setDuplicateSource(null);
      setDuplicateForm({ name: '', rate: '' });
      await fetchData();
      const newId = res.data?.service_id;
      if (newId) {
        const created = (Array.isArray(services) ? services : []).find(
          (s) => s.service_id === newId
        );
        if (created) {
          setEditingService(created);
          setDescriptionMode(/<[^>]+>/.test(created.description || '') ? 'html' : 'plain');
          setEditOpen(true);
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to duplicate service';
      toast.error(msg);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const providerMetaById = useMemo(() => {
    const list = Array.isArray(providers) ? providers : [];
    return Object.fromEntries(list.map((p) => [p.provider_id, p]));
  }, [providers]);

  // Fetch provider service rates (from provider API) and cache them.
  const providerIdsInServices = useMemo(() => {
    const s = new Set((Array.isArray(services) ? services : [])
      .map((x) => x?.provider_id)
      .filter(Boolean));
    return Array.from(s);
  }, [services]);

  useEffect(() => {
    if (!token) return;
    if (!providerIdsInServices.length) return;

    const toFetch = providerIdsInServices.filter((pid) => {
      if (providerServiceRatesCache[pid] !== undefined) return false;
      const meta = providerMetaById[pid] || {};
      // Only fetch from providers that actually have API config.
      if (!meta?.api_url || !meta?.api_key) return false;
      if (providerRatesInFlightRef.current.has(pid)) return false;
      return true;
    });
    if (!toFetch.length) return;

    const headers = { Authorization: `Bearer ${token}` };
    // Fetch only a few providers per tick to avoid hammering the backend.
    const batch = toFetch.slice(0, 3);

    let cancelled = false;
    (async () => {
      const nextChunk = {};
      for (const providerId of batch) {
        providerRatesInFlightRef.current.add(providerId);
        try {
          const res = await api.get(`/admin/providers/${providerId}/services`, {
            headers,
            withCredentials: true,
          });
          const list = Array.isArray(res?.data?.services) ? res.data.services : [];
          const byId = {};
          for (const ps of list) {
            const sid = ps?.service_id != null ? String(ps.service_id) : '';
            if (!sid) continue;
            byId[sid] = ps;
          }
          nextChunk[providerId] = { byId, all: list };
        } catch (e) {
          // Avoid repeated failing calls for providers missing API config or unreachable endpoints.
          nextChunk[providerId] = { byId: {}, all: [] };
        } finally {
          providerRatesInFlightRef.current.delete(providerId);
        }
        if (cancelled) return;
      }

      if (!cancelled && Object.keys(nextChunk).length) {
        setProviderServiceRatesCache((prev) => ({ ...prev, ...nextChunk }));
      }
    })();

    return () => {
      cancelled = true;
      // Don't clear in-flight here; new effect run will ignore.
    };
  }, [token, providerIdsInServices, providerServiceRatesCache, providerMetaById]);

  useEffect(() => {
    // Provider rates cache changed; clear resolved-rate memo.
    providerRateResultCacheRef.current = {};
  }, [providerServiceRatesCache]);

  useEffect(() => {
    if (token) fetchHiddenConfig();
  }, [token]);
  useEffect(() => {
    if (!token) return;
    api.get('/admin/services/avg-times', { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      .then((res) => setAvgTimesByService(res.data && typeof res.data === 'object' ? res.data : {}))
      .catch(() => {});
  }, [token]);

  const handleCreateService = async () => {
    try {
      if (!newService?.category_id) {
        toast.error('Please select category')
        return
      }
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post('/admin/services', newService, { headers, withCredentials: true });
      toast.success('Service created');
      setEditOpen(false);
      setNewService({
        name: '', category_id: '', platform: 'instagram', rate: 0, min_order: 100, max_order: 10000, description: '', is_active: true,
        show_faq: false, faq: JSON.parse(JSON.stringify(DEFAULT_FAQ)),
        show_requirements: false, requirements: [...DEFAULT_REQUIREMENTS],
        show_about: false, about: JSON.parse(JSON.stringify(DEFAULT_ABOUT)),
        mode: 'Auto', service_type: 'Default', deny_link_duplicates: 'No',
        drip_feed: false, drip_feed_min_interval: 1, drip_feed_max_interval: 60,
        increment: 0, overflow_percent: 0, provider_id: '', provider_service_id: '',
        visibility: 'public', visible_to_users: [], cancel_window_minutes: 0, partial_refund: false, bulk_discount_percent: 0,
        refill_enabled: false, refill_days: 30,
        start_count_enabled: false, start_count_platform: 'instagram', start_count_metric: 'likes', start_count_fallback: 0,
      });
      setDescriptionMode('plain');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create service');
    }
  };

  const handleUpdateService = async () => {
    try {
      if (!editingService?.category_id) {
        toast.error('Please select category')
        return
      }
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.put(`/admin/services/${editingService.service_id}`, editingService, { headers, withCredentials: true });
      toast.success('Service updated');
      setEditOpen(false);
      setEditingService(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const openDeleteConfirm = (serviceId) => {
    setServiceToDelete(serviceId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.delete(`/admin/services/${serviceToDelete}`, { headers, withCredentials: true });
      toast.success('Service deleted');
      setDeleteConfirmOpen(false);
      setServiceToDelete(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const getProviderRateForService = (service) => {
    if (!service?.provider_id) return null;
    const memoKey = `${service.provider_id}|${service.provider_service_id ?? ''}|${service.service_id ?? ''}|${service.name ?? ''}|${service.service_type ?? service.type ?? ''}`;
    if (Object.prototype.hasOwnProperty.call(providerRateResultCacheRef.current, memoKey)) {
      return providerRateResultCacheRef.current[memoKey];
    }
    const cache = providerServiceRatesCache[service.provider_id] || {};
    const byId = cache.byId || cache || {};
    const key = service.provider_service_id != null ? String(service.provider_service_id) : '';
    const directMatch = key ? byId[key] : undefined;
    const directRate = directMatch?.rate;
    if (directRate !== undefined && directRate !== null) {
      providerRateResultCacheRef.current[memoKey] = directRate;
      return directRate;
    }

    // Fallback: try to match a provider service by name + type.
    const list = Array.isArray(cache.all) ? cache.all : [];
    if (!list.length) return null;

    const targetName = String(service.name || '')
      .toLowerCase()
      .replace(/\[.*?\]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const targetTokens = targetName ? targetName.split(' ').filter((t) => t.length >= 3) : [];
    const targetType = (service.service_type || service.type || 'default').toString().toLowerCase();

    let best = null;
    let bestScore = 0;
    for (const ps of list) {
      const psName = String(ps?.name || '').toLowerCase();
      const psType = String(ps?.type || 'default').toLowerCase();
      let score = 0;
      if (targetName && psName.includes(targetName)) score += 4;
      if (!targetName && psName.includes(String(service.name || '').toLowerCase())) score += 2;
      for (const tok of targetTokens) {
        if (tok && psName.includes(tok)) score += 1;
      }
      if (psType === targetType) score += 2;
      if (!best || score > bestScore) {
        best = ps;
        bestScore = score;
      }
    }

    const rate = best?.rate;
    const resolved = rate !== undefined && rate !== null && bestScore > 0 ? rate : null;
    providerRateResultCacheRef.current[memoKey] = resolved;
    return resolved;
  };

  const handleToggleServiceStatus = async (service) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const nextActive = !service.is_active;
      await api.put(`/admin/services/${service.service_id}`, { ...service, is_active: nextActive }, { headers, withCredentials: true });
      toast.success(nextActive ? 'Service activated' : 'Service hidden');
      fetchData();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const fetchUsersForPicker = async () => {
    setLoadingUsers(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ limit: '200' });
      if (userSearch) params.set('search', userSearch);
      const res = await api.get(`/admin/users?${params}`, { headers, withCredentials: true });
      setUsersList(res.data?.users ?? []);
    } catch {
      setUsersList([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (userPickerOpen) fetchUsersForPicker();
  }, [userPickerOpen, userSearch]);

  const handleImportFromProvider = async () => {
    if (!importProviderId) {
      toast.error('Select a provider');
      return;
    }
    setImporting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.post(
        `/admin/providers/${importProviderId}/import-services`,
        { markup: importMarkup },
        { headers, withCredentials: true }
      );
      toast.success(res.data?.imported != null ? `Imported ${res.data.imported} services` : 'Import completed');
      setImportModalOpen(false);
      setImportProviderId('');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const formatAvgTime = (seconds) => {
    if (seconds == null || seconds < 0) return '—';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);
    if (days >= 1) return `${days} days`;
    if (hrs >= 1) return `${hrs} hrs`;
    return `${mins} mins`;
  };
  const avgTimeColorClass = (seconds) => {
    if (seconds == null || seconds < 0) return 'text-gray-400';
    if (seconds < 3600) return 'text-emerald-400';
    if (seconds <= 43200) return 'text-yellow-400';
    return 'text-red-400';
  };

  const normalizeId = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    const s = typeof v?.toString === 'function' ? v.toString() : String(v);
    // Handle ObjectId("...") stringification
    const m = s.match(/^ObjectId\(\"?([0-9a-fA-F]{24})\"?\)$/);
    return m ? m[1] : s;
  };

  const getCategoryId = (c) =>
    normalizeId(c?.category_id ?? c?.categoryId ?? c?._id ?? c?.id ?? '');
  const getCategoryName = (c) => c?.name ?? c?.category_name ?? c?.title ?? c?.label ?? c?.display_name ?? '';
  const getCategoryPlatform = (c) => c?.platform ?? c?.platform_slug ?? '';

  // Map category id -> category display name.
  // Some APIs may return `category_id`, while others may use `_id`/`id`.
  const categoryMap = Object.fromEntries(
    categories
      .map((c) => {
        const id = getCategoryId(c);
        if (!id) return null;
        const name = getCategoryName(c) || id;
        return [id, name];
      })
      .filter(Boolean)
  );
  const providerMap = Object.fromEntries(providers.map(p => [p.provider_id, p.alias || p.name]));
  const filteredServices = services.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all') {
      const st = s.service_type || s.type || 'Default';
      if (st !== typeFilter) return false;
    }
    if (providerFilter !== 'all' && (s.provider_id || '') !== providerFilter) return false;
    if (statusFilter === 'active' && !s.is_active) return false;
    if (statusFilter === 'inactive' && s.is_active) return false;
    return true;
  });
  const uniqueTypes = [...new Set(services.map(s => s.service_type || s.type || 'Default'))].sort();

  // Sort services
  const sortedServices = [...filteredServices].sort((a, b) => {
    if (!sortColumn) return 0;
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortColumn === 'service') return mul * ((a.name || '').localeCompare(b.name || ''));
    if (sortColumn === 'type') return mul * ((a.service_type || a.type || '').localeCompare(b.service_type || b.type || ''));
    if (sortColumn === 'provider') return mul * ((providerMap[a.provider_id] || '').localeCompare(providerMap[b.provider_id] || ''));
    if (sortColumn === 'status') return mul * ((a.is_active ? 1 : 0) - (b.is_active ? 1 : 0));
    return 0;
  });

  function applyServiceOrder(servicesList, orderIds) {
    if (!orderIds || orderIds.length === 0) return servicesList;
    const byId = Object.fromEntries(servicesList.map(s => [s.service_id, s]));
    const ordered = [];
    for (const id of orderIds) {
      if (byId[id]) {
        ordered.push(byId[id]);
        delete byId[id];
      }
    }
    return [...ordered, ...Object.values(byId)];
  }

  const hiddenIdsSet = useMemo(() => new Set(hiddenServicesConfig.hidden_service_ids || []), [hiddenServicesConfig.hidden_service_ids]);

  // Group by category, applying saved order from localStorage + state; optionally hide private hidden rows
  const grouped = useMemo(() => {
    const apiCategoryOrder = [...categories]
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map((c) => getCategoryId(c))
      .filter(Boolean);
    const mergedCategoryOrder = savedCategoryOrder.length
      ? [...savedCategoryOrder.filter(id => apiCategoryOrder.includes(id)), ...apiCategoryOrder.filter(id => !savedCategoryOrder.includes(id))]
      : apiCategoryOrder;

    const byCat = {};
    for (const s of sortedServices) {
      const cid = normalizeId(s?.category_id ?? s?.categoryId ?? '__uncategorized__');
      if (!byCat[cid]) byCat[cid] = [];
      byCat[cid].push(s);
    }

    const pinnedId = mergedCategoryOrder.find(cid => cid === '__favourites__' || (categoryMap[cid] || '').includes('⭐ Favourite'));
    const orderForSort = pinnedId
      ? [pinnedId, ...mergedCategoryOrder.filter(id => id !== pinnedId)]
      : mergedCategoryOrder;

    const out = [];
    const seenCats = new Set();
    const filterHidden = (list) => (!showHiddenInTable && hiddenIdsSet.size > 0 ? list.filter(s => !hiddenIdsSet.has(s.service_id)) : list);
    for (const cid of orderForSort) {
      if (!byCat[cid]?.length) continue;
      seenCats.add(cid);
      const savedOrder = savedServiceOrder[cid]?.length ? savedServiceOrder[cid] : getSavedServiceOrder(cid);
      let orderedServices = applyServiceOrder(byCat[cid], savedOrder);
      orderedServices = filterHidden(orderedServices);
      if (orderedServices.length === 0) continue;
      out.push({
        category_id: cid,
        name: categoryMap[cid] || (cid === '__uncategorized__' ? 'Uncategorized' : cid),
        platform: (categories.find((c) => getCategoryId(c) === cid) && getCategoryPlatform(categories.find((c) => getCategoryId(c) === cid))) || '',
        services: orderedServices,
        isPinned: cid === pinnedId,
      });
    }
    for (const cid of Object.keys(byCat)) {
      if (seenCats.has(cid)) continue;
      const savedOrder = savedServiceOrder[cid]?.length ? savedServiceOrder[cid] : getSavedServiceOrder(cid);
      let orderedServices = applyServiceOrder(byCat[cid], savedOrder);
      orderedServices = filterHidden(orderedServices);
      if (orderedServices.length === 0) continue;
      out.push({
        category_id: cid,
        name: cid === '__uncategorized__' ? 'Uncategorized' : (categoryMap[cid] || cid),
        platform: (categories.find((c) => getCategoryId(c) === cid) && getCategoryPlatform(categories.find((c) => getCategoryId(c) === cid))) || '',
        services: orderedServices,
        isPinned: false,
      });
    }
    return out;
  }, [categories, sortedServices, categoryMap, savedCategoryOrder, savedServiceOrder, showHiddenInTable, hiddenIdsSet]);

  const flatSortableIds = useMemo(() => {
    const ids = [];
    for (const group of grouped) {
      ids.push(`cat-${group.category_id}`);
      for (const s of group.services) ids.push(`srv-${s.service_id}`);
    }
    return ids;
  }, [grouped]);

  const serviceToCategoryId = useMemo(() => {
    const m = {};
    for (const g of grouped) {
      for (const s of g.services) m[s.service_id] = g.category_id; 
    }
    return m;
  }, [grouped]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeStr = String(active.id);
    const overStr = String(over.id);
    const oldIndex = flatSortableIds.indexOf(activeStr);
    const newIndex = flatSortableIds.indexOf(overStr);
    if (oldIndex === -1 || newIndex === -1) return;
    const newFlatOrder = arrayMove(flatSortableIds, oldIndex, newIndex);

    if (activeStr.startsWith('cat-')) {
      let newCategoryOrder = newFlatOrder.filter(id => id.startsWith('cat-')).map(id => id.replace('cat-', ''));
      const pinnedId = grouped.find(g => g.isPinned)?.category_id;
      if (pinnedId && newCategoryOrder.indexOf(pinnedId) > 0) {
        newCategoryOrder = [pinnedId, ...newCategoryOrder.filter(id => id !== pinnedId)];
      }
      setSavedCategoryOrder(newCategoryOrder);
      saveCategoryOrder(newCategoryOrder);
      return;
    }
    if (activeStr.startsWith('srv-')) {
      const catId = serviceToCategoryId[activeStr.replace('srv-', '')];
      if (!catId) return;
      const serviceIdsInCategory = newFlatOrder.filter(id => id.startsWith('srv-') && serviceToCategoryId[id.replace('srv-', '')] === catId).map(id => id.replace('srv-', ''));
      setSavedServiceOrder(prev => ({ ...prev, [catId]: serviceIdsInCategory }));
      saveServiceOrder(catId, serviceIdsInCategory);
    }
  };

  const expandAll = () => setCollapsedCategories(new Set());
  const collapseAll = () => setCollapsedCategories(new Set(grouped.map((g) => g.category_id)));

  const toggleCollapse = (cid) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  const SortableTh = ({ col, label }) => (
    <th
      scope="col"
      className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white select-none whitespace-nowrap"
      onClick={() => {
        setSortColumn(col);
        setSortDir(prev => (prev === 'asc' && sortColumn === col) ? 'desc' : 'asc');
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortColumn === col && (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </span>
    </th>
  );

  function SortableCategoryRow({ group, isCollapsed, catServiceIds, allSelected, toggleCollapse, children }) {
    const id = `cat-${group.category_id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id,
      disabled: group.isPinned,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`border-t border-white/10 bg-white/5 hover:bg-white/[0.07] ${isDragging ? 'swp-drag-row' : ''}`}
      >
        <td className="p-3">
          {group.isPinned ? (
            <GripVertical size={16} className="text-gray-400 cursor-default opacity-50" />
          ) : (
            <span {...attributes} {...listeners} className="swp-drag-handle inline-flex cursor-grab active:cursor-grabbing touch-none">
              <GripVertical size={16} className="text-gray-500" />
            </span>
          )}
        </td>
        {children}
      </tr>
    );
  }

  function SortableServiceRow({ service, group, providerMap, formatPrice, setEditingService, setDescriptionMode, setEditOpen, handleToggleServiceStatus, openDeleteConfirm, isHidden, addToHidden, removeFromHidden, children }) {
    const id = `srv-${service.service_id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      ...(isHidden ? { opacity: 0.5 } : {}),
    };
    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`border-t border-white/5 hover:bg-white/5 ${isDragging ? 'swp-drag-row' : ''}`}
      >
        <td className="p-3">
          <span {...attributes} {...listeners} className="swp-drag-handle inline-flex cursor-grab active:cursor-grabbing touch-none">
            <GripVertical size={16} className="text-gray-500" />
          </span>
        </td>
        {children}
      </tr>
    );
  }

  return (
    <AdminLayout title="Service Management">
      <Toaster position="top-right" theme="dark" />
      
      <div className="space-y-6">
        {/* Duplicate Service Modal */}
        <Dialog open={duplicateModalOpen} onOpenChange={(open) => { setDuplicateModalOpen(open); if (!open) { setDuplicateSource(null); setDuplicateForm({ name: '', rate: '' }); } }}>
          <DialogContent className="glass border-cyber-purple/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-exo">Duplicate Service</DialogTitle>
              <DialogDescription>
                Create a copy of this service with a new name and rate.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDuplicateSubmit} className="space-y-4 mt-3">
              {duplicateSource && (
                <p className="text-xs text-gray-400">
                  Creating a copy of: <span className="text-gray-200 font-medium">{duplicateSource.name}</span>
                </p>
              )}
              <div>
                <Label className="text-gray-300 text-sm">New Service Name</Label>
                <Input
                  value={duplicateForm.name}
                  onChange={(e) => setDuplicateForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="Enter new service name"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">New Rate per 1000</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={duplicateForm.rate}
                  onChange={(e) => setDuplicateForm((f) => ({ ...f, rate: e.target.value }))}
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="e.g. 1.50"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-gray-200"
                  onClick={() => {
                    setDuplicateModalOpen(false);
                    setDuplicateSource(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-electric-blue text-black">
                  Create Duplicate
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-10 bg-deep-navy border-white/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingService(null); setDescriptionMode('plain'); } }}>
              <DialogTrigger asChild>
                <Button className="bg-cyber-purple text-white" data-testid="add-service-btn">
                  <Plus size={18} className="mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
            <DialogContent className="glass border-cyber-purple/30 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-exo">{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                <DialogDescription>
                  Update the service fields, then save to apply changes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingService?.name || newService.name}
                    onChange={(e) => editingService ? setEditingService({...editingService, name: e.target.value}) : setNewService({...newService, name: e.target.value})}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select 
                      value={editingService?.category_id || newService.category_id}
                      onValueChange={(val) => editingService ? setEditingService({...editingService, category_id: val}) : setNewService({...newService, category_id: val})}
                    >
                      <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-deep-navy border-white/10">
                        {categories.map((c) => {
                          const id = getCategoryId(c);
                          if (!id) return null;
                          const label = getCategoryName(c) || id;
                          return <SelectItem key={id} value={id}>{label}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Rate per 1000</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingService?.rate || newService.rate}
                      onChange={(e) => editingService ? setEditingService({...editingService, rate: parseFloat(e.target.value)}) : setNewService({...newService, rate: parseFloat(e.target.value)})}
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Min Order</Label>
                    <Input
                      type="number"
                      value={editingService?.min_order || newService.min_order}
                      onChange={(e) => editingService ? setEditingService({...editingService, min_order: parseInt(e.target.value)}) : setNewService({...newService, min_order: parseInt(e.target.value)})}
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                  <div>
                    <Label>Max Order</Label>
                    <Input
                      type="number"
                      value={editingService?.max_order || newService.max_order}
                      onChange={(e) => editingService ? setEditingService({...editingService, max_order: parseInt(e.target.value)}) : setNewService({...newService, max_order: parseInt(e.target.value)})}
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Description</Label>
                    <div className="flex rounded-lg border border-white/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDescriptionMode('plain')}
                        className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                          descriptionMode === 'plain'
                            ? 'bg-cyber-purple text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Type size={14} />
                        Plain
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescriptionMode('html')}
                        className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                          descriptionMode === 'html'
                            ? 'bg-cyber-purple text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Code size={14} />
                        HTML
                      </button>
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <Textarea
                      ref={descTextareaRef}
                      value={editingService?.description ?? newService.description ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        editingService
                          ? setEditingService({...editingService, description: val})
                          : setNewService({...newService, description: val});
                      }}
                      placeholder={descriptionMode === 'html'
                        ? 'Enter HTML (e.g. <b>bold</b>, <i>italic</i>, <br> for line break)'
                        : 'Enter plain text description'}
                      className="min-h-[100px] bg-deep-navy border-cyber-purple/50 text-white placeholder:text-gray-500 pr-16"
                      rows={5}
                    />
                    <span className="absolute bottom-2 right-3 text-xs text-gray-500">
                      {(editingService?.description ?? newService.description ?? '').length} characters
                    </span>
                  </div>
                  {descriptionMode === 'html' && (
                    <>
                      <p className="text-xs text-gray-500 mt-2">HTML tags allowed: &lt;b&gt;, &lt;i&gt;, &lt;br&gt;, &lt;a href=""&gt;, &lt;ul&gt;, &lt;li&gt;, etc.</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[
                          { tag: '<b>', label: 'b' },
                          { tag: '<i>', label: 'i' },
                          { tag: '<br>', label: 'br' },
                          { tag: '<u>', label: 'u' },
                          { tag: '<a href="">', label: 'a' },
                          { tag: '<ul><li></li></ul>', label: 'ul' },
                          { tag: '<span style="color:red"></span>', label: 'color' },
                        ].map(({ tag, label }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              const ta = descTextareaRef.current;
                              const desc = editingService?.description ?? newService.description ?? '';
                              const start = ta?.selectionStart ?? desc.length;
                              const end = ta?.selectionEnd ?? desc.length;
                              const before = desc.slice(0, start);
                              const after = desc.slice(end);
                              const newDesc = before + tag + after;
                              if (editingService) {
                                setEditingService({ ...editingService, description: newDesc });
                              } else {
                                setNewService({ ...newService, description: newDesc });
                              }
                              ta && setTimeout(() => { ta.focus(); ta.setSelectionRange(start + tag.length, start + tag.length); }, 0);
                            }}
                            className="px-2 py-1 text-xs rounded bg-white/10 text-gray-300 hover:bg-cyber-purple/30 hover:text-white border border-white/10"
                          >
                            &lt;{label}&gt;
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs text-gray-400 font-medium mb-2">LIVE PREVIEW <span className="text-cyber-purple/80">— click to edit directly</span></p>
                        <EditablePreview
                          value={editingService?.description ?? newService.description ?? ''}
                          onChange={(val) => {
                            if (editingService) setEditingService(s => ({ ...s, description: val }));
                            else setNewService(s => ({ ...s, description: val }));
                          }}
                          placeholder="Type or paste HTML here..."
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Frequently Asked Questions */}
                <div className="border border-white/10 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={18} className="text-cyber-purple" />
                      <Label>Frequently Asked Questions</Label>
                    </div>
                    <Switch
                      checked={editingService?.show_faq ?? newService.show_faq}
                      onCheckedChange={(v) => editingService ? setEditingService({...editingService, show_faq: v}) : setNewService({...newService, show_faq: v})}
                    />
                  </div>
                  {(editingService?.show_faq ?? newService.show_faq) && (
                    <div className="space-y-2">
                      {(editingService?.faq ?? newService.faq ?? []).map((item, i) => (
                        <div key={i} className="flex gap-2">
                          <Input placeholder="Question" value={item.question} onChange={(e) => {
                            const faq = [...(editingService?.faq ?? newService.faq)];
                            faq[i] = { ...faq[i], question: e.target.value };
                            editingService ? setEditingService({...editingService, faq}) : setNewService({...newService, faq});
                          }} className="flex-1 bg-deep-navy border-white/10 text-sm" />
                          <Input placeholder="Answer" value={item.answer} onChange={(e) => {
                            const faq = [...(editingService?.faq ?? newService.faq)];
                            faq[i] = { ...faq[i], answer: e.target.value };
                            editingService ? setEditingService({...editingService, faq}) : setNewService({...newService, faq});
                          }} className="flex-1 bg-deep-navy border-white/10 text-sm" />
                          <Button type="button" size="sm" variant="ghost" className="text-red-400 shrink-0" onClick={() => {
                            const faq = (editingService?.faq ?? newService.faq).filter((_, j) => j !== i);
                            editingService ? setEditingService({...editingService, faq}) : setNewService({...newService, faq});
                          }}><Trash2 size={14} /></Button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="outline" className="w-full border-dashed border-cyber-purple/50 text-cyber-purple" onClick={() => {
                        const faq = [...(editingService?.faq ?? newService.faq), { question: '', answer: '' }];
                        editingService ? setEditingService({...editingService, faq}) : setNewService({...newService, faq});
                      }}>+ Add FAQ</Button>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="border border-white/10 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks size={18} className="text-cyber-purple" />
                      <Label>Requirements</Label>
                    </div>
                    <Switch
                      checked={editingService?.show_requirements ?? newService.show_requirements}
                      onCheckedChange={(v) => editingService ? setEditingService({...editingService, show_requirements: v}) : setNewService({...newService, show_requirements: v})}
                    />
                  </div>
                  {(editingService?.show_requirements ?? newService.show_requirements) && (
                    <div className="space-y-2">
                      {(editingService?.requirements ?? newService.requirements ?? []).map((text, i) => (
                        <div key={i} className="flex gap-2">
                          <Input value={text} onChange={(e) => {
                            const req = [...(editingService?.requirements ?? newService.requirements)];
                            req[i] = e.target.value;
                            editingService ? setEditingService({...editingService, requirements: req}) : setNewService({...newService, requirements: req});
                          }} className="flex-1 bg-deep-navy border-white/10 text-sm" placeholder="Requirement" />
                          <Button type="button" size="sm" variant="ghost" className="text-red-400 shrink-0" onClick={() => {
                            const req = (editingService?.requirements ?? newService.requirements).filter((_, j) => j !== i);
                            editingService ? setEditingService({...editingService, requirements: req}) : setNewService({...newService, requirements: req});
                          }}><Trash2 size={14} /></Button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="outline" className="w-full border-dashed border-cyber-purple/50 text-cyber-purple" onClick={() => {
                        const req = [...(editingService?.requirements ?? newService.requirements), ''];
                        editingService ? setEditingService({...editingService, requirements: req}) : setNewService({...newService, requirements: req});
                      }}>+ Add Requirement</Button>
                    </div>
                  )}
                </div>

                {/* About This Service */}
                <div className="border border-white/10 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-cyber-purple" />
                      <Label>About This Service</Label>
                    </div>
                    <Switch
                      checked={editingService?.show_about ?? newService.show_about}
                      onCheckedChange={(v) => editingService ? setEditingService({...editingService, show_about: v}) : setNewService({...newService, show_about: v})}
                    />
                  </div>
                  {(editingService?.show_about ?? newService.show_about) && (
                    <div className="space-y-3">
                      <Textarea value={editingService?.about?.description ?? newService.about?.description ?? ''} onChange={(e) => {
                        const about = { ...(editingService?.about ?? newService.about), description: e.target.value };
                        editingService ? setEditingService({...editingService, about}) : setNewService({...newService, about});
                      }} placeholder="Main description" className="min-h-[60px] bg-deep-navy border-white/10 text-sm" />
                      <div className="space-y-2">
                        {(editingService?.about?.items ?? newService.about?.items ?? []).map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <Input placeholder="Title (e.g. Non-Drop Guarantee)" value={item.title} onChange={(e) => {
                              const items = [...(editingService?.about?.items ?? newService.about?.items)];
                              items[i] = { ...items[i], title: e.target.value };
                              const about = { ...(editingService?.about ?? newService.about), items };
                              editingService ? setEditingService({...editingService, about}) : setNewService({...newService, about});
                            }} className="w-48 shrink-0 bg-deep-navy border-white/10 text-sm" />
                            <Input placeholder="Description" value={item.text} onChange={(e) => {
                              const items = [...(editingService?.about?.items ?? newService.about?.items)];
                              items[i] = { ...items[i], text: e.target.value };
                              const about = { ...(editingService?.about ?? newService.about), items };
                              editingService ? setEditingService({...editingService, about}) : setNewService({...newService, about});
                            }} className="flex-1 bg-deep-navy border-white/10 text-sm" />
                            <Button type="button" size="sm" variant="ghost" className="text-red-400 shrink-0" onClick={() => {
                              const items = (editingService?.about?.items ?? newService.about?.items).filter((_, j) => j !== i);
                              const about = { ...(editingService?.about ?? newService.about), items };
                              editingService ? setEditingService({...editingService, about}) : setNewService({...newService, about});
                            }}><Trash2 size={14} /></Button>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" className="w-full border-dashed border-cyber-purple/50 text-cyber-purple" onClick={() => {
                          const items = [...(editingService?.about?.items ?? newService.about?.items), { title: '', text: '' }];
                          const about = { ...(editingService?.about ?? newService.about), items };
                          editingService ? setEditingService({...editingService, about}) : setNewService({...newService, about});
                        }}>+ Add Line</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-left text-sm font-medium text-cyber-purple hover:text-cyber-purple/80">
                    {advancedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    Advanced Settings
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2 border-t border-white/10 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Mode</Label>
                        <Select
                          value={editingService?.mode ?? newService.mode ?? 'Auto'}
                          onValueChange={(v) => editingService ? setEditingService({...editingService, mode: v}) : setNewService({...newService, mode: v})}
                        >
                          <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-deep-navy border-white/10">
                            <SelectItem value="Auto">Auto</SelectItem>
                            <SelectItem value="Manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Service type</Label>
                        <Select
                          value={editingService?.service_type ?? newService.service_type ?? 'Default'}
                          onValueChange={(v) => editingService ? setEditingService({...editingService, service_type: v}) : setNewService({...newService, service_type: v})}
                        >
                          <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-deep-navy border-white/10">
                            <SelectItem value="Default">Default</SelectItem>
                            <SelectItem value="Custom Comments">Custom Comments</SelectItem>
                            <SelectItem value="Custom Comments Package">Custom Comments Package</SelectItem>
                            <SelectItem value="Comment Likes">Comment Likes</SelectItem>
                            <SelectItem value="Mentions">Mentions</SelectItem>
                            <SelectItem value="Mentions with Hashtags">Mentions with Hashtags</SelectItem>
                            <SelectItem value="Mentions Custom List">Mentions Custom List</SelectItem>
                            <SelectItem value="Mentions Hashtag">Mentions Hashtag</SelectItem>
                            <SelectItem value="Mentions User Followers">Mentions User Followers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Deny link duplicates</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild><Info size={14} className="text-gray-500" /></TooltipTrigger>
                          <TooltipContent className="bg-deep-navy border-white/10">Prevent duplicate orders for the same link</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Select
                        value={editingService?.deny_link_duplicates ?? newService.deny_link_duplicates ?? 'No'}
                        onValueChange={(v) => editingService ? setEditingService({...editingService, deny_link_duplicates: v}) : setNewService({...newService, deny_link_duplicates: v})}
                      >
                        <SelectTrigger className="ml-2 w-36 bg-deep-navy border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-deep-navy border-white/10">
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Until complete">Until complete</SelectItem>
                          <SelectItem value="Always">Always</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border border-white/10 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Enable Drip Feed</Label>
                        <Switch
                          checked={editingService?.drip_feed ?? newService.drip_feed ?? false}
                          onCheckedChange={(v) => editingService ? setEditingService({...editingService, drip_feed: v}) : setNewService({...newService, drip_feed: v})}
                        />
                      </div>
                      {(editingService?.drip_feed ?? newService.drip_feed) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Min interval (min)</Label>
                            <Input type="number" min={1} value={editingService?.drip_feed_min_interval ?? newService.drip_feed_min_interval ?? 1}
                              onChange={(e) => editingService ? setEditingService({...editingService, drip_feed_min_interval: parseInt(e.target.value) || 1}) : setNewService({...newService, drip_feed_min_interval: parseInt(e.target.value) || 1})}
                              className="mt-2 bg-deep-navy border-white/10" />
                          </div>
                          <div>
                            <Label>Max interval (min)</Label>
                            <Input type="number" min={1} value={editingService?.drip_feed_max_interval ?? newService.drip_feed_max_interval ?? 60}
                              onChange={(e) => editingService ? setEditingService({...editingService, drip_feed_max_interval: parseInt(e.target.value) || 60}) : setNewService({...newService, drip_feed_max_interval: parseInt(e.target.value) || 60})}
                              className="mt-2 bg-deep-navy border-white/10" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label>Increment</Label>
                          <Input type="number" min={0} value={editingService?.increment ?? newService.increment ?? 0}
                            onChange={(e) => editingService ? setEditingService({...editingService, increment: parseInt(e.target.value) || 0}) : setNewService({...newService, increment: parseInt(e.target.value) || 0})}
                            className="mt-2 bg-deep-navy border-white/10" />
                        </div>
                        <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild><Info size={14} className="text-gray-500" /></TooltipTrigger>
                            <TooltipContent className="bg-deep-navy border-white/10">Quantity must be multiple of this</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label>Overflow %</Label>
                          <Input type="number" min={0} step="0.1" value={editingService?.overflow_percent ?? newService.overflow_percent ?? 0}
                            onChange={(e) => editingService ? setEditingService({...editingService, overflow_percent: parseFloat(e.target.value) || 0}) : setNewService({...newService, overflow_percent: parseFloat(e.target.value) || 0})}
                            className="mt-2 bg-deep-navy border-white/10" />
                        </div>
                        <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild><Info size={14} className="text-gray-500" /></TooltipTrigger>
                            <TooltipContent className="bg-deep-navy border-white/10">Allow exceed max by this %</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="border border-white/10 rounded-lg p-3 space-y-3">
                      <Label className="flex items-center gap-1"><Link2 size={14} /> API Mapping</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Provider</Label>
                          <Select
                            value={editingService?.provider_id ?? newService.provider_id ?? ''}
                            onValueChange={(v) => editingService ? setEditingService({...editingService, provider_id: v}) : setNewService({...newService, provider_id: v})}
                          >
                            <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent className="bg-deep-navy border-white/10">
                              {providers.map(p => <SelectItem key={p.provider_id} value={p.provider_id}>{p.alias || p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Provider Service ID</Label>
                          <div className="flex gap-2 mt-2">
                            <Input value={editingService?.provider_service_id ?? newService.provider_service_id ?? ''}
                              onChange={(e) => editingService ? setEditingService({...editingService, provider_service_id: e.target.value}) : setNewService({...newService, provider_service_id: e.target.value})}
                              placeholder="e.g. 123" className="bg-deep-navy border-white/10 flex-1" />
                            <Button type="button" size="sm" variant="outline" className="border-cyber-purple/50"
                              onClick={async () => {
                                const pid = editingService?.provider_id ?? newService.provider_id;
                                if (!pid) { toast.error('Select a provider first'); return; }
                                setFetchingProviderServices(true);
                                try {
                                  const headers = token ? { Authorization: `Bearer ${token}` } : {};
                                  const res = await api.get(`/admin/providers/${pid}/services`, { headers, withCredentials: true });
                                  setProviderServices(res.data?.services ?? []);
                                  setProviderServicesModal(true);
                                } catch (e) {
                                  toast.error(e.response?.data?.detail || 'Failed to fetch provider services');
                                } finally {
                                  setFetchingProviderServices(false);
                                }
                              }}
                              disabled={fetchingProviderServices || !(editingService?.provider_id ?? newService.provider_id)}>
                              {fetchingProviderServices ? '...' : 'Fetch'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border border-white/10 rounded-lg p-3 space-y-3">
                      <Label className="flex items-center gap-1">Refill Settings</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Enable Refill Button</span>
                        <Switch
                          checked={editingService?.refill_enabled ?? newService.refill_enabled ?? false}
                          onCheckedChange={(v) => editingService ? setEditingService({ ...editingService, refill_enabled: v }) : setNewService({ ...newService, refill_enabled: v })}
                        />
                      </div>
                      {(editingService?.refill_enabled ?? newService.refill_enabled) && (
                        <>
                          <div className="text-xs text-gray-500 mt-2">Refill window (days after completion)</div>
                          <div className="flex flex-wrap gap-4 items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="refill_days"
                                checked={(editingService?.refill_days ?? newService.refill_days) === 30}
                                onChange={() => editingService ? setEditingService({ ...editingService, refill_days: 30 }) : setNewService({ ...newService, refill_days: 30 })}
                                className="text-cyber-purple"
                              />
                              <span className="text-sm">30 Days</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="refill_days"
                                checked={(editingService?.refill_days ?? newService.refill_days) === 60}
                                onChange={() => editingService ? setEditingService({ ...editingService, refill_days: 60 }) : setNewService({ ...newService, refill_days: 60 })}
                                className="text-cyber-purple"
                              />
                              <span className="text-sm">60 Days</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="refill_days"
                                checked={[30, 60].indexOf(editingService?.refill_days ?? newService.refill_days) === -1}
                                onChange={() => {
                                  const current = editingService?.refill_days ?? newService.refill_days ?? 30;
                                  const n = [30, 60].indexOf(current) === -1 ? current : 90;
                                  editingService ? setEditingService({ ...editingService, refill_days: n }) : setNewService({ ...newService, refill_days: n });
                                }}
                                className="text-cyber-purple"
                              />
                              <span className="text-sm">Custom</span>
                            </label>
                            {[30, 60].indexOf(editingService?.refill_days ?? newService.refill_days) === -1 && (
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                value={editingService?.refill_days ?? newService.refill_days ?? 30}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10) || 30;
                                  const n = Math.max(1, Math.min(365, v));
                                  editingService ? setEditingService({ ...editingService, refill_days: n }) : setNewService({ ...newService, refill_days: n });
                                }}
                                className="w-20 h-8 bg-deep-navy border-white/10"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Cooldown: 24 hours between refill requests (fixed)</p>
                        </>
                      )}
                    </div>
                    <div className="border border-white/10 rounded-lg p-3 space-y-3">
                      <Label className="flex items-center gap-1">Start Count Settings</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Auto-fetch Start Count</span>
                        <Switch
                          checked={editingService?.start_count_enabled ?? newService.start_count_enabled ?? false}
                          onCheckedChange={(v) => editingService ? setEditingService({ ...editingService, start_count_enabled: v }) : setNewService({ ...newService, start_count_enabled: v })}
                        />
                      </div>
                      {(editingService?.start_count_enabled ?? newService.start_count_enabled) && (
                        <>
                          <div className="text-xs text-gray-500 mt-2">Platform</div>
                          <Select
                            value={editingService?.start_count_platform ?? newService.start_count_platform ?? 'instagram'}
                            onValueChange={(v) => editingService ? setEditingService({ ...editingService, start_count_platform: v }) : setNewService({ ...newService, start_count_platform: v })}
                          >
                            <SelectTrigger className="mt-1 bg-deep-navy border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-deep-navy border-white/10">
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="twitter">X (Twitter)</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-gray-500 mt-2">Metric to fetch</div>
                          <Select
                            value={editingService?.start_count_metric ?? newService.start_count_metric ?? 'likes'}
                            onValueChange={(v) => editingService ? setEditingService({ ...editingService, start_count_metric: v }) : setNewService({ ...newService, start_count_metric: v })}
                          >
                            <SelectTrigger className="mt-1 bg-deep-navy border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-deep-navy border-white/10">
                              {(editingService?.start_count_platform ?? newService.start_count_platform) === 'instagram' && (
                                <>
                                  <SelectItem value="likes">Likes</SelectItem>
                                  <SelectItem value="views">Views</SelectItem>
                                  <SelectItem value="followers">Followers</SelectItem>
                                  <SelectItem value="comments">Comments</SelectItem>
                                </>
                              )}
                              {(editingService?.start_count_platform ?? newService.start_count_platform) === 'youtube' && (
                                <>
                                  <SelectItem value="views">Views</SelectItem>
                                  <SelectItem value="likes">Likes</SelectItem>
                                  <SelectItem value="subscribers">Subscribers</SelectItem>
                                </>
                              )}
                              {(editingService?.start_count_platform ?? newService.start_count_platform) === 'facebook' && (
                                <>
                                  <SelectItem value="likes">Likes</SelectItem>
                                  <SelectItem value="followers">Followers</SelectItem>
                                </>
                              )}
                              {(editingService?.start_count_platform ?? newService.start_count_platform) === 'twitter' && (
                                <>
                                  <SelectItem value="likes">Likes</SelectItem>
                                  <SelectItem value="retweets">Retweets</SelectItem>
                                  <SelectItem value="followers">Followers</SelectItem>
                                </>
                              )}
                              {![ 'instagram', 'youtube', 'facebook', 'twitter' ].includes(editingService?.start_count_platform ?? newService.start_count_platform) && (
                                <SelectItem value="likes">Likes</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-gray-500 mt-2">Fallback if fetch fails</div>
                          <Input
                            type="number"
                            min={0}
                            value={editingService?.start_count_fallback ?? newService.start_count_fallback ?? 0}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10) || 0;
                              editingService ? setEditingService({ ...editingService, start_count_fallback: n }) : setNewService({ ...newService, start_count_fallback: n });
                            }}
                            className="mt-1 w-24 bg-deep-navy border-white/10"
                          />
                        </>
                      )}
                    </div>
                    <div>
                      <Label>Visibility</Label>
                      <Select
                        value={editingService?.visibility ?? newService.visibility ?? 'public'}
                        onValueChange={(v) => editingService ? setEditingService({...editingService, visibility: v}) : setNewService({...newService, visibility: v})}
                      >
                        <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-deep-navy border-white/10">
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="hidden">Hidden</SelectItem>
                          <SelectItem value="specific_users">Specific users only</SelectItem>
                        </SelectContent>
                      </Select>
                      {(editingService?.visibility ?? newService.visibility) === 'specific_users' && (
                        <div className="mt-2 space-y-2">
                          <Label className="text-xs text-gray-400">Visible to selected users</Label>
                          <div className="flex flex-wrap gap-2 items-center">
                            {(editingService?.visible_to_users ?? newService.visible_to_users ?? []).map((uid) => (
                              <Badge key={uid} variant="secondary" className="bg-white/10 text-gray-300">
                                {uid}
                                <button
                                  type="button"
                                  className="ml-1 hover:text-red-400"
                                  onClick={() => {
                                    const arr = (editingService?.visible_to_users ?? newService.visible_to_users ?? []).filter((x) => x !== uid);
                                    editingService ? setEditingService({...editingService, visible_to_users: arr}) : setNewService({...newService, visible_to_users: arr});
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-cyber-purple/50 text-cyber-purple"
                              onClick={() => setUserPickerOpen(true)}
                            >
                              + Add users
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cancel window (min)</Label>
                        <Input type="number" min={0} value={editingService?.cancel_window_minutes ?? newService.cancel_window_minutes ?? 0}
                          onChange={(e) => editingService ? setEditingService({...editingService, cancel_window_minutes: parseInt(e.target.value) || 0}) : setNewService({...newService, cancel_window_minutes: parseInt(e.target.value) || 0})}
                          className="mt-2 bg-deep-navy border-white/10" placeholder="0 = disabled" />
                      </div>
                      <div className="flex items-center justify-between pt-6">
                        <Label>Partial refund on under-delivery</Label>
                        <Switch
                          checked={editingService?.partial_refund ?? newService.partial_refund ?? false}
                          onCheckedChange={(v) => editingService ? setEditingService({...editingService, partial_refund: v}) : setNewService({...newService, partial_refund: v})}
                        />
                      </div>
                      <div>
                        <Label>Bulk discount %</Label>
                        <Input type="number" min={0} step="0.1" value={editingService?.bulk_discount_percent ?? newService.bulk_discount_percent ?? 0}
                          onChange={(e) => editingService ? setEditingService({...editingService, bulk_discount_percent: parseFloat(e.target.value) || 0}) : setNewService({...newService, bulk_discount_percent: parseFloat(e.target.value) || 0})}
                          className="mt-2 bg-deep-navy border-white/10" />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={editingService?.is_active ?? newService.is_active}
                    onCheckedChange={(val) => editingService ? setEditingService({...editingService, is_active: val}) : setNewService({...newService, is_active: val})}
                  />
                </div>
                <Button
                  onClick={editingService ? handleUpdateService : handleCreateService}
                  className="w-full bg-cyber-purple text-white"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Provider Services Modal */}
          <Dialog open={providerServicesModal} onOpenChange={setProviderServicesModal}>
            <DialogContent className="glass border-cyber-purple/30 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Select Provider Service</DialogTitle>
                <DialogDescription>
                  Choose the provider service to map to this panel service.
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-deep-navy">
                    <tr>
                      <th className="text-left p-2 text-gray-400">ID</th>
                      <th className="text-left p-2 text-gray-400">Name</th>
                      <th className="text-right p-2 text-gray-400">Rate</th>
                      <th className="text-right p-2 text-gray-400">Min</th>
                      <th className="text-right p-2 text-gray-400">Max</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {providerServices.map((ps) => (
                      <tr key={ps.service_id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-2 font-mono text-gray-400">{ps.service_id}</td>
                        <td className="p-2 text-white">{ps.name}</td>
                        <td className="p-2 text-right text-electric-blue">{formatPrice(ps.rate)}</td>
                        <td className="p-2 text-right text-gray-400">{ps.min}</td>
                        <td className="p-2 text-right text-gray-400">{ps.max}</td>
                        <td className="p-2">
                          <Button size="sm" variant="outline" className="border-cyber-purple/50 text-cyber-purple"
                            onClick={() => {
                              if (editingService) {
                                setEditingService({ ...editingService, provider_service_id: ps.service_id, rate: ps.rate, min_order: ps.min, max_order: ps.max });
                              } else {
                                setNewService({ ...newService, provider_service_id: ps.service_id, rate: ps.rate, min_order: ps.min, max_order: ps.max });
                              }
                              setProviderServicesModal(false);
                            }}
                          >Use</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {providerServices.length === 0 && <p className="p-4 text-gray-500 text-center">No services found</p>}
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirm Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { if (!open) setServiceToDelete(null); setDeleteConfirmOpen(open); }}>
            <DialogContent className="glass border-red-500/30">
              <DialogHeader>
                <DialogTitle className="font-exo text-white">Delete Service</DialogTitle>
                <DialogDescription>
                  Delete this service permanently. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="text-gray-300 text-sm">Delete this service? This cannot be undone.</div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => { setDeleteConfirmOpen(false); setServiceToDelete(null); }}>Cancel</Button>
                <Button className="bg-red-500 hover:bg-red-500/90 text-white" onClick={handleDeleteService}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* User Picker Modal */}
          <Dialog open={userPickerOpen} onOpenChange={(open) => { setUserPickerOpen(open); if (!open) setUserSearch(''); }}>
            <DialogContent className="glass border-cyber-purple/30 max-w-md max-h-[70vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Select Users</DialogTitle>
                <DialogDescription>
                  Select which users can view this service.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mb-3 bg-deep-navy border-white/10"
              />
              <div className="overflow-y-auto flex-1 min-h-0 space-y-1">
                {loadingUsers ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : (
                  usersList.map((u) => {
                    const arr = editingService?.visible_to_users ?? newService.visible_to_users ?? [];
                    const selected = arr.includes(u.user_id);
                    return (
                      <div
                        key={u.user_id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-white/5 ${selected ? 'bg-cyber-purple/20' : ''}`}
                        onClick={() => {
                          const next = selected ? arr.filter((x) => x !== u.user_id) : [...arr, u.user_id];
                          editingService ? setEditingService({ ...editingService, visible_to_users: next }) : setNewService({ ...newService, visible_to_users: next });
                        }}
                      >
                        <span className="text-white text-sm">{u.email || u.name || u.user_id}</span>
                        {selected && <span className="text-cyber-purple text-xs">✓</span>}
                      </div>
                    );
                  })
                )}
                {!loadingUsers && usersList.length === 0 && <p className="p-4 text-gray-500 text-center">No users found</p>}
              </div>
              <Button variant="outline" className="mt-3 border-cyber-purple/50" onClick={() => setUserPickerOpen(false)}>Done</Button>
            </DialogContent>
          </Dialog>
            <Button
              variant="outline"
              className="border-cyber-purple/50 text-cyber-purple hover:bg-cyber-purple/10"
              onClick={() => setImportModalOpen(true)}
            >
              <Download size={18} className="mr-2" />
              Import from API
            </Button>
          </div>

          <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
            <DialogContent className="glass border-cyber-purple/30 max-w-md">
              <DialogHeader>
                <DialogTitle>Import services from provider</DialogTitle>
                <DialogDescription>
                  Import provider services into your panel (with optional markup).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Provider</Label>
                  <Select value={importProviderId} onValueChange={setImportProviderId}>
                    <SelectTrigger className="mt-2 bg-deep-navy border-white/10">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-deep-navy border-white/10">
                      {providers.map((p) => (
                        <SelectItem key={p.provider_id} value={p.provider_id}>{p.alias || p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Markup % (100 = no change)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={importMarkup}
                    onChange={(e) => setImportMarkup(Number(e.target.value) || 100)}
                    className="mt-2 bg-deep-navy border-white/10"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setImportModalOpen(false)}>Cancel</Button>
                  <Button
                    className="bg-cyber-purple text-white"
                    onClick={handleImportFromProvider}
                    disabled={!importProviderId || importing}
                  >
                    {importing ? 'Importing...' : 'Import'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Services Table */}
        <Card className="glass overflow-hidden border-cyber-purple/20">
          {editOpen ? null : loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <TooltipProvider>
              <>
              <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-4">
                <BulkActionsBar
                  type="services"
                  selectedIds={bulk.selectedIds}
                  onClear={bulk.clear}
                  onApplied={fetchData}
                  onSortByRate={handleBulkSortByRate}
                  categories={categories}
                />
                <div className="flex flex-wrap gap-2 ml-auto">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40 bg-deep-navy border-white/10 h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-navy border-white/10">
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger className="w-40 bg-deep-navy border-white/10 h-9">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-navy border-white/10">
                    <SelectItem value="all">All Providers</SelectItem>
                    {providers.map(p => <SelectItem key={p.provider_id} value={p.provider_id}>{p.alias || p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 bg-deep-navy border-white/10 h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-navy border-white/10">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/10 h-9"
                  onClick={() => setShowHiddenInTable((v) => !v)}
                >
                  {showHiddenInTable ? <><LockOpen size={14} className="mr-1.5" /> Hide Hidden</> : <><Lock size={14} className="mr-1.5" /> Show Hidden</>}
                </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                <thead className="bg-cyber-purple/10">
                  <tr>
                    <th className="text-left p-3 text-gray-400 font-medium w-8" scope="col" aria-label="Drag" />
                    <th className="text-left p-3 text-gray-400 font-medium w-10" scope="col">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={filteredServices.length > 0 && filteredServices.every((s) => bulk.isSelected(s.service_id))}
                        onChange={(e) => bulk.setMany(filteredServices.map((s) => s.service_id), e.target.checked)}
                      />
                    </th>
                    <th className="text-left p-3 text-gray-400 font-medium min-w-[100px]" scope="col">ID</th>
                    <SortableTh col="service" label="Service" />
                    <SortableTh col="type" label="Type" />
                    <SortableTh col="provider" label="Provider" />
                    <th className="text-right p-3 text-gray-400 font-medium whitespace-nowrap" scope="col">
                      Provider Service ID
                    </th>
                    <th className="text-right p-3 text-gray-400 font-medium whitespace-nowrap" scope="col">Rate</th>
                    <th className="text-right p-3 text-gray-400 font-medium whitespace-nowrap" scope="col">Min</th>
                    <th className="text-right p-3 text-gray-400 font-medium whitespace-nowrap" scope="col">Max</th>
                    <th className="text-right p-3 text-gray-400 font-medium whitespace-nowrap" scope="col">Avg Time</th>
                    <SortableTh col="status" label="Status" />
                    <th className="text-center p-3 text-gray-400 font-medium w-32" scope="col">
                      <div className="flex flex-col items-center gap-1">
                        <span>Actions</span>
                        <div className="flex items-center gap-2 text-xs">
                          <button type="button" onClick={expandAll} className="text-cyber-purple hover:text-cyber-purple/80 whitespace-nowrap">Expand all</button>
                          <span className="text-white/30">|</span>
                          <button type="button" onClick={collapseAll} className="text-cyber-purple hover:text-cyber-purple/80 whitespace-nowrap">Collapse all</button>
                        </div>
                      </div>
                    </th>
                    <th className="text-right p-3 text-gray-400 font-medium w-28" scope="col" />
                  </tr>
                </thead>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  accessibility={dndAccessibility}
                >
                  <SortableContext items={flatSortableIds} strategy={verticalListSortingStrategy}>
                <tbody>
                  {grouped.map((group) => {
                    const isCollapsed = collapsedCategories.has(group.category_id);
                    const catServiceIds = group.services.map(s => s.service_id);
                    const allSelected = group.services.length > 0 && group.services.every(s => bulk.isSelected(s.service_id));
                    return (
                      <React.Fragment key={group.category_id}>
                        {/* Category header row */}
                        <SortableCategoryRow
                          group={group}
                          isCollapsed={isCollapsed}
                          catServiceIds={catServiceIds}
                          allSelected={allSelected}
                          toggleCollapse={toggleCollapse}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              aria-label={`Select all in ${group.name}`}
                              checked={allSelected}
                              onChange={(e) => bulk.setMany(catServiceIds, e.target.checked)}
                            />
                          </td>
                          <td className="p-3" colSpan={2}>
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={group.platform} className="w-5 h-5 rounded" />
                              <span className="font-semibold text-white">{group.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-gray-400" colSpan={8}>—</td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white text-xs">
                                  Actions ▾
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-deep-navy border-white/10">
                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => bulk.setMany(catServiceIds, true)}>
                                  Select all in category
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => catServiceIds.length && addToHidden(catServiceIds)}>
                                  <Lock size={14} className="mr-2" /> Hide All (private)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              className="text-cyber-purple hover:text-cyber-purple/80 text-xs"
                              onClick={() => toggleCollapse(group.category_id)}
                            >
                              {isCollapsed ? `Expand (${group.services.length})` : `Collapse (${group.services.length})`}
                              {isCollapsed ? <ChevronRight size={14} className="inline ml-0.5" /> : <ChevronDown size={14} className="inline ml-0.5" />}
                            </button>
                          </td>
                        </SortableCategoryRow>
                        {/* Service rows (when expanded) */}
                        {!isCollapsed && group.services.map((service) => (
                          <SortableServiceRow
                            key={service.service_id}
                            service={service}
                            group={group}
                            providerMap={providerMap}
                            formatPrice={formatPrice}
                            setEditingService={setEditingService}
                            setDescriptionMode={setDescriptionMode}
                            setEditOpen={setEditOpen}
                            handleToggleServiceStatus={handleToggleServiceStatus}
                            openDeleteConfirm={openDeleteConfirm}
                            isHidden={hiddenIdsSet.has(service.service_id)}
                            addToHidden={addToHidden}
                            removeFromHidden={removeFromHidden}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                aria-label={`Select ${service.service_id}`}
                                checked={bulk.isSelected(service.service_id)}
                                onChange={() => bulk.toggleOne(service.service_id)}
                              />
                            </td>
                            <td className="p-3">
                              <span className="text-gray-500 font-mono text-xs">{getServiceDisplayNumber(service.service_id) ?? service.service_id}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {hiddenIdsSet.has(service.service_id) && <Lock size={14} className="text-amber-400 shrink-0" title="Hidden (private)" />}
                                <PlatformIcon platform={service.platform || group.platform} className="w-5 h-5 rounded" />
                                <div className="flex flex-col">
                                  <span className="text-white font-medium">{service.name}</span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {service.generated_from_name ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge className="bg-violet-600/80 text-white border-violet-400/60 text-[10px] px-1.5 py-0 h-5 leading-none">
                                            ✨ Generated
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-deep-navy border-white/10 text-xs max-w-xs">
                                          Description generated from service name using AI-style rules.
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : service.ai_processed ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge className="bg-emerald-600/80 text-white border-emerald-400/60 text-[10px] px-1.5 py-0 h-5 leading-none">
                                            🤖 Rewritten
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-deep-navy border-white/10 text-xs max-w-xs">
                                          Original provider description processed by the AI description pipeline.
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge className="bg-gray-700/80 text-gray-100 border-gray-500/60 text-[10px] px-1.5 py-0 h-5 leading-none">
                                            📄 Original
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-deep-navy border-white/10 text-xs max-w-xs">
                                          Original provider description (no AI processing).
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                                {hiddenIdsSet.has(service.service_id) && <Badge variant="outline" className="text-amber-400 border-amber-400/50 text-xs">Hidden</Badge>}
                              </div>
                            </td>
                            <td className="p-3 text-gray-400 text-sm">
                              {service.service_type || service.type || 'Default'}
                            </td>
                            <td className="p-3 text-gray-400 text-sm">
                              {service.provider_id ? (providerMap[service.provider_id] ?? service.provider_id) : '—'}
                            </td>
                            <td className="p-3 text-right text-gray-400 text-sm font-mono">
                              {service.provider_service_id ? service.provider_service_id : '—'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex flex-col items-end leading-tight">
                                <span className="text-electric-blue font-bold">{formatPrice(service.rate)}</span>
                                <span className="text-[var(--text-muted)] text-xs mt-0.5">
                                  {(() => {
                                    const providerRate = getProviderRateForService(service);
                                    return providerRate !== null ? formatPrice(providerRate) : '—';
                                  })()}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-gray-400 text-sm">
                              {(service.min_order ?? 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-gray-400 text-sm">
                              {(service.max_order ?? 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-sm">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={avgTimeColorClass(avgTimesByService[service.service_id])}>
                                    {formatAvgTime(avgTimesByService[service.service_id])}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-deep-navy border-white/10">Based on last 30 days of completed orders</TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="p-3">
                              <Badge className={service.is_active ? 'status-completed' : 'status-cancelled'}>
                                {service.is_active ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </td>
                            <td className="p-3" colSpan={2}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white p-1">
                                    <MoreVertical size={18} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-deep-navy border-white/10">
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                      setEditingService({
                                        ...service,
                                        show_faq: service.show_faq ?? false,
                                        faq: Array.isArray(service.faq) && service.faq.length ? service.faq : JSON.parse(JSON.stringify(DEFAULT_FAQ)),
                                        show_requirements: service.show_requirements ?? false,
                                        requirements: Array.isArray(service.requirements) && service.requirements.length ? service.requirements : [...DEFAULT_REQUIREMENTS],
                                        show_about: service.show_about ?? false,
                                        about: service.about && (service.about.description || (service.about.items?.length)) ? service.about : JSON.parse(JSON.stringify(DEFAULT_ABOUT)),
                                      });
                                      setDescriptionMode(/<[^>]+>/.test(service.description || '') ? 'html' : 'plain');
                                      setEditOpen(true);
                                    }}
                                  >
                                    <Edit size={14} className="mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => openDuplicateModal(service)}
                                  >
                                    <Copy size={14} className="mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => handleToggleServiceStatus(service)}
                                  >
                                    {service.is_active ? (
                                      <><EyeOff size={14} className="mr-2" /> Disable</>
                                    ) : (
                                      <><Eye size={14} className="mr-2" /> Enable</>
                                    )}
                                  </DropdownMenuItem>
                                  {hiddenIdsSet.has(service.service_id) ? (
                                    <DropdownMenuItem className="cursor-pointer" onClick={() => removeFromHidden(service.service_id)}>
                                      <LockOpen size={14} className="mr-2" /> Unhide Service (private)
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem className="cursor-pointer" onClick={() => addToHidden(service.service_id)}>
                                      <Lock size={14} className="mr-2" /> Hide Service (private)
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="cursor-pointer text-red-400 focus:text-red-400"
                                    onClick={() => openDeleteConfirm(service.service_id)}
                                  >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </SortableServiceRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                  </SortableContext>
                </DndContext>
              </table>
            </div>
            </>
            </TooltipProvider>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminServices;
