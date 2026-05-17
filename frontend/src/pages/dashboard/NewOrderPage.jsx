import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link as LinkIcon, Hash, DollarSign, Clock, Info, AlertCircle, Check, ShoppingCart, CheckCircle, Star, Youtube, Instagram, Send, MessageCircle, Globe, Facebook, Music, Loader2, BarChart2, RefreshCw, Gift, X } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import Toggle from '../../components/ui/Toggle';
import FreeTrialBanner from '../../components/FreeTrialBanner';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useReseller } from '../../context/ResellerContext';
import { useSettings } from '../../App';
import { useCurrency } from '../../context/CurrencyContext';
import { useFormatRate } from '../../hooks/useFormatRate';
import SocialPreview from '../../components/SocialPreview';
import ReviewSummaryBar from '../../components/ReviewSummaryBar';
import ReorderModal from '../../components/ReorderModal';
import api from '../../lib/axios';
import { getServiceIdBadge, formatDisplayName, spinFreeViewsAllowedForService, parseAdminServiceIdList } from '../../lib/utils';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import AIOrderAssistantBubble from '../../components/AIOrderAssistantBubble';

function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim().toLowerCase();
  if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) return { platform: 'YouTube', type: 'video' };
  if (u.includes('youtube.com/channel') || u.includes('youtube.com/@')) return { platform: 'YouTube', type: 'channel' };
  if (u.includes('instagram.com/p/') || u.includes('instagram.com/reel/')) return { platform: 'Instagram', type: 'post' };
  if (u.includes('instagram.com/')) return { platform: 'Instagram', type: 'profile' };
  if (u.includes('tiktok.com/@') && u.includes('/video/')) return { platform: 'TikTok', type: 'video' };
  if (u.includes('tiktok.com/')) return { platform: 'TikTok', type: 'profile' };
  if (u.includes('facebook.com')) return { platform: 'Facebook', type: 'page' };
  if (u.includes('twitter.com') || u.includes('x.com')) return { platform: 'Twitter', type: 'post' };
  return null;
}

const PLATFORM_ICONS = {
  YouTube: '▶️',
  Instagram: '📷',
  TikTok: '🎵',
  Facebook: '📘',
  Twitter: '𝕏',
};

const FAVOURITES_STORAGE_KEY = 'sw_favourite_services';

function getFavouritesFromStorage() {
  try {
    const raw = localStorage.getItem(FAVOURITES_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveFavouritesToStorage(list) {
  try {
    localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function getPlatformFromCategoryName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('youtube')) return { platform: 'YouTube' };
  if (n.includes('instagram')) return { platform: 'Instagram' };
  if (n.includes('tiktok')) return { platform: 'TikTok' };
  if (n.includes('facebook')) return { platform: 'Facebook' };
  if (n.includes('twitter') || n.includes('x.com') || n.includes(' x ')) return { platform: 'Twitter' };
  if (n.includes('telegram')) return { platform: 'Telegram' };
  if (n.includes('discord')) return { platform: 'Discord' };
  if (n.includes('spotify')) return { platform: 'Spotify' };
  if (n.includes('snapchat')) return { platform: 'Snapchat' };
  if (n.includes('linkedin')) return { platform: 'LinkedIn' };
  return { platform: null };
}

function CategoryIcon({ name, isFavourite }) {
  const { platform } = getPlatformFromCategoryName(name);
  const glowClass = platform ? `category-glow category-glow-${platform.replace(/\s+/g, '')}` : 'category-glow category-glow-default';
  if (isFavourite) {
    return (
      <Star size={22} className="text-[var(--warning)] category-glow category-glow-favourites flex-shrink-0" style={{ marginRight: 6 }} />
    );
  }
  if (platform === 'YouTube') return <Youtube size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
  if (platform === 'Instagram') return <Instagram size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
  if (platform === 'TikTok') return <Music size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
  if (platform === 'Facebook') return <Facebook size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
  if (platform === 'Twitter') return <X size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
  if (platform === 'Telegram') return <Send size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
  if (platform === 'Discord') return <MessageCircle size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
  return <Globe size={22} className={`${glowClass} flex-shrink-0`} style={{ marginRight: 6 }} />;
}

const NewOrderPage = () => {
  const { user, token, refreshUser } = useDashboardAuth();
  const { isReseller } = useReseller();
  const { settings } = useSettings();
  const { formatPrice } = useCurrency();
  const { formatRate, formatPriceWithRateDecimals } = useFormatRate();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userStats, setUserStats] = useState({ total_orders: 0, pending_orders: 0, completed_orders: 0, balance: 0, spin_free_views: 0 });
  const [useFreeViews, setUseFreeViews] = useState(false);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [allResellerServices, setAllResellerServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [link, setLink] = useState('');
  const [linkDetection, setLinkDetection] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [saveLinkToAccounts, setSaveLinkToAccounts] = useState(false);
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledDatetime, setScheduledDatetime] = useState('');
  const [templates, setTemplates] = useState([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [extraInput, setExtraInput] = useState('');
  const [dripFeedEnabled, setDripFeedEnabled] = useState(false);
  const [dripRuns, setDripRuns] = useState(5);
  const [dripInterval, setDripInterval] = useState(30);
  const [dripQtyPerRun, setDripQtyPerRun] = useState('');
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [favourites, setFavourites] = useState(() => getFavouritesFromStorage());
  const [startCountPreview, setStartCountPreview] = useState(null);
  const [startCountSource, setStartCountSource] = useState(null);
  const [startCountLoading, setStartCountLoading] = useState(false);
  const startCountDebounceRef = useRef(null);
  const startCountAbortRef = useRef(null);
  const redeemToastShownRef = useRef(false);
  const [loyaltySummary, setLoyaltySummary] = useState(null);
  const [frequentlyReordered, setFrequentlyReordered] = useState([]);
  const [reorderModalOrderId, setReorderModalOrderId] = useState(null);
  const [myPricing, setMyPricing] = useState({});
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const getServiceLabel = (srv, specialPrice) => {
    if (!srv) return '';
    const sid = getServiceDisplayNumber(srv.service_id) ?? srv.service_id ?? '';
    const name = formatDisplayName(srv.name || srv.service_name || srv.service_id || '');
    const rateVal = specialPrice ?? srv.rate ?? 0;
    const rate = formatRate(rateVal);
    const min = Number(srv.min_order ?? srv.min ?? 0);
    const max = Number(srv.max_order ?? srv.max ?? 0);
    const pattern = String(settings?.service_name_format || 'ID - Name - Rate per 1000').trim();

    const builtFromPlaceholders = pattern
      .replace(/\{id\}/gi, String(sid))
      .replace(/\{name\}/gi, name)
      .replace(/\{rate_per_1000\}/gi, `${rate} / 1k`)
      .replace(/\{rate\}/gi, rate)
      .replace(/\{min\}/gi, Number.isFinite(min) ? min.toLocaleString() : '0')
      .replace(/\{max\}/gi, Number.isFinite(max) ? max.toLocaleString() : '0');

    if (builtFromPlaceholders !== pattern) return builtFromPlaceholders;

    const preset = pattern.toLowerCase();
    if (preset === 'name') return name;
    if (preset === 'id - name') return `#${sid} - ${name}`;
    if (preset === 'name - rate per 1000') return `${name} - ${rate} / 1k`;
    if (preset === 'id - name - rate per 1000') return `#${sid} - ${name} - ${rate} / 1k`;
    return pattern || `#${sid} - ${name} - ${rate} / 1k`;
  };

  useEffect(() => {
    if (!isReseller && token) {
      api.get('/loyalty/summary', { withCredentials: true }).then((r) => setLoyaltySummary(r.data)).catch(() => {});
    }
  }, [isReseller, token]);

  useEffect(() => {
    if (!token || isReseller) return;
    const headers = { Authorization: `Bearer ${token}` };
    api
      .get('/user/my-pricing', { headers, withCredentials: true })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        const map = {};
        list.forEach((p) => {
          const key = p.service_id || p.serviceId || p.service_id_hex;
          if (!key) return;
          map[String(key)] = p;
        });
        setMyPricing(map);
      })
      .catch(() => setMyPricing({}));
  }, [token, isReseller]);

  useEffect(() => {
    if (!token || isReseller) return;
    api.get('/orders/frequently-reordered', { withCredentials: true })
      .then((r) => setFrequentlyReordered(r.data?.frequently_reordered ?? []))
      .catch(() => setFrequentlyReordered([]));
  }, [token, isReseller]);

  const refreshFrequentlyReordered = () => {
    if (!token || isReseller) return;
    api.get('/orders/frequently-reordered', { withCredentials: true })
      .then((r) => setFrequentlyReordered(r.data?.frequently_reordered ?? []))
      .catch(() => setFrequentlyReordered([]));
  };

  const getTotalWithPromo = () => {
    const base = calculatePrice();
    const discount = Number(promoDiscount || 0);
    return Math.max(0, base - discount);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Enter a promo code first');
      return;
    }
    if (!selectedService) {
      toast.error('Select a service before applying a promo');
      return;
    }
    const amount = calculatePrice();
    if (!amount || amount <= 0) {
      toast.error('Set a valid quantity before applying a promo');
      return;
    }
    setPromoApplying(true);
    setPromoMessage('');
    setPromoDiscount(0);
    try {
      const body = {
        code: promoCode.trim(),
        order_amount: amount,
        // send service_id so service-specific promos can be validated
        service_id: selectedService._id || selectedService.service_mongo_id || selectedService.serviceId,
      };
      const res = await api.post('/promocodes/validate', body, { withCredentials: true });
      const d = res.data?.data || {};
      if (d.valid) {
        const discount = Number(d.discount_amount || 0);
        setPromoDiscount(discount > 0 ? discount : 0);
        setPromoMessage(`Promo applied: you save ${formatPrice(discount || 0)} on this order.`);
        toast.success(res.data?.message || 'Promo code valid');
      } else {
        setPromoDiscount(0);
        setPromoMessage(res.data?.message || 'Promo code is not valid for this order.');
        toast.error(res.data?.message || 'Promo code invalid');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to validate promo code';
      toast.error(msg);
      setPromoMessage(msg);
      setPromoDiscount(0);
    } finally {
      setPromoApplying(false);
    }
  };

  useEffect(() => {
    const prefill = searchParams.get('link');
    if (prefill) setLink(decodeURIComponent(prefill));
  }, [searchParams]);

  useEffect(() => {
    setLinkDetection(detectPlatform(link));
  }, [link]);

  useEffect(() => {
    if (!selectedService?.start_count_enabled || !link?.trim()) {
      setStartCountPreview(null);
      setStartCountSource(null);
      setStartCountLoading(false);
      return;
    }
    if (startCountDebounceRef.current) clearTimeout(startCountDebounceRef.current);
    setStartCountLoading(true);
    startCountDebounceRef.current = setTimeout(async () => {
      if (startCountAbortRef.current) startCountAbortRef.current.abort();
      startCountAbortRef.current = new AbortController();
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await api.get('/start-count', {
          params: { link: link.trim(), service_id: selectedService.service_id },
          headers,
          withCredentials: true,
          signal: startCountAbortRef.current.signal,
        });
        setStartCountPreview(res.data.start_count ?? 0);
        setStartCountSource(res.data.source ?? null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setStartCountPreview(0);
        setStartCountSource('fallback');
      } finally {
        setStartCountLoading(false);
      }
    }, 800);
    return () => {
      if (startCountDebounceRef.current) clearTimeout(startCountDebounceRef.current);
      if (startCountAbortRef.current) startCountAbortRef.current.abort();
    };
  }, [link, selectedService?.service_id, selectedService?.start_count_enabled, token]);

  const recommendServiceId = searchParams.get('service_id') || searchParams.get('service');
  const recommendCategoryId = searchParams.get('category_id') || searchParams.get('category');
  const recommendQuantity = searchParams.get('quantity');
  const recommendLink = searchParams.get('link');
  useEffect(() => {
    if (!recommendServiceId || !recommendCategoryId) return;
    setSelectedCategory(recommendCategoryId);
    loadServicesForCategory(recommendCategoryId);
  }, [recommendServiceId, recommendCategoryId]);

  // When only service= is in URL (no category), fetch all services to resolve category then load
  useEffect(() => {
    if (!recommendServiceId || recommendCategoryId || isReseller) return;
    const resolveAndLoad = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await api.get('/services', { headers, withCredentials: true });
        const list = Array.isArray(res.data) ? res.data : (res.data?.services ?? []);
        const svc = list.find((s) => s.service_id === recommendServiceId);
        if (svc?.category_id) {
          setSelectedCategory(svc.category_id);
          loadServicesForCategory(svc.category_id);
        }
      } catch {}
    };
    resolveAndLoad();
  }, [recommendServiceId, recommendCategoryId, isReseller, token]);

  useEffect(() => {
    if (!recommendServiceId || !services.length) return;
    const svc = services.find((s) => s.service_id === recommendServiceId);
    if (svc) {
      setSelectedService(svc);
      setQuantity(String(svc.min_order ?? ''));
    }
  }, [recommendServiceId, services]);
  useEffect(() => {
    if (recommendQuantity != null && recommendQuantity !== '') {
      const q = parseInt(recommendQuantity, 10);
      if (Number.isFinite(q)) setQuantity(String(q));
    }
  }, [recommendQuantity]);
  useEffect(() => {
    if (recommendLink != null && recommendLink !== '') {
      try {
        setLink(decodeURIComponent(recommendLink));
      } catch {
        setLink(recommendLink);
      }
    }
  }, [recommendLink]);

  const templateId = searchParams.get('template');
  useEffect(() => {
    if (!templateId) return;
    const load = async () => {
      try {
        const res = await api.get(`/templates/${templateId}`);
        const t = res.data;
        if (t?.service_id) {
          setLink(t.link || '');
          setQuantity(String(t.quantity || ''));
          if (t.category_id) {
            setSelectedCategory(t.category_id);
            if (isReseller && allResellerServices.length > 0) {
              const list = allResellerServices.filter((s) => s.category_id === t.category_id);
              setServices(list);
              const svc = list.find((s) => s.service_id === t.service_id);
              if (svc) setSelectedService(svc);
            } else {
              const svcRes = await api.get('/services', { params: { category_id: t.category_id } });
              const list = Array.isArray(svcRes.data) ? svcRes.data : (svcRes.data?.services || []);
              setServices(list);
              const svc = list.find((s) => s.service_id === t.service_id);
              if (svc) setSelectedService(svc);
            }
          }
        }
      } catch {}
    };
    load();
  }, [templateId, isReseller, allResellerServices.length]);

  useEffect(() => {
    if (searchParams.get('redeem') !== '1' || redeemToastShownRef.current || isReseller) return;
    const freeViews = userStats.spin_free_views ?? 0;
    if (freeViews > 0) {
      redeemToastShownRef.current = true;
      toast.info(`You have ${freeViews.toLocaleString()} free views. Select the spin-reward service, enter link & quantity, then check "Use free views for this order".`);
    }
  }, [searchParams, userStats.spin_free_views, isReseller]);

  useEffect(() => {
    if (!selectedService) return;
    if (!spinFreeViewsAllowedForService(settings?.spin_free_views_service_id, selectedService.service_id)) {
      setUseFreeViews(false);
    }
  }, [selectedService?.service_id, settings?.spin_free_views_service_id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isReseller) {
          const [svcRes, catRes] = await Promise.all([
            api.get('/reseller/services'),
            api.get('/public/categories'),
          ]);
          const list = svcRes.data?.services ?? [];
          setAllResellerServices(list);
          const grouped = Array.isArray(catRes.data?.platforms)
            ? catRes.data.platforms
            : Object.values(catRes.data?.grouped || {});
          const flatCats = [];
          grouped.forEach((g) => {
            (g.categories || []).forEach((c) =>
              flatCats.push({
                ...c,
                category_id: String(c._id),
              })
            );
          });
          setCategories(flatCats);
          const balRes = await api.get('/reseller/balance').catch(() => ({ data: {} }));
          setUserStats(prev => ({ ...prev, balance: balRes.data?.balance ?? 0 }));
        } else {
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const [catRes, statsRes] = await Promise.all([
            api.get('/public/categories'),
            api.get('/user/stats', { headers, withCredentials: true }).catch(() => ({ data: null }))
          ]);
          const grouped = Array.isArray(catRes.data?.platforms)
            ? catRes.data.platforms
            : Object.values(catRes.data?.grouped || {});
          const flatCats = [];
          grouped.forEach((g) => {
            (g.categories || []).forEach((c) =>
              flatCats.push({
                ...c,
                category_id: String(c._id),
              })
            );
          });
          setCategories(flatCats);
          if (statsRes?.data && typeof statsRes.data === 'object') {
            setUserStats(prev => ({ ...prev, ...(statsRes.data?.stats || statsRes.data || {}) }));
          }
        }
      } catch (error) {
        toast.error('Failed to load data');
        setCategories([]);
        if (isReseller) setAllResellerServices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, isReseller]);

  useEffect(() => {
    if (selectedCategory === '__favourites__') {
      setServices(favourites);
    }
  }, [favourites, selectedCategory]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/accounts');
        setSavedAccounts(res.data?.accounts || []);
      } catch {
        setSavedAccounts([]);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/templates');
        setTemplates(res.data?.templates || []);
      } catch {
        setTemplates([]);
      }
    };
    fetchTemplates();
  }, []);

  const loadServicesForCategory = async (categoryId) => {
    setServices([]);
    setSelectedService(null);
    setQuantity('');
    setExtraInput('');
    setDripFeedEnabled(false);
    setDripRuns(5);
    setDripInterval(30);
    setDripQtyPerRun('');
    if (!categoryId) return;
    if (categoryId === '__favourites__') {
      setServices(favourites);
      setServicesLoading(false);
      return;
    }
    if (isReseller) {
      const filtered = (allResellerServices || []).filter((s) => String(s.category_id) === String(categoryId));
      setServices(filtered);
      setServicesLoading(false);
      return;
    }
    setServicesLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.get('/services', {
        params: { category_id: categoryId },
        headers,
        withCredentials: true
      });
      setServices(Array.isArray(res.data) ? res.data : (res.data?.services ?? []));
    } catch (error) {
      toast.error('Failed to load services for this category');
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const displayCategories = favourites.length > 0
    ? [{ category_id: '__favourites__', name: '⭐ Favourite Services' }, ...categories]
    : categories;

  const isFavourite = (serviceId) => favourites.some((f) => f.service_id === serviceId);

  const toggleFavourite = (e, service) => {
    // Radix Select uses pointer/click handling internally.
    // Preventing default can block the update on desktop, so we only
    // stop bubbling and let Radix close/open normally.
    if (e) e.stopPropagation();
    if (!service?.service_id) return;
    const next = isFavourite(service.service_id)
      ? favourites.filter((f) => f.service_id !== service.service_id)
      : [...favourites, service];
    setFavourites(next);
    saveFavouritesToStorage(next);
    if (selectedCategory === '__favourites__') {
      setServices(next);
      if (next.length === 0) {
        setSelectedCategory('');
        setSelectedService(null);
        setServices([]);
      } else if (selectedService && !next.find((f) => f.service_id === selectedService.service_id)) {
        setSelectedService(null);
      }
    }
  };

  const getMaxQuantity = () => {
    if (!selectedService) return 0;
    const max = selectedService.max_order || 1000000;
    const overflow = parseFloat(selectedService.overflow_percent || 0);
    return overflow > 0 ? Math.floor(max * (1 + overflow / 100)) : max;
  };

  const snapQuantity = (val) => {
    if (!selectedService) return val;
    const inc = parseInt(selectedService.increment || 0, 10);
    if (inc <= 0) return parseInt(val, 10) || 0;
    const v = parseInt(val, 10) || 0;
    return Math.round(v / inc) * inc;
  };

  const getCustomCommentsCount = () => {
    if (!isTextareaExtra() || !extraInput?.trim()) return 0;
    return extraInput.trim().split('\n').filter(Boolean).length;
  };

  const getEffectiveQuantity = () => {
    if (!selectedService) return 0;
    let qty = dripFeedEnabled && selectedService.drip_feed
      ? (parseInt(dripQtyPerRun) || 0) * (dripRuns || 1)
      : parseInt(quantity) || 0;
    const commentsCount = getCustomCommentsCount();
    if (commentsCount > 0) qty = commentsCount;
    return qty;
  };

  const isCustomCommentsType = () => {
    const st = selectedService?.service_type || '';
    return ['Custom Comments', 'Custom Comments Package'].includes(st);
  };

  const quantityDisabledByComments = () => isCustomCommentsType() && isTextareaExtra();

  const calculatePrice = () => {
    if (!selectedService) return 0;
    const qty = getEffectiveQuantity();
    if (qty <= 0 && !quantityDisabledByComments()) return 0;
    const key = String(selectedService._id || selectedService.id || selectedService.service_id || '');
    const special = key && myPricing[key];
    const rateToUse = special ? (special.final_price ?? special.original_price ?? selectedService.rate) : selectedService.rate;
    return (qty / 1000) * rateToUse;
  };

  const needsExtraInput = () => {
    const st = selectedService?.service_type || 'Default';
    return ['Custom Comments', 'Custom Comments Package', 'Mentions', 'Mentions with Hashtags', 'Mentions Custom List', 'Mentions Hashtag', 'Mentions User Followers'].includes(st);
  };

  const isTextareaExtra = () => {
    const st = selectedService?.service_type || 'Default';
    return ['Custom Comments', 'Custom Comments Package', 'Mentions Custom List'].includes(st);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !link) {
      toast.error('Please fill all required fields');
      return;
    }
    const useDrip = dripFeedEnabled && selectedService.drip_feed;
    const commentLines = needsExtraInput() && isTextareaExtra() && extraInput?.trim()
      ? extraInput.trim().split('\n').map((l) => l.trim()).filter(Boolean)
      : [];
    const mentionList = needsExtraInput() && !isTextareaExtra() && extraInput?.trim()
      ? extraInput.trim().split(/[,;\s]+/).map((u) => u.trim()).filter(Boolean)
      : [];
    const commentsCount = commentLines.length;
    const useCommentsAsQty = quantityDisabledByComments() && commentsCount > 0;

    if (isCustomCommentsType() && commentsCount === 0) {
      toast.error('Please enter at least one comment.');
      return;
    }
    if (needsExtraInput() && !isTextareaExtra() && mentionList.length === 0) {
      toast.error('Please enter at least one username to mention.');
      return;
    }
    if (!useDrip && !useCommentsAsQty && !quantity) {
      toast.error('Please enter quantity or comments');
      return;
    }

    let baseQty = useDrip ? 0 : (useCommentsAsQty ? commentsCount : parseInt(quantity));
    if (selectedService.increment > 0 && !useCommentsAsQty) baseQty = snapQuantity(quantity);
    let effectiveQty = baseQty;
    if (dripFeedEnabled && selectedService.drip_feed) {
      const qpr = parseInt(dripQtyPerRun) || 0;
      if (qpr < selectedService.min_order || dripRuns < 1) {
        toast.error('Invalid drip feed: check quantity per run and runs');
        return;
      }
      effectiveQty = qpr * dripRuns;
    } else if (commentsCount > 0 && useCommentsAsQty) {
      effectiveQty = commentsCount;
    }
    const maxQ = getMaxQuantity();
    if (effectiveQty < selectedService.min_order) {
      toast.error(`Minimum order: ${selectedService.min_order}`);
      return;
    }
    if (effectiveQty > maxQ) {
      toast.error(`Maximum order: ${maxQ}`);
      return;
    }

    setSubmitting(true);
    try {
      if (isReseller) {
        const qty = dripFeedEnabled && selectedService.drip_feed ? effectiveQty : (useCommentsAsQty ? commentsCount : baseQty);
        const response = await api.post('/reseller/orders', {
          service_id: selectedService.service_id,
          link: link.trim(),
          quantity: qty,
        });
        toast.success(response.data?.message || `Order placed! ID: ${response.data?.order_id ?? ''}`);
        if (loyaltySummary?.tier_config) {
          const charge = response.data?.charge ?? calculatePrice();
          if (charge > 0) {
            const pts = Math.floor(charge * (loyaltySummary.tier_config.pts_per_dollar || 0));
            const cb = (charge * (loyaltySummary.tier_config.cashback_pct || 0) / 100).toFixed(2);
            toast.info(`You'll earn ~${pts} points + $${cb} cashback when this order completes!`);
          }
        }
        await refreshUser();
        navigate('/dashboard/orders');
        setSubmitting(false);
        return;
      }
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        service_id: selectedService.service_id,
        link,
        quantity: dripFeedEnabled && selectedService.drip_feed ? effectiveQty : (useCommentsAsQty ? commentsCount : baseQty),
        user_note: undefined,
      };
      if (selectedService.start_count_enabled) {
        payload.start_count = startCountPreview != null ? startCountPreview : 0;
        if (startCountSource) payload.start_count_source = startCountSource;
      }
      if (needsExtraInput() && (commentLines.length > 0 || mentionList.length > 0)) {
        if (isTextareaExtra()) {
          payload.custom_comments = commentLines;
        } else {
          payload.usernames = mentionList;
        }
      }
      if (dripFeedEnabled && selectedService.drip_feed) {
        payload.drip_feed = true;
        payload.runs = dripRuns;
        payload.interval = dripInterval;
        payload.quantity_per_run = parseInt(dripQtyPerRun);
      }
      if (scheduleLater && scheduledDatetime) {
        const t = new Date(scheduledDatetime).getTime();
        if (t > Date.now() + 5 * 60 * 1000) payload.scheduled_for = new Date(t).toISOString();
      }
      const key = String(selectedService._id || selectedService.id || selectedService.service_id || '');
      const hasSpecialPricing = key && myPricing[key];
      if (promoCode.trim() && !hasSpecialPricing) {
        payload.promo_code = promoCode.trim();
      }
      const orderQty = dripFeedEnabled && selectedService.drip_feed ? effectiveQty : (useCommentsAsQty ? commentsCount : baseQty);
      if (useFreeViews && (userStats.spin_free_views ?? 0) >= orderQty && orderQty > 0) {
        payload.use_free_views = true;
      }
      const response = await api.post(
        '/orders',
        payload,
        { headers, withCredentials: true }
      );
      toast.success(response.data.scheduled ? `Order scheduled! ID: ${response.data.order_id}` : `Order placed! ID: ${response.data.order_id}`);
      if (!isReseller && loyaltySummary?.tier_config) {
        const charge = calculatePrice();
        if (charge > 0) {
          const pts = Math.floor(charge * (loyaltySummary.tier_config.pts_per_dollar || 0));
          const cb = (charge * (loyaltySummary.tier_config.cashback_pct || 0) / 100).toFixed(2);
          toast.info(`You'll earn ~${pts} points + $${cb} cashback when this order completes!`);
        }
      }
      await refreshUser();
      if (saveLinkToAccounts && link?.trim()) {
        try {
          await api.post('/accounts', {
            platform: selectedService?.category_name || 'YouTube',
            account_name: (selectedService?.name || link).slice(0, 50),
            account_url: link.trim(),
          });
        } catch {}
      }
      if (saveAsTemplate && templateName?.trim() && selectedService && link) {
        try {
          await api.post('/templates', {
            name: templateName.trim(),
            service_id: selectedService.service_id,
            category_id: (selectedCategory && selectedCategory !== '__favourites__' ? selectedCategory : selectedService.category_id) || undefined,
            link,
            quantity: dripFeedEnabled && selectedService.drip_feed ? parseInt(dripQtyPerRun) || 0 : parseInt(quantity) || 0,
            notes: '',
          });
          toast.success('Template saved');
        } catch {}
      }
      navigate(response.data.scheduled ? '/dashboard/orders?tab=scheduled' : '/dashboard/orders');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const statCards = [
    { label: 'Balance', value: formatPriceWithRateDecimals(userStats.balance ?? 0, undefined, { forBalance: true }), icon: DollarSign, color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
    { label: 'Total Orders', value: userStats.total_orders, icon: ShoppingCart, color: 'text-electric-blue', bgColor: 'bg-electric-blue/10' },
    { label: 'Pending', value: userStats.pending_orders, icon: Clock, color: 'text-[var(--warning)]', bgColor: 'bg-[var(--warning-bg)]' },
    { label: 'Completed', value: userStats.completed_orders, icon: CheckCircle, color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
  ];

  return (
    <DashboardLayout title="New Order">
      <Toaster position="top-right" theme="dark" />

      <div className="space-y-5">
        {/* Welcome + actions — hidden on mobile for easier use */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block glass p-4 rounded-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-exo font-bold text-[var(--text-primary)] mb-1">
                Welcome back, <span className="neon-text">{user?.name}</span>!
              </h2>
              <p className="text-[var(--text-muted)] text-sm">Ready to grow your social media presence?</p>
            </div>
            <div className="flex gap-2">
              <Link to="/dashboard/recommend" className="text-sm text-[var(--text-muted)] hover:text-cyber-purple transition-colors">
                ✨ Not sure what to order? Try AI Recommender →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="min-w-0"
            >
              <Card className="glass p-2.5 sm:p-4 hover:border-electric-blue/30 transition-all h-full" data-testid={`new-order-stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                <div className="flex items-start justify-between gap-2 min-w-0 h-full">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-[var(--text-muted)] text-xs mb-0.5 break-words leading-tight">{stat.label}</p>
                    <p className={`text-base sm:text-xl md:text-2xl font-exo font-bold ${stat.color} truncate`} title={String(stat.value)}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-1.5 sm:p-2.5 rounded-lg flex-shrink-0 ${stat.bgColor}`}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-5 space-y-4 px-1 sm:px-0">
        <Card className="glass border-cyber-purple/40">
          <div className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-cyber-purple font-semibold">
                Save money
              </p>
              <h2 className="text-[var(--text-primary)] font-exo font-semibold text-xs sm:text-sm">
                Use Boost Bundles to combine multiple services into one cheaper package.
              </h2>
            </div>
            <Link to="/dashboard/bundle">
              <Button className="bg-cyber-purple hover:bg-cyber-purple/90 text-xs sm:text-sm">
                Build Bundle
              </Button>
            </Link>
          </div>
        </Card>

        {frequentlyReordered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full hidden md:block"
          >
            <h2 className="text-base font-exo font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <RefreshCw size={16} className="text-neon-green" />
              Frequently Reordered
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {frequentlyReordered.map((item, index) => {
                const linkDisplay = (item.link || '').length > 30 ? (item.link || '').slice(0, 30) + '...' : (item.link || '');
                const unavailable = item.service_available === false;
                const looksLikeId = (item.service_name || '').match(/^srv_|^[a-z]+_[a-z0-9]+$/i);
                const titleDisplay = item.service_name && !looksLikeId
                  ? item.service_name
                  : `Order #${index + 1}`;
                return (
                  <Card
                    key={`${item.service_id}-${item.link}`}
                    className={`flex-shrink-0 w-52 glass p-4 ${unavailable ? 'opacity-60' : ''}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[var(--text-primary)] font-medium text-sm truncate" title={item.service_name || titleDisplay}>
                          {titleDisplay}
                        </p>
                        {unavailable && (
                          <Badge variant="secondary" className="text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">Unavailable</Badge>
                        )}
                      </div>
                      <p className="text-[var(--text-muted)] text-xs truncate" title={item.link}>
                        {linkDisplay}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {(item.quantity ?? 0).toLocaleString()} qty · Ordered {item.order_count}×
                      </p>
                      {item.current_charge != null && (
                        <p className="text-neon-green font-semibold text-sm">{formatPrice(item.current_charge)}</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={unavailable}
                        onClick={() => setReorderModalOrderId(item.order_id)}
                        className="border-neon-green/50 text-neon-green hover:bg-neon-green/10 w-full"
                      >
                        <RefreshCw size={14} className="mr-1" />
                        Reorder
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] gap-6 items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0"
        >
          <Card className="glass p-6 md:p-8 min-w-0">
            <h2 className="text-2xl font-exo font-bold text-[var(--text-primary)] mb-6">Place New Order</h2>

            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Load Template */}
                {templates.length > 0 && (
                  <div>
                    <Label className="text-[var(--text-muted)]">Load Template</Label>
                    <Select
                      value=""
                      onValueChange={(id) => {
                        if (id) navigate(`/dashboard/new-order?template=${id}`, { replace: true });
                      }}
                    >
                      <SelectTrigger className="mt-2 bg-deep-navy border-[var(--border)]">
                        <SelectValue placeholder="Select a saved template" />
                      </SelectTrigger>
                      <SelectContent className="bg-deep-navy border-[var(--border)]">
                        {templates.map((tm) => (
                          <SelectItem key={tm.id} value={tm.id}>
                            {tm.name} — #{getServiceDisplayNumber(tm.service_id) ?? tm.service_id} ({(tm.quantity || 0).toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Category Select */}
                <div>
                  <Label className="text-[var(--text-muted)]">Category</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(val) => {
                      setSelectedCategory(val);
                      loadServicesForCategory(val);
                    }}
                  >
                    <SelectTrigger className="mt-2 bg-deep-navy border-[var(--border)]" data-testid="order-category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={false}
                      className="z-[10050] bg-deep-navy border-[var(--border)] max-h-[360px] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
                    >
                      {displayCategories.map(cat => (
                        <SelectItem key={cat.category_id} value={cat.category_id}>
                          <span className="flex items-center">
                            <CategoryIcon name={formatDisplayName(cat.name)} isFavourite={cat.category_id === '__favourites__'} />
                            <span>{formatDisplayName(cat.name)}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Select */}
                <div>
                  <Label className="text-[var(--text-muted)]">Service</Label>
                  <Select 
                    value={selectedService?.service_id != null ? String(selectedService.service_id) : ''} 
                    onValueChange={(val) => {
                      const srv = services.find(s => String(s.service_id) === String(val));
                      setSelectedService(srv);
                      if (srv) {
                        setQuantity(String(srv.min_order));
                        setDripQtyPerRun('');
                      }
                      setExtraInput('');
                    }}
                    disabled={!selectedCategory || servicesLoading}
                  >
                    <SelectTrigger className="mt-2 bg-deep-navy border-[var(--border)] h-auto min-h-9 whitespace-normal [&>span]:line-clamp-2" data-testid="order-service-select">
                      {(() => {
                        if (!selectedService) {
                          return (
                            <SelectValue placeholder={selectedCategory ? (servicesLoading ? 'Loading services...' : 'Select service') : 'Select a category first'} />
                          );
                        }
                        const key = String(selectedService._id || selectedService.id || selectedService.service_id || '');
                        const special = key && myPricing[key];
                        const specialRate = special ? (special.final_price ?? special.original_price ?? selectedService.rate) : null;
                        const sid = getServiceIdBadge(selectedService);
                        const name = formatDisplayName(selectedService.name || selectedService.service_name || '');
                        const baseRate = formatRate(selectedService.rate);
                        const effectiveRate = formatRate(specialRate ?? selectedService.rate);
                        return (
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--text-muted)]">
                              {sid}
                            </span>
                            <span className="min-w-0 flex-1 whitespace-normal break-words text-[var(--text-primary)]">
                              <span>{name}</span>
                              <span className="text-[var(--text-muted)]"> - </span>
                              <span className="font-semibold text-electric-blue">
                                {special ? (
                                  <>
                                    <span className="line-through text-[var(--text-muted)] mr-1">{baseRate}/1k</span>
                                    <span className="text-neon-green">{effectiveRate}/1k</span>
                                  </>
                                ) : (
                                  `${effectiveRate}/1k`
                                )}
                              </span>
                            </span>
                          </div>
                        );
                      })()}
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={false}
                      className="z-[10050] bg-deep-navy border-[var(--border)] max-h-[360px] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
                    >
                      {services.map(srv => {
                        const serviceKey = String(srv._id || srv.id || srv.service_id || '');
                        const special = serviceKey && myPricing[serviceKey];
                        const specialRate = special ? (special.final_price ?? special.original_price ?? srv.rate) : null;
                        const sid = getServiceIdBadge(srv);
                        const name = formatDisplayName(srv.name || srv.service_name || '');
                        const baseRate = formatRate(srv.rate);
                        const effectiveRate = formatRate(specialRate ?? srv.rate);
                        const serviceLabel = `${sid} - ${name} - ${effectiveRate}/1k`;
                        const isFav = isFavourite(srv.service_id);
                        return (
                        <SelectItem key={String(srv.service_id)} value={String(srv.service_id)} textValue={serviceLabel} className="group py-2">
                          <div className="flex items-start gap-2 w-full min-w-0">
                            <button
                              type="button"
                              className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-1 focus:ring-electric-blue"
                              onPointerDown={(e) => toggleFavourite(e, srv)}
                              aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                            >
                              <Star
                                size={18}
                                className={isFav ? 'text-[var(--warning)] fill-[var(--warning)]' : 'text-[var(--text-muted)]'}
                              />
                            </button>
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--text-muted)] group-data-[highlighted]:bg-black/10 group-data-[highlighted]:border-black/10 group-data-[highlighted]:text-black">
                              {sid}
                            </span>
                            <span className="min-w-0 flex-1 whitespace-normal break-words text-[var(--text-primary)] group-data-[highlighted]:text-black" title={serviceLabel}>
                              <span>{name}</span>
                              <span className="text-[var(--text-muted)] group-data-[highlighted]:text-black/70"> - </span>
                              <span className="font-semibold text-electric-blue group-data-[highlighted]:text-black whitespace-nowrap">
                                {special ? (
                                  <>
                                    <span className="line-through text-[var(--text-muted)] group-data-[highlighted]:text-black/60 mr-1">{baseRate}/1k</span>
                                    <span className="text-neon-green group-data-[highlighted]:text-black">{effectiveRate}/1k</span>
                                  </>
                                ) : (
                                  `${effectiveRate}/1k`
                                )}
                              </span>
                              {srv.avg_time ? (
                                <span className="text-[var(--text-muted)] group-data-[highlighted]:text-black/70 text-xs ml-2 whitespace-nowrap">
                                  <Clock size={12} className="inline-block mr-1 align-[-2px]" />
                                  {srv.avg_time}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </SelectItem>
                      )})}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Info */}
                {selectedService && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div className="bg-electric-blue/5 border border-electric-blue/20 rounded-lg p-4 min-w-0 overflow-hidden">
                          <div className="flex items-start gap-3 min-w-0">
                        <Info size={20} className="text-electric-blue mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div
                            className="service-description text-sm text-[var(--text-muted)] mt-1 [&_b]:font-bold [&_i]:italic [&_a]:text-electric-blue [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: selectedService.description || 'High quality service with fast delivery' }}
                          />
                        </div>
                      </div>
                    </div>

                    {selectedService.show_faq && Array.isArray(selectedService.faq) && selectedService.faq.length > 0 && (
                      <div className="border-l-4 border-neon-green rounded-r-lg bg-[var(--bg-card)] p-4">
                        <h5 className="text-sm font-bold text-[var(--text-primary)] mb-3">FREQUENTLY ASKED QUESTIONS</h5>
                        <Accordion type="single" collapsible className="space-y-0">
                          {selectedService.faq.filter(f => f?.question || f?.answer).map((faq, i) => (
                            <AccordionItem key={i} value={`faq-${i}`} className="border-[var(--border)]">
                              <AccordionTrigger className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 text-left text-sm">
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="text-[var(--text-muted)] text-sm pb-2">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}

                    {selectedService.show_requirements && Array.isArray(selectedService.requirements) && selectedService.requirements.length > 0 && (
                      <div className="border-l-4 border-neon-green rounded-r-lg bg-[var(--bg-card)] p-4">
                        <h5 className="text-sm font-bold text-[var(--text-primary)] mb-3">REQUIREMENTS</h5>
                        <ul className="space-y-2">
                          {selectedService.requirements.filter(Boolean).map((req, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                              <Check size={16} className="text-neon-green shrink-0 mt-0.5" />
                              <span dangerouslySetInnerHTML={{ __html: req }} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedService.show_about && selectedService.about && (selectedService.about.description || (selectedService.about.items?.length > 0)) && (
                      <div className="border-l-4 border-neon-green rounded-r-lg bg-[var(--bg-card)] p-4">
                        <h5 className="text-sm font-bold text-[var(--text-primary)] mb-3">ABOUT THIS SERVICE</h5>
                        {selectedService.about.description && (
                          <p className="text-sm text-[var(--text-muted)] mb-3 [&_b]:font-bold [&_i]:italic" dangerouslySetInnerHTML={{ __html: selectedService.about.description }} />
                        )}
                        {selectedService.about.items?.length > 0 && (
                          <ul className="space-y-2">
                            {selectedService.about.items.filter(i => i?.title || i?.text).map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                                <Check size={16} className="text-neon-green shrink-0 mt-0.5" />
                                <span><strong className="text-[var(--text-secondary)]">{item.title}</strong> — {item.text}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Use Saved Account */}
                {savedAccounts.length > 0 && (
                  <div>
                    <Label className="text-[var(--text-muted)]">Use Saved Account</Label>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        const acc = savedAccounts.find((a) => a.id === val || (a.account_url || a.account_username) === val);
                        if (acc) setLink(acc.account_url || acc.account_username || '');
                      }}
                    >
                      <SelectTrigger className="mt-2 bg-deep-navy border-[var(--border)]">
                        <SelectValue placeholder="Select saved account to fill link" />
                      </SelectTrigger>
                      <SelectContent className="bg-deep-navy border-[var(--border)]">
                        {savedAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.platform} — {acc.account_name || acc.account_url || acc.account_username || acc.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Link Input */}
                <div>
                  <Label className="text-[var(--text-muted)]">Link</Label>
                  <div className="relative mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                      <Input
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://instagram.com/username or post link"
                        className="pl-10 pr-10 bg-deep-navy border-[var(--border)] focus:border-electric-blue"
                        required
                        data-testid="order-link-input"
                      />
                      {linkDetection && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg" title={`${linkDetection.platform} ${linkDetection.type}`}>
                          {PLATFORM_ICONS[linkDetection.platform] || '🔗'}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedService?.start_count_enabled && link?.trim() && (
                    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
                      {startCountLoading ? (
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                          <Loader2 size={16} className="animate-spin" />
                          Fetching current count…
                        </div>
                      ) : startCountPreview != null && startCountPreview > 0 ? (
                        <div className="flex items-center gap-2 text-neon-green text-sm">
                          <BarChart2 size={16} />
                          <span>Current {selectedService.start_count_metric || 'count'}: <strong>{startCountPreview.toLocaleString()}</strong> — your order starts from here</span>
                        </div>
                      ) : (
                        <p className="text-[var(--text-muted)] text-sm">Start count will be recorded when order begins processing</p>
                      )}
                    </div>
                  )}
                  {linkDetection && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neon-green/20 text-neon-green text-sm border border-neon-green/30">
                        ✓ {linkDetection.platform} {linkDetection.type} detected
                      </span>
                      {selectedService && categories.length > 0 && (() => {
                        const catMatch = categories.find((c) => c.name && linkDetection.platform.toLowerCase().includes((c.name || '').toLowerCase()));
                        const currentCat = categories.find((c) => c.category_id === selectedCategory);
                        const currentName = currentCat?.name || '';
                        const matches = !currentName || currentName.toLowerCase().includes(linkDetection.platform.toLowerCase());
                        if (matches) return null;
                        const targetCat = categories.find((c) => (c.name || '').toLowerCase().includes(linkDetection.platform.toLowerCase()));
                        if (!targetCat) return null;
                        return (
                          <span className="inline-flex items-center gap-2 text-sm text-[var(--warning)]">
                            ⚠️ This looks like a {linkDetection.platform} link — switch to {linkDetection.platform} services?
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[var(--warning)]/50 text-[var(--warning)] hover:bg-[var(--warning-bg)]"
                              onClick={() => {
                                setSelectedCategory(targetCat.category_id);
                                loadServicesForCategory(targetCat.category_id);
                                setSelectedService(null);
                              }}
                            >
                              Switch
                            </Button>
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  <div className="mt-2">
                    <Toggle
                      checked={!!saveLinkToAccounts}
                      onChange={(v) => setSaveLinkToAccounts(v)}
                      size="md"
                      color="blue"
                      label="Save this link to My Accounts"
                    />
                  </div>
                  <div className="mt-2">
                    <Toggle
                      checked={!!saveAsTemplate}
                      onChange={(v) => setSaveAsTemplate(v)}
                      size="md"
                      color="blue"
                      label="Save as Template"
                    />
                  </div>
                  {saveAsTemplate && (
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name"
                      className="mt-2 max-w-xs bg-deep-navy border-[var(--border)]"
                    />
                  )}
                </div>

                {/* Social Preview - when service + link selected */}
                {selectedService && link?.trim() && (
                  <SocialPreview
                    platform={linkDetection?.platform || 'YouTube'}
                    link={link}
                    service={selectedService}
                    quantity={getEffectiveQuantity() || parseInt(quantity, 10) || selectedService?.min_order || 0}
                  />
                )}

                {/* Service-type extra input - for Custom Comments, this sets quantity automatically */}
                {selectedService && needsExtraInput() && (
                  <div>
                    <Label className="text-[var(--text-muted)]">
                      {isTextareaExtra()
                        ? (selectedService.service_type?.includes('Comments') ? 'Enter comments (one per line) — quantity = number of comments' : 'Enter custom list')
                        : 'Enter usernames (comma separated)'}
                    </Label>
                    {isTextareaExtra() ? (
                      <Textarea
                        value={extraInput}
                        onChange={(e) => setExtraInput(e.target.value)}
                        placeholder={selectedService.service_type?.includes('Comments') ? 'Comment 1\nComment 2\n...' : 'Enter list'}
                        className="mt-2 min-h-[80px] bg-deep-navy border-[var(--border)]"
                      />
                    ) : (
                      <Input
                        value={extraInput}
                        onChange={(e) => setExtraInput(e.target.value)}
                        placeholder="user1, user2, user3"
                        className="mt-2 bg-deep-navy border-[var(--border)]"
                      />
                    )}
                    {quantityDisabledByComments() && getCustomCommentsCount() > 0 && (
                      <p className="text-xs text-electric-blue mt-1">Quantity: {getCustomCommentsCount()} (from comments)</p>
                    )}
                  </div>
                )}

                {/* Quantity Input - hidden when Custom Comments with comments (quantity = comments count) */}
                {(!quantityDisabledByComments() || getCustomCommentsCount() === 0) && (
                <div>
                  <Label className="text-[var(--text-muted)]">Quantity</Label>
                  <div className="relative mt-2">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder={selectedService ? `Min: ${selectedService.min_order}` : 'Enter quantity'}
                      className="pl-10 bg-deep-navy border-[var(--border)] focus:border-electric-blue"
                      min={selectedService?.min_order || 1}
                      max={getMaxQuantity() || 1000000}
                      required={!dripFeedEnabled && !!selectedService?.drip_feed}
                      data-testid="order-quantity-input"
                    />
                  </div>
                  {selectedService && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 break-words">
                      Min: {selectedService.min_order.toLocaleString()} | Max: {getMaxQuantity().toLocaleString()}
                      {selectedService.increment > 0 && ` | Multiple of ${selectedService.increment}`}
                    </p>
                  )}
                </div>
                )}

                {/* Drip Feed */}
                {selectedService?.drip_feed && (
                  <div className="border border-electric-blue/20 rounded-lg p-4 space-y-4 bg-electric-blue/5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[var(--text-muted)]">Drip Feed</Label>
                      <Toggle
                        checked={!!dripFeedEnabled}
                        onChange={(v) => setDripFeedEnabled(v)}
                        size="sm"
                        color="blue"
                        label="Enable"
                      />
                    </div>
                    {dripFeedEnabled && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Runs</Label>
                          <Input type="number" min={1} value={dripRuns} onChange={(e) => setDripRuns(parseInt(e.target.value) || 1)} className="mt-1 bg-deep-navy border-[var(--border)]" />
                        </div>
                        <div>
                          <Label className="text-xs">Interval (min)</Label>
                          <Input type="number" min={1} value={dripInterval} onChange={(e) => setDripInterval(parseInt(e.target.value) || 30)} className="mt-1 bg-deep-navy border-[var(--border)]" />
                        </div>
                        <div>
                          <Label className="text-xs">Qty per run</Label>
                          <Input type="number" min={selectedService.min_order} value={dripQtyPerRun} onChange={(e) => setDripQtyPerRun(e.target.value)} placeholder={selectedService.min_order} className="mt-1 bg-deep-navy border-[var(--border)]" />
                        </div>
                      </div>
                    )}
                    {dripFeedEnabled && dripQtyPerRun && dripRuns && (
                      <p className="text-sm text-electric-blue">
                        {parseInt(dripQtyPerRun).toLocaleString()} units every {dripInterval} mins × {dripRuns} runs
                      </p>
                    )}
                  </div>
                )}

                {/* Schedule for Later */}
                <div>
                  <Toggle
                    checked={!!scheduleLater}
                    onChange={(v) => setScheduleLater(v)}
                    size="md"
                    color="blue"
                    label="Schedule for Later"
                  />
                  {scheduleLater && (
                    <div className="mt-3 space-y-2">
                      <Input
                        type="datetime-local"
                        value={scheduledDatetime}
                        onChange={(e) => setScheduledDatetime(e.target.value)}
                        min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                        className="bg-deep-navy border-[var(--border)]"
                      />
                      {scheduledDatetime && (
                        <p className="text-sm text-cyber-purple">
                          Order will fire on: {new Date(scheduledDatetime).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Price Preview */}
                {selectedService && quantity && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="gradient-border p-6 text-center"
                  >
                    <div className="text-[var(--text-muted)] mb-2">Total Cost</div>
                    <div className="text-4xl font-exo font-black text-electric-blue" data-testid="order-total-price">
                      {formatPriceWithRateDecimals(getTotalWithPromo())}
                    </div>
                    <div className="text-sm text-[var(--text-muted)] mt-2">
                      {(() => {
                        const key = String(selectedService._id || selectedService.id || selectedService.service_id || '');
                        const special = key && myPricing[key];
                        const rateToShow = special ? (special.final_price ?? special.original_price ?? selectedService.rate) : selectedService.rate;
                        return (
                          <>
                            {getEffectiveQuantity().toLocaleString()} × {formatRate(rateToShow)}/1000
                            {special && (
                              <span className="block mt-1 text-neon-green text-xs">
                                Special Price applied for this service
                              </span>
                            )}
                          </>
                        );
                      })()}
                      {getCustomCommentsCount() > 0 && (
                        <span className="block mt-1 text-[var(--text-muted)]">
                          (quantity = {getCustomCommentsCount()} comments)
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Promo code input (optional) – not available when user has special pricing */}
                {selectedService && (
                  <div className="mt-4">
                    {(() => {
                      const key = String(selectedService._id || selectedService.id || selectedService.service_id || '');
                      const hasSpecialPricing = key && myPricing[key];
                      return hasSpecialPricing ? (
                        <p className="text-sm text-[var(--warning)] flex items-center gap-2">
                          <AlertCircle size={16} className="shrink-0" />
                          Promo codes cannot be combined with your special pricing for this service.
                        </p>
                      ) : (
                        <>
                          <Label className="text-[var(--text-muted)] text-sm">Promo code (optional)</Label>
                          <div className="mt-2 flex gap-2">
                            <Input
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              placeholder="ENTER CODE E.G. WELCOME10"
                              className="bg-deep-navy border-[var(--border)] uppercase font-mono text-sm"
                            />
                            <Button
                              type="button"
                              onClick={handleApplyPromo}
                              disabled={promoApplying}
                              className="whitespace-nowrap bg-electric-blue text-black hover:bg-electric-blue/90"
                            >
                              {promoApplying ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
                            </Button>
                          </div>
                          {promoMessage && (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {promoMessage}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Spin wheel free views – only for services listed in admin (empty list = any service) */}
                {!isReseller && selectedService && spinFreeViewsAllowedForService(settings?.spin_free_views_service_id, selectedService.service_id) && (
                  <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <Gift size={14} className="shrink-0" />
                      <span className="text-sm font-medium">
                        {(userStats.spin_free_views ?? 0) > 0
                          ? `${(userStats.spin_free_views ?? 0).toLocaleString()} free views — check box for $0 order`
                          : 'Free views (0) — get balance from Daily Spin to unlock'}
                      </span>
                    </div>
                    {(userStats.spin_free_views ?? 0) > 0 ? (
                      (() => {
                        const orderQty = getEffectiveQuantity();
                        const canUseFreeViews = orderQty > 0 && orderQty <= (userStats.spin_free_views ?? 0);
                        return (
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <Checkbox
                              checked={useFreeViews}
                              onCheckedChange={(c) => setUseFreeViews(!!c)}
                              disabled={!canUseFreeViews}
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                            />
                            <span className={canUseFreeViews ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}>
                              Use free views for this order → <strong className="text-neon-green">$0</strong> (no balance deducted){!canUseFreeViews && ` — quantity must be ≤ ${(userStats.spin_free_views ?? 0).toLocaleString()}`}
                            </span>
                          </label>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">
                        Win free views on <Link to="/dashboard/rewards" className="text-cyan-400 hover:underline">Daily Spin</Link>. Once you have balance, this box becomes clickable and your order will be <strong>$0</strong>.
                      </p>
                    )}
                  </div>
                )}
                {!isReseller &&
                  (userStats.spin_free_views ?? 0) > 0 &&
                  selectedService &&
                  parseAdminServiceIdList(settings?.spin_free_views_service_id).length > 0 &&
                  !spinFreeViewsAllowedForService(settings?.spin_free_views_service_id, selectedService.service_id) && (
                  <p className="text-sm text-cyan-300/80">
                    You have {(userStats.spin_free_views ?? 0).toLocaleString()} free views. To use them at no cost, select one of the spin-reward services:{' '}
                    <span className="font-mono text-cyan-200">
                      {parseAdminServiceIdList(settings.spin_free_views_service_id).map((id) => `#${id}`).join(', ')}
                    </span>
                  </p>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting || !selectedService || !link || (scheduleLater && !scheduledDatetime) || (dripFeedEnabled && selectedService?.drip_feed ? !dripQtyPerRun : (quantityDisabledByComments() && getCustomCommentsCount() > 0 ? false : !quantity))}
                  className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-bold py-2.5 text-sm"
                  data-testid="order-submit-btn"
                >
                  {submitting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                  ) : scheduleLater ? (
                    <>
                      <Clock size={14} className="mr-1" />
                      Schedule Order - {useFreeViews ? 'FREE (free views)' : formatPriceWithRateDecimals(getTotalWithPromo())}
                    </>
                  ) : (
                    <>
                      <DollarSign size={14} className="mr-1" />
                      Place Order - {useFreeViews ? 'FREE (free views)' : formatPriceWithRateDecimals(getTotalWithPromo())}
                    </>
                  )}
                </Button>

                {/* Info */}
                <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <AlertCircle size={16} className="mt-0.5 text-[var(--warning)]" />
                  <p>Orders are processed automatically. Make sure your link is correct before placing the order.</p>
                </div>
              </form>
            )}
          </Card>
        </motion.div>

        {String(settings?.new_order_sidebar_note || '').trim() ? (
          <aside className="min-w-0 lg:sticky lg:top-24 self-start">
            <Card className="glass p-4 md:p-5 border-cyber-purple/30 min-w-0 overflow-hidden">
              <h3 className="text-sm font-exo font-semibold text-[var(--text-primary)] mb-3">Note</h3>
              {settings?.new_order_sidebar_note_format === 'text' ? (
                <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                  {settings.new_order_sidebar_note}
                </div>
              ) : (
                <div
                  className="new-order-sidebar-note-html text-sm text-[var(--text-secondary)] break-words [&_a]:text-cyan-400 [&_a]:underline [&_img]:max-w-full [&_img]:h-auto"
                  dangerouslySetInnerHTML={{ __html: String(settings.new_order_sidebar_note || '') }}
                />
              )}
            </Card>
          </aside>
        ) : null}
        </div>
      </div>

      {reorderModalOrderId && (
        <ReorderModal
          orderId={reorderModalOrderId}
          onClose={() => setReorderModalOrderId(null)}
          onSuccess={() => {
            refreshFrequentlyReordered();
          }}
        />
      )}
      {!isReseller ? <AIOrderAssistantBubble /> : null}
    </DashboardLayout>
  );
};

export default NewOrderPage;
