import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, ShoppingCart, Clock, DollarSign, Filter,
  Instagram, Youtube, Music, Twitter, Facebook, Send, Linkedin, ChevronDown, ChevronRight,
  Zap, Shield, Sparkles,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/axios';
import { getServiceDisplayNumber, formatDisplayName, derivePlatformLabel, looksLikeId } from '../lib/utils';
import { useCurrency } from '../context/CurrencyContext';
import { useFormatRate } from '../hooks/useFormatRate';
import { useReseller } from '../context/ResellerContext';
import { useAuth } from '../App';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const platformIcons = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music,
  twitter: Twitter,
  facebook: Facebook,
  telegram: Send,
  linkedin: Linkedin,
  spotify: Music,
};

/** Derive icon from a display name or key (e.g. "Instagram" -> Instagram icon) */
function getIconForName(nameOrKey) {
  if (!nameOrKey) return Filter;
  const key = String(nameOrKey).toLowerCase();
  if (key.includes('instagram') || key.includes('insta')) return Instagram;
  if (key.includes('youtube') || key.includes('yt ')) return Youtube;
  if (key.includes('tiktok')) return Music;
  if (key.includes('twitter') || key.includes('x.com') || key === 'x') return Twitter;
  if (key.includes('facebook') || key.includes('fb ')) return Facebook;
  if (key.includes('telegram')) return Send;
  if (key.includes('linkedin')) return Linkedin;
  if (key.includes('spotify')) return Music;
  return Filter;
}

/** Resolve display name and icon for a raw platform/category string; pass categoryName when platform is an ID so we show real name + logo */
function getPlatformDisplay(platformKey, categoryName = null) {
  if (!platformKey || platformKey === '?' || String(platformKey).trim() === '') {
    return { displayName: categoryName || 'Other', Icon: getIconForName(categoryName) };
  }
  const key = String(platformKey).toLowerCase();
  const keyLooksLikeId = /^[a-z0-9]{10,}$/i.test(key) || key.length > 12;
  let displayName = categoryName && categoryName.trim()
    ? formatDisplayName(categoryName)
    : keyLooksLikeId
      ? (categoryName ? formatDisplayName(categoryName) : null) || 'Other'
      : formatDisplayName(platformKey);
  if (displayName && looksLikeId(displayName)) displayName = 'Other';
  const Icon = getIconForName(displayName || platformKey);
  return { displayName: displayName || 'Other', Icon };
}

const SORT_OPTIONS = [
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
];

function shortDescription(html, maxLen = 100) {
  if (!html) return 'High quality service with fast delivery.';
  const text = String(html).replace(/<[^>]*>/g, '').trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + '…';
}

function getBadges(service) {
  const badges = [];
  const name = (service.name || '').toLowerCase();
  const desc = (service.description || '').toLowerCase();
  const combined = name + ' ' + desc;
  if (service.avg_time && (combined.includes('fast') || combined.includes('instant') || String(service.avg_time).toLowerCase().includes('min'))) {
    badges.push({ key: 'speed', label: 'Fast', className: 'bg-blue-500/20 text-blue-400 border-blue-500/40' });
  }
  if (service.is_refillable || combined.includes('refill')) {
    const match = combined.match(/(\d+)\s*day\s*refill|refill\s*(\d+)\s*d/);
    const days = match ? (match[1] || match[2] || '') : '';
    badges.push({ key: 'refill', label: days ? `${days}D Refill` : 'Refill', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' });
  }
  if (combined.includes('premium') || combined.includes('quality') || (service.rate && service.rate > 1)) {
    badges.push({ key: 'premium', label: 'Premium', className: 'bg-amber-500/20 text-amber-400 border-amber-500/40' });
  }
  if (service.is_new || combined.includes('new')) {
    badges.push({ key: 'new', label: 'New', className: 'bg-violet-500/20 text-violet-400 border-violet-500/40' });
  }
  if (combined.includes('guarantee') && !badges.some(b => b.key === 'refill')) {
    badges.push({ key: 'guarantee', label: 'Guarantee', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' });
  }
  return badges.slice(0, 4);
}

function avgTimeToHours(avgTime) {
  if (!avgTime) return 999;
  const s = String(avgTime).toLowerCase();
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10) / 60;
  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hourMatch) return parseFloat(hourMatch[1]);
  const numMatch = s.match(/(\d+)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 999;
}

function quickOrder(service, navigate) {
  if (!service?.service_id) return;
  const categoryId = service.category_id || '';
  navigate(`/dashboard/new-order?service_id=${service.service_id}&category_id=${categoryId}`);
}

const ServicesPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { formatRate } = useFormatRate();
  const { isReseller } = useReseller();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('cheapest');
  const [collapsedPlatforms, setCollapsedPlatforms] = useState({});
  const [categoriesSectionCollapsed, setCategoriesSectionCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(60);
  const [myPricing, setMyPricing] = useState({});
  const loadMoreRef = React.useRef(null);

  const normalizeCategories = (payload) => {
    if (Array.isArray(payload?.categories)) return payload.categories;
    if (Array.isArray(payload)) return payload;
    const grouped = payload?.grouped || {};
    const groups = Array.isArray(grouped) ? grouped : Object.values(grouped);
    const flat = [];
    groups.forEach((g) => {
      (g?.categories || []).forEach((c) => {
        flat.push({
          ...c,
          category_id: String(c?.category_id || c?._id || c?.id || ''),
        });
      });
    });
    return flat.filter((c) => c.category_id);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const promises = [api.get('/services/categories', { headers, withCredentials: true })];
      if (!isReseller && token) {
        promises.push(api.get('/user/my-pricing', { headers, withCredentials: true }).catch(() => ({ data: { data: [] } })));
      }
      const results = await Promise.all(promises);
      const categoriesRes = results[0];
      const normalizedCategories = normalizeCategories(categoriesRes.data);
      setCategories(normalizedCategories);
      if (!categoryFilter && normalizedCategories.length > 0) {
        setCategoryFilter(String(normalizedCategories[0].category_id));
      }
      if (!isReseller && token && results[1]) {
        const pricingRes = results[1];
        const pricingList = Array.isArray(pricingRes.data?.data) ? pricingRes.data.data : (Array.isArray(pricingRes.data) ? pricingRes.data : []);
        const map = {};
        pricingList.forEach((p) => {
          const key = p.service_id || p.serviceId || p.service_id_hex;
          if (!key) return;
          map[String(key)] = p;
        });
        setMyPricing(map);
      } else {
        setMyPricing({});
      }
    } catch (error) {
      toast.error('Failed to load services');
      setServices([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, isReseller]);

  useEffect(() => {
    const loadByCategory = async () => {
      if (!categoryFilter) {
        setServices([]);
        return;
      }
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        if (isReseller) {
          const res = await api.get('/reseller/services', { headers, withCredentials: true });
          const all = Array.isArray(res.data?.services) ? res.data.services : [];
          setServices(all.filter((s) => String(s.category_id) === String(categoryFilter)));
          return;
        }
        const res = await api.get('/services', {
          params: { category_id: categoryFilter },
          headers,
          withCredentials: true,
        });
        setServices(Array.isArray(res.data) ? res.data : (res.data?.services || []));
      } catch {
        setServices([]);
      }
    };
    loadByCategory();
  }, [categoryFilter, token, isReseller]);

  // Use categories (admin order) as source of truth — avoid showing numeric platform ids (3, 4, 5, 6) as labels
  const orderToPlatform = useMemo(() => {
    const m = {};
    categories.forEach((c) => {
      const o = c.order != null ? Number(c.order) : NaN;
      if (!Number.isNaN(o) && (m[o] == null || c.platform)) m[o] = c.platform || m[o];
    });
    return m;
  }, [categories]);

  const categoryById = useMemo(() => {
    const m = {};
    categories.forEach((c) => { m[String(c.category_id)] = c; });
    return m;
  }, [categories]);

  const platformFromCategory = (cat) => {
    const p = cat.platform;
    if (p && typeof p === 'string' && !/^\d+$/.test(p)) return p;
    const id = String(cat.category_id || '');
    const match = id.match(/^cat_(\w+)/);
    return match ? match[1].toLowerCase() : 'other';
  };

  const platforms = useMemo(() => {
    const fromCats = [...new Set(categories.map((c) => platformFromCategory(c)).filter((p) => p && p !== 'other' && !/^\d+$/.test(String(p))))];
    const orderByPlatform = {};
    categories.forEach((c) => {
      const p = platformFromCategory(c);
      if (orderByPlatform[p] == null || (c.order != null && c.order < orderByPlatform[p])) orderByPlatform[p] = c.order ?? 9999;
    });
    return fromCats.sort((a, b) => (orderByPlatform[a] ?? 9999) - (orderByPlatform[b] ?? 9999));
  }, [categories]);

  const categoriesByPlatform = useMemo(() => {
    const map = {};
    const sorted = [...categories].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    sorted.forEach((cat) => {
      const platform = platformFromCategory(cat);
      if (!map[platform]) map[platform] = [];
      map[platform].push(cat);
    });
    return map;
  }, [categories]);

  /** Map platform key -> real category name for display (so "Mmq6pri61lq7" shows as "Instagram" with logo) */
  const platformToDisplayName = useMemo(() => {
    const m = {};
    const sorted = [...categories].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    sorted.forEach((cat) => {
      const p = platformFromCategory(cat);
      const label = derivePlatformLabel(cat);
      const raw = (cat.name || formatDisplayName(cat.category_id || '')).trim();
      const firstWord = raw ? raw.split(/\s+/)[0] || raw : '';
      if (label) {
        m[p] = label;
        return;
      }
      if (m[p] == null && firstWord) m[p] = firstWord;
    });
    sorted.forEach((cat) => {
      const p = platformFromCategory(cat);
      const label = derivePlatformLabel(cat);
      if (label && (m[p] == null || looksLikeId(m[p]))) m[p] = label;
    });
    return m;
  }, [categories]);

  /** Group platform keys by display name so we show one "Instagram" / "YouTube" instead of 7 duplicates */
  const { displayNameToPlatformKeys, sortedDisplayNames } = useMemo(() => {
    const nameToKeys = {};
    const orderByDisplayName = {};
    platforms.forEach((p) => {
      const name = platformToDisplayName[p] || getPlatformDisplay(p).displayName;
      if (!nameToKeys[name]) nameToKeys[name] = [];
      nameToKeys[name].push(p);
      const o = categories.find((c) => platformFromCategory(c) === p)?.order ?? 9999;
      if (orderByDisplayName[name] == null || o < orderByDisplayName[name]) orderByDisplayName[name] = o;
    });
    const sorted = Object.keys(nameToKeys).filter((n) => n && n !== 'Other').sort(
      (a, b) => (orderByDisplayName[a] ?? 9999) - (orderByDisplayName[b] ?? 9999)
    );
    if (nameToKeys['Other']?.length) sorted.push('Other');
    return { displayNameToPlatformKeys: nameToKeys, sortedDisplayNames: sorted };
  }, [platforms, platformToDisplayName, categories]);

  const effectivePlatform = (service) => {
    const p = service.platform;
    if (p == null) return categoryById[String(service.category_id)]?.platform ?? null;
    if (typeof p === 'number') return orderToPlatform[p] ?? null;
    if (/^\d+$/.test(String(p))) return orderToPlatform[Number(p)] ?? null;
    return p;
  };

  const filteredAndSorted = useMemo(() => {
    let list = services.filter((s) => {
      if (search) {
        const q = search.trim().toLowerCase();
        const nameMatch = (s.name || '').toLowerCase().includes(q);
        const descMatch = (s.description || '').toLowerCase().includes(q);
        const serviceIdMatch = String(s.service_id || '').toLowerCase().includes(q);
        const displayNum = getServiceDisplayNumber(s.service_id);
        const displayNumMatch = displayNum != null && String(displayNum).includes(q.replace(/^#/, '').trim());
        if (!nameMatch && !descMatch && !serviceIdMatch && !displayNumMatch) return false;
      }
      if (categoryFilter && String(s.category_id) !== String(categoryFilter)) return false;
      return true;
    });
    switch (sortBy) {
      case 'cheapest':
        list = [...list].sort((a, b) => (a.rate || 0) - (b.rate || 0));
        break;
      case 'fastest':
        list = [...list].sort((a, b) => avgTimeToHours(a.avg_time) - avgTimeToHours(b.avg_time));
        break;
      case 'popular':
        list = [...list].sort((a, b) => (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0) || (b.rate || 0) - (a.rate || 0));
        break;
      case 'newest':
        list = [...list].sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
        break;
      default:
        break;
    }
    return list;
  }, [services, search, categoryFilter, sortBy]);

  const visibleServices = useMemo(() => filteredAndSorted.slice(0, visibleCount), [filteredAndSorted, visibleCount]);
  const hasMore = visibleCount < filteredAndSorted.length;

  useEffect(() => {
    setVisibleCount(60);
  }, [search, categoryFilter, sortBy]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((n) => Math.min(n + 60, filteredAndSorted.length));
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filteredAndSorted.length]);

  const togglePlatformCollapse = (platform) => {
    setCollapsedPlatforms((prev) => ({ ...prev, [platform]: prev[platform] === false }));
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <Navbar />
      <Toaster position="top-right" theme="dark" />

      <div className="pt-navbar flex-1 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 flex-1 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-exo font-bold mb-2">
            OUR <span className="neon-text">SERVICES</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Choose from hundreds of services across all major social media platforms
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0">
          {/* LEFT SIDEBAR - Same as dashboard */}
          <aside className="lg:w-64 shrink-0 flex flex-col gap-4">
            <Card className="glass p-4 lg:sticky lg:top-24 shadow-lg rounded-xl border-white/10">
              <h3 className="font-exo font-bold text-white mb-3 flex items-center gap-2">
                <Filter size={18} />
                Filters
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <Input
                    placeholder="Search or enter service # (e.g. 1704)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 bg-deep-navy border-white/10 text-sm rounded-lg"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setCategoriesSectionCollapsed((c) => !c)}
                  className="flex items-center gap-2 w-full text-left px-0 py-1 text-xs font-medium text-gray-500 hover:text-white transition-colors"
                >
                  {categoriesSectionCollapsed ? <ChevronRight size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                  Categories
                </button>
                {!categoriesSectionCollapsed && (
                <div className="space-y-0.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      categoryFilter === '' ? 'bg-electric-blue/20 text-electric-blue' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    All Categories
                  </button>
                  {sortedDisplayNames.map((displayName) => {
                    const platformKeys = displayNameToPlatformKeys[displayName] || [];
                    const cats = platformKeys.flatMap((p) => categoriesByPlatform[p] || [])
                      .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
                    if (cats.length === 0) return null;
                    const isCollapsed = collapsedPlatforms[displayName] !== false;
                    const { Icon } = getPlatformDisplay(null, displayName);
                    return (
                      <div key={displayName} className="rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => togglePlatformCollapse(displayName)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          <Icon size={16} className="shrink-0 text-electric-blue" />
                          <span className="truncate">{displayName}</span>
                        </button>
                        {!isCollapsed && (
                          <div className="pl-6 pr-2 pb-1 space-y-0.5">
                            {cats.map((cat) => (
                              <button
                                key={cat.category_id}
                                type="button"
                                onClick={() => setCategoryFilter(cat.category_id)}
                                className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors truncate ${
                                  categoryFilter === cat.category_id ? 'bg-electric-blue/20 text-electric-blue' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                {formatDisplayName(cat.name || cat.category_id)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </Card>
          </aside>

          {/* MAIN AREA - Same as dashboard */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative hidden sm:block w-48 lg:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 bg-deep-navy border-white/10 rounded-lg text-sm"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-9 bg-deep-navy border-white/10 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-navy border-white/10">
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-gray-200">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                  className="border-white/10 rounded-lg"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
                <Link to="/dashboard/new-order">
                  <Button className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold rounded-lg hidden sm:inline-flex">
                    <ShoppingCart size={16} className="mr-2" />
                    New Order
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:hidden mb-4">
              <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full bg-deep-navy border-white/10 rounded-lg">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-deep-navy border-white/10">
                  <SelectItem value="all" className="text-gray-200">All Categories</SelectItem>
                  {categories.map((cat) => {
                    const { Icon } = getPlatformDisplay(cat.platform);
                    return (
                      <SelectItem key={cat.category_id} value={cat.category_id} className="text-gray-200">
                        <span className="flex items-center gap-2">
                          <Icon size={14} className="shrink-0 text-electric-blue" />
                          {formatDisplayName(cat.name || cat.category_id)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full" />
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="text-center py-20 text-gray-400 rounded-xl bg-white/5">No services found. Try different filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {visibleServices.map((service, idx) => {
                    const platformKey = effectivePlatform(service) || service.platform;
                    const displayNameForIcon = platformToDisplayName[platformKey];
                    const PlatformIcon = getIconForName(displayNameForIcon || platformKey) || platformIcons[platformKey] || Filter;
                    const serviceKey = String(service._id || service.id || service.service_id || '');
                    const special = serviceKey && myPricing[serviceKey];
                    const badges = getBadges(service);
                    const serviceNum = getServiceDisplayNumber(service.service_id);
                    return (
                      <motion.div
                        key={service.service_id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                        className="group"
                      >
                        <Card className="h-full flex flex-col glass p-4 rounded-xl border-white/10 shadow-lg hover:shadow-electric-blue/10 hover:border-electric-blue/30 transition-all duration-200">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-electric-blue/10 transition-colors">
                              <PlatformIcon size={20} className="text-electric-blue" />
                            </div>
                            <div className="min-w-0 flex-1">
                              {serviceNum != null && (
                                <span className="text-gray-500 font-mono text-xs">#{serviceNum}</span>
                              )}
                              <h4 className="font-bold text-white leading-tight line-clamp-2">{formatDisplayName(service.name || service.service_id)}</h4>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-shrink-0 [&_b]:font-bold [&_i]:italic" dangerouslySetInnerHTML={{ __html: shortDescription(service.description) }} />
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {badges.map((b) => (
                              <span key={b.key} className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${b.className}`}>
                                {b.key === 'speed' && <Zap size={10} className="mr-0.5" />}
                                {b.key === 'refill' && <RefreshCw size={10} className="mr-0.5" />}
                                {b.key === 'premium' && <Shield size={10} className="mr-0.5" />}
                                {b.key === 'new' && <Sparkles size={10} className="mr-0.5" />}
                                {b.label}
                              </span>
                            ))}
                            {service.avg_time && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-gray-400 border border-white/10">
                                <Clock size={10} />
                                {service.avg_time}
                              </span>
                            )}
                          </div>
                          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                              <span>Min: {(service.min_order ?? 0).toLocaleString()}</span>
                              <span>Max: {(service.max_order ?? 0).toLocaleString()}</span>
                              {special ? (
                                <>
                                  <span className="line-through text-gray-500">
                                    {formatRate(service.rate)} / 1K
                                  </span>
                                  <span className="text-neon-green font-semibold">
                                    {formatRate(special.final_price ?? special.original_price ?? service.rate)} / 1K
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green text-[11px] font-semibold border border-neon-green/40">
                                    Special Price
                                  </span>
                                </>
                              ) : (
                                <span className="text-electric-blue font-semibold">{formatRate(service.rate)} / 1K</span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold rounded-lg shrink-0"
                              onClick={() => quickOrder(service, navigate)}
                            >
                              Order Now
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {hasMore && <div ref={loadMoreRef} className="col-span-full h-8 flex items-center justify-center text-gray-500 text-sm">Loading more…</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      <Link
        to="/dashboard/new-order"
        className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full bg-neon-green text-black p-4 shadow-lg hover:bg-neon-green/90 transition-transform hover:scale-105"
        aria-label="New Order"
      >
        <ShoppingCart size={24} />
      </Link>
      </div>
    </div>
  );
};

export default ServicesPage;
