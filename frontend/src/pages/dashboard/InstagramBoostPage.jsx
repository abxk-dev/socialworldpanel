import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, RefreshCw, ChevronLeft, ExternalLink, DollarSign,
  Eye, MessageCircle, Share2, Bookmark, Repeat, Loader2, X
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { useFormatRate } from '../../hooks/useFormatRate';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const METRIC_CONFIG = {
  views: { icon: Eye, label: 'Views', defaultPrice: 0.5 },
  likes: { icon: Heart, label: 'Likes', defaultPrice: 0.3 },
  comments: { icon: MessageCircle, label: 'Comments', defaultPrice: 1 },
  followers: { icon: Heart, label: 'Followers', defaultPrice: 0.2 },
  shares: { icon: Share2, label: 'Shares', defaultPrice: 0.7 },
  saves: { icon: Bookmark, label: 'Saves', defaultPrice: 0.6 },
  reposts: { icon: Repeat, label: 'Reposts', defaultPrice: 0.8 },
};

const POST_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'reel', label: 'Reels 🎬' },
  { value: 'image', label: 'Photos 🖼' },
  { value: 'carousel', label: 'Carousels' },
];

const LAST_USERNAME_KEY = 'ig_boost_last_username';

function extractUsername(input) {
  if (!input || typeof input !== 'string') return '';
  const s = input.trim();
  const m = s.match(/(?:instagram\.com\/|@)([a-zA-Z0-9_.]+)/);
  return m ? m[1].replace(/\/$/, '') : s;
}

function extractPostUrl(input) {
  if (!input || typeof input !== 'string') return '';
  const s = input.trim();
  const m = s.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
  return m ? `https://www.instagram.com/p/${m[1]}/` : (s.includes('instagram.com/p/') ? s.split('?')[0] : '');
}

const InstagramBoostPage = () => {
  const { token, refreshUser } = useAuth();
  const { formatPrice } = useCurrency();
  const { formatRate } = useFormatRate();
  const [state, setState] = useState(1); // 1=username, 2=profile+grid, 3=metric selector, 4=order form
  const [usernameInput, setUsernameInput] = useState('');
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [igServices, setIgServices] = useState({ views: [], likes: [], comments: [], followers: [], shares: [], saves: [], reposts: [] });
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [postFilter, setPostFilter] = useState('all');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [manualPostUrl, setManualPostUrl] = useState('');
  const [profileFallbackMessage, setProfileFallbackMessage] = useState('');
  const [customComments, setCustomComments] = useState('');
  const [mentionUsernames, setMentionUsernames] = useState('');
  const autoLoadAttempted = useRef(false);

  const MENTION_TYPES = ['Mentions', 'Mentions with Hashtags', 'Mentions Custom List', 'Mentions Hashtag', 'Mentions User Followers'];

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const filteredPosts = postFilter === 'all'
    ? posts
    : posts.filter((p) => p.type === postFilter);
  const availableMetrics = Object.entries(igServices).filter(([_, arr]) => Array.isArray(arr) && arr.length > 0);
  const currentMetricServices = selectedMetric ? (igServices[selectedMetric] || []) : [];

  const fetchSavedProfiles = useCallback(async () => {
    try {
      const res = await api.get('/instagram/saved-profiles', { headers, withCredentials: true });
      setSavedProfiles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSavedProfiles([]);
    }
  }, [token]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/instagram/services', { headers, withCredentials: true });
      setIgServices(res.data || {});
    } catch {
      setIgServices({});
    }
  }, [token]);

  useEffect(() => {
    fetchSavedProfiles();
    fetchServices();
  }, [fetchSavedProfiles, fetchServices]);

  useEffect(() => {
    const last = localStorage.getItem(LAST_USERNAME_KEY);
    if (last) {
      setUsernameInput(last);
    }
  }, []);

  useEffect(() => {
    if (autoLoadAttempted.current) return;
    const last = localStorage.getItem(LAST_USERNAME_KEY);
    if (last && state === 1) {
      autoLoadAttempted.current = true;
      loadProfile(last, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (uname, bypassCache = false) => {
    const u = extractUsername(uname || usernameInput);
    if (!u) {
      toast.error('Enter a valid Instagram username');
      return;
    }
    setLoadingProfile(true);
    try {
      const params = new URLSearchParams({ username: u });
      if (bypassCache) params.set('refresh', '1');
      const res = await api.get(`/instagram/profile?${params}`, { headers, withCredentials: true });
      setProfile(res.data.profile);
      setPosts(res.data.posts || []);
      setProfileFallbackMessage(res.data._message || '');
      setManualPostUrl('');
      setState(2);
      setSelectedPost(null);
      setSelectedMetric(null);
      setSelectedService(null);
      setOrderSuccess(null);
      localStorage.setItem(LAST_USERNAME_KEY, u);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Profile not found or is private. Try another username.';
      toast.error(msg);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLoadProfile = (e) => {
    e?.preventDefault();
    loadProfile(usernameInput, false);
  };

  const handleSaveProfile = async () => {
    if (!profile?.username) return;
    setSavingProfile(true);
    try {
      await api.post('/instagram/save-profile', {
        username: profile.username,
        profile_pic_url: profile.profile_pic_url,
        full_name: profile.full_name,
      }, { headers, withCredentials: true });
      toast.success('Profile saved');
      fetchSavedProfiles();
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUnsaveProfile = async (e, username) => {
    e?.stopPropagation();
    try {
      await api.delete(`/instagram/save-profile/${encodeURIComponent(username)}`, { headers, withCredentials: true });
      fetchSavedProfiles();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const onPostSelect = (post) => {
    setSelectedPost(post);
    setSelectedMetric(null);
    setSelectedService(null);
    setQuantity('');
    setOrderSuccess(null);
    setState(3);
  };

  const handleManualPostUrl = () => {
    const url = extractPostUrl(manualPostUrl);
    if (!url) {
      toast.error('Enter a valid Instagram post URL (e.g. instagram.com/p/xxx/)');
      return;
    }
    const shortcode = url.match(/\/p\/([a-zA-Z0-9_-]+)/)?.[1];
    onPostSelect({
      post_url: url,
      shortcode,
      thumbnail_url: '',
      caption: '',
      likes_count: 0,
      comments_count: 0,
      views_count: 0,
    });
  };

  const onMetricSelect = (metric) => {
    setSelectedMetric(metric);
    const services = igServices[metric] || [];
    const autoService = services.length === 1 ? services[0] : null;
    setSelectedService(autoService);
    setQuantity(autoService ? String(autoService.min_order || 100) : '');
    setCustomComments('');
    setMentionUsernames('');
    setState(4);
    setOrderSuccess(null);
  };

  const goBackToMetrics = () => {
    setState(3);
    setSelectedService(null);
    setQuantity('');
    setCustomComments('');
    setOrderSuccess(null);
  };

  const goBackToPostSelect = () => {
    setState(2);
    setSelectedPost(null);
    setSelectedMetric(null);
    setSelectedService(null);
    setQuantity('');
    setOrderSuccess(null);
  };

  const getCheapestPrice = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => (parseFloat(a.rate) || 0) - (parseFloat(b.rate) || 0));
    return sorted[0]?.rate;
  };

  const commentTypeByType = selectedService?.service_type === 'Custom Comments' || selectedService?.service_type === 'Custom Comments Package';
  const commentTypeByName = (selectedService?.name || '').toLowerCase().includes('custom comment');
  const isCommentType = commentTypeByType || commentTypeByName;
  const isMentionType = MENTION_TYPES.includes(selectedService?.service_type || '');
  const commentLines = customComments.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const mentionList = mentionUsernames.split(',').map((u) => u.trim()).filter(Boolean);
  const commentQty = isCommentType ? commentLines.length : 0;
  const useCommentQty = isCommentType && commentQty > 0;
  const useMentionQty = isMentionType && mentionList.length > 0;

  const calculatePrice = () => {
    if (!selectedService) return 0;
    const q = useCommentQty ? commentQty : (useMentionQty ? mentionList.length : (parseInt(quantity, 10) || 0));
    if (q <= 0) return 0;
    const rate = parseFloat(selectedService.rate) || 0;
    return ((q / 1000) * rate).toFixed(2);
  };

  const snapQuantity = (val) => {
    if (!selectedService) return parseInt(val, 10) || 0;
    const inc = parseInt(selectedService.increment || 0, 10);
    if (inc <= 0) return parseInt(val, 10) || 0;
    const v = parseInt(val, 10) || 0;
    return Math.max(selectedService.min_order || 0, Math.round(v / inc) * inc);
  };

  const handlePlaceOrder = async () => {
    if (!selectedService || !selectedPost?.post_url) return;
    if (isCommentType && commentQty === 0) {
      toast.error('Please enter at least one comment.');
      return;
    }
    if (isMentionType && mentionList.length === 0) {
      toast.error('Please enter at least one username to mention.');
      return;
    }
    const qty = useCommentQty ? commentQty : (useMentionQty ? mentionList.length : snapQuantity(quantity));
    if (qty < (selectedService.min_order || 0)) {
      toast.error(`Minimum: ${selectedService.min_order}`);
      return;
    }
    const max = selectedService.max_order || 1000000;
    if (qty > max) {
      toast.error(`Maximum: ${max}`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        service_id: selectedService.service_id,
        link: selectedPost.post_url,
        quantity: qty,
        source: 'instagram_boost',
      };
      if (isCommentType && commentLines.length > 0) {
        payload.custom_comments = commentLines;
      }
      if (isMentionType && mentionList.length > 0) {
        payload.usernames = mentionList;
      }
      const res = await api.post(
        '/orders',
        payload,
        { headers, withCredentials: true }
      );
      setOrderSuccess(res.data?.order_id);
      await refreshUser();
      toast.success(`Order placed! #${res.data?.order_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const isSaved = profile && savedProfiles.some((p) => (p.username || '').toLowerCase() === (profile?.username || '').toLowerCase());

  return (
    <DashboardLayout title="Instagram Boost">
      <Toaster position="top-right" theme="dark" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* STATE 1: Username input */}
        {state === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass p-6 border-cyber-purple/20">
              <h2 className="text-2xl font-exo font-bold text-[var(--text-primary)] mb-2">Instagram Boost</h2>
              <p className="text-[var(--text-muted)] mb-6">Enter your Instagram username to load your posts</p>
              <form onSubmit={handleLoadProfile} className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                    <Input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      onPaste={(e) => {
                        const text = (e.clipboardData?.getData('text') || '').trim();
                        if (text) setUsernameInput(extractUsername(text) || text);
                      }}
                      placeholder="@username or instagram.com/username"
                      className="pl-10 bg-deep-navy border-[var(--border)]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loadingProfile}
                    className="bg-neon-green hover:bg-neon-green/90 text-black font-bold"
                  >
                    {loadingProfile ? <Loader2 size={20} className="animate-spin" /> : 'Load Profile'}
                  </Button>
                </div>
              </form>
              {savedProfiles.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-[var(--text-muted)] mb-3">Saved Profiles</p>
                  <div className="flex flex-wrap gap-2">
                    {savedProfiles.map((p) => (
                      <button
                        key={p.username}
                        onClick={() => loadProfile(p.username, false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] transition-colors"
                      >
                        {p.profile_pic_url ? (
                          <img src={p.profile_pic_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-cyber-purple/30 flex items-center justify-center">
                            <span className="text-[var(--text-primary)] text-xs">@{p.username?.slice(0, 2)}</span>
                          </div>
                        )}
                        <span className="text-[var(--text-primary)] text-sm">@{p.username}</span>
                        <button
                          onClick={(ev) => handleUnsaveProfile(ev, p.username)}
                          className="text-[var(--text-muted)] hover:text-[var(--error)] ml-1"
                          aria-label="Remove"
                        >
                          <X size={14} />
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* STATE 2: Profile + Posts grid */}
        {state >= 2 && profile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Profile card */}
            <Card className="glass p-6 border-cyber-purple/20">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-start gap-4">
                  {profile.profile_pic_url ? (
                    <img src={profile.profile_pic_url} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-cyber-purple/30" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-cyber-purple/20 border-2 border-cyber-purple/30 flex items-center justify-center">
                      <span className="text-cyber-purple font-bold text-xl">@{profile.username?.slice(0, 2) || '?'}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">{profile.full_name || profile.username}</h3>
                      {profile.is_verified && <Badge className="bg-electric-blue/20 text-electric-blue">✓</Badge>}
                    </div>
                    <p className="text-[var(--text-muted)]">@{profile.username}</p>
                    <div className="flex gap-6 mt-2 text-sm text-[var(--text-muted)]">
                      <span><strong className="text-[var(--text-primary)]">{profile.followers_count?.toLocaleString()}</strong> Followers</span>
                      <span><strong className="text-[var(--text-primary)]">{profile.following_count?.toLocaleString()}</strong> Following</span>
                      <span><strong className="text-[var(--text-primary)]">{profile.posts_count?.toLocaleString()}</strong> Posts</span>
                    </div>
                    {profile.biography && (
                      <p className="text-[var(--text-muted)] text-sm mt-2 max-w-md line-clamp-3">{profile.biography}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={savingProfile || isSaved}
                    className="border-[var(--border)]"
                  >
                    <Heart size={16} className="mr-2" fill={isSaved ? 'currentColor' : 'none'} />
                    {isSaved ? 'Saved' : 'Save Profile'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadProfile(profile.username, true)}
                    disabled={loadingProfile}
                    className="border-[var(--border)]"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Refresh
                  </Button>
                  <button
                    onClick={() => { setState(1); setProfile(null); setPosts([]); }}
                    className="text-electric-blue text-sm hover:underline"
                  >
                    Change Profile
                  </button>
                </div>
              </div>
            </Card>

            {/* Posts grid */}
            <Card className="glass p-6 border-cyber-purple/20">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Select a post to boost</h3>
              <div className="flex gap-2 mb-4 flex-wrap">
                {POST_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setPostFilter(f.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      postFilter === f.value ? 'bg-cyber-purple text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {loadingProfile ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-[var(--bg-card)] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="space-y-4 py-6">
                  {profileFallbackMessage && (
                    <p className="text-center text-[var(--text-muted)] text-sm mb-4">{profileFallbackMessage}</p>
                  )}
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="text-sm text-[var(--text-muted)]">Paste Instagram post URL</p>
                    <div className="flex gap-2">
                      <Input
                        value={manualPostUrl}
                        onChange={(e) => setManualPostUrl(e.target.value)}
                        onPaste={(e) => {
                          const t = (e.clipboardData?.getData('text') || '').trim();
                          if (t) setManualPostUrl(t);
                        }}
                        placeholder="https://www.instagram.com/p/ABC123/"
                        className="bg-deep-navy border-[var(--border)]"
                      />
                      <Button
                        onClick={handleManualPostUrl}
                        className="bg-neon-green hover:bg-neon-green/90 text-black shrink-0"
                      >
                        Boost this post
                      </Button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Or go to New Order to place orders directly</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredPosts.map((post) => (
                    <button
                      key={post.post_id || post.shortcode || post.post_url}
                      onClick={() => onPostSelect(post)}
                      className="relative aspect-square rounded-lg overflow-hidden group"
                    >
                      <img
                        src={post.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge
                          className={
                            post.type === 'reel' ? 'bg-purple-500/80' :
                            post.type === 'carousel' ? 'bg-[var(--warning)]/80' : 'bg-blue-500/80'
                          }
                        >
                          {post.type === 'reel' ? 'REEL' : post.type === 'carousel' ? 'CAROUSEL' : 'PHOTO'}
                        </Badge>
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-4 p-3">
                        <span className="text-[var(--text-primary)] text-sm flex items-center gap-1">
                          <Heart size={14} /> {post.likes_count?.toLocaleString()}
                        </span>
                        <span className="text-[var(--text-primary)] text-sm flex items-center gap-1">
                          <MessageCircle size={14} /> {post.comments_count?.toLocaleString()}
                        </span>
                        {post.views_count > 0 && (
                          <span className="text-[var(--text-primary)] text-sm flex items-center gap-1">
                            <Eye size={14} /> {post.views_count?.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* STATE 3 & 4: Metric selector + Order form panel */}
        {selectedPost && (state === 3 || state === 4) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:relative lg:z-auto"
          >
            <Card className="glass p-6 border-cyber-purple/20 lg:border-2 lg:border-cyber-purple/40">
              <div className="flex items-center gap-4 mb-4">
                {selectedPost.thumbnail_url ? (
                  <img src={selectedPost.thumbnail_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-cyber-purple/20 flex items-center justify-center">
                    <ExternalLink size={24} className="text-cyber-purple" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-muted)] text-sm truncate">{selectedPost.caption || 'No caption'}</p>
                  <a
                    href={selectedPost.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-blue text-sm hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    {selectedPost.post_url}
                  </a>
                </div>
                <button
                  onClick={goBackToPostSelect}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Close
                </button>
              </div>

              {state === 3 && (
                <>
                  <h4 className="text-[var(--text-primary)] font-bold mb-4">What do you want to boost?</h4>
                  {availableMetrics.length === 0 ? (
                    <p className="text-[var(--text-muted)] py-4">No Instagram services available. Add Instagram services in Admin → Services.</p>
                  ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {availableMetrics.map(([key, services]) => {
                      const cfg = METRIC_CONFIG[key] || { icon: DollarSign, label: key, from: '' };
                      const Icon = cfg.icon;
                      const price = getCheapestPrice(services);
                      return (
                        <button
                          key={key}
                          onClick={() => onMetricSelect(key)}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-cyber-purple/50 transition-all text-left"
                        >
                          <Icon size={24} className="text-cyber-purple" />
                          <span className="text-[var(--text-primary)] font-medium">{cfg.label}</span>
                          <span className="text-electric-blue text-sm">
                            {`from ${formatPrice(price != null ? parseFloat(price) : (cfg.defaultPrice ?? 0))}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </>
              )}

              {state === 4 && (
                <div className="space-y-4">
                  <button
                    onClick={goBackToMetrics}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                  {selectedMetric && (
                    <Badge className="bg-cyber-purple/20 text-cyber-purple">
                      {METRIC_CONFIG[selectedMetric]?.label || selectedMetric}
                    </Badge>
                  )}

                  {orderSuccess ? (
                    <div className="py-6 text-center">
                      <p className="text-neon-green font-bold text-lg mb-4">Order placed! #{orderSuccess}</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <Button onClick={goBackToMetrics} className="bg-electric-blue text-black">
                          Boost another metric
                        </Button>
                        <Button variant="outline" onClick={goBackToPostSelect} className="border-[var(--border)]">
                          Boost another post
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Service selector */}
                      {currentMetricServices.length > 1 ? (
                        <div>
                          <p className="text-sm text-[var(--text-muted)] mb-2">Select service</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentMetricServices.map((srv) => (
                              <button
                                key={srv.service_id}
                                onClick={() => {
                                  setSelectedService(srv);
                                  setQuantity(String(srv.min_order || 100));
                                  setCustomComments('');
                                  setMentionUsernames('');
                                }}
                                className={`p-3 rounded-lg text-left border transition-colors ${
                                  selectedService?.service_id === srv.service_id
                                    ? 'border-cyber-purple bg-cyber-purple/10'
                                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                <span className="text-[var(--text-primary)] block">{srv.name}</span>
                                <span className="text-electric-blue text-sm">{formatRate(srv.rate)}/1000</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : currentMetricServices.length === 1 && (
                        <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                          <span className="text-[var(--text-primary)]">{currentMetricServices[0].name}</span>
                          <span className="text-electric-blue text-sm ml-2">{formatRate(currentMetricServices[0]?.rate ?? 0)}/1000</span>
                        </div>
                      )}

                      {(selectedService || currentMetricServices.length === 1) && (
                        <div className="space-y-4">
                          {selectedService && isCommentType && (
                            <div>
                              <p className="text-sm text-[var(--text-muted)] mb-2">
                                Comments
                                <span className="text-[var(--text-muted)] text-xs ml-2">
                                  Enter one comment per line ({commentLines.length} entered, quantity = {commentLines.length})
                                </span>
                              </p>
                              <Textarea
                                value={customComments}
                                onChange={(e) => setCustomComments(e.target.value)}
                                placeholder="Great post!\nLove this content!\nAmazing work 🔥"
                                rows={5}
                                className="bg-deep-navy border-[var(--border)]"
                              />
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                If you enter fewer comments than quantity, they will be repeated automatically.
                              </p>
                            </div>
                          )}
                          {selectedService && isMentionType && (
                            <div>
                              <p className="text-sm text-[var(--text-muted)] mb-2">
                                Usernames to Mention
                                <span className="text-[var(--text-muted)] text-xs ml-2">
                                  {mentionList.length} entered
                                </span>
                              </p>
                              <Input
                                type="text"
                                value={mentionUsernames}
                                onChange={(e) => setMentionUsernames(e.target.value)}
                                placeholder="@user1, @user2, @user3"
                                className="bg-deep-navy border-[var(--border)]"
                              />
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Separate usernames with commas.
                              </p>
                            </div>
                          )}
                          {((!isCommentType || commentQty === 0) && (!isMentionType || mentionList.length === 0)) && (
                            <div>
                              <p className="text-sm text-[var(--text-muted)] mb-2">Quantity</p>
                              <div className="flex gap-2 items-center">
                                <Input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => setQuantity(e.target.value)}
                                  min={selectedService?.min_order || 0}
                                  max={selectedService?.max_order || 1000000}
                                  className="bg-deep-navy border-[var(--border)]"
                                />
                                <span className="text-[var(--text-muted)] text-sm">
                                  Total: {formatPrice(calculatePrice())}
                                </span>
                              </div>
                            </div>
                          )}
                          {isCommentType && commentQty > 0 && (
                            <p className="text-sm text-electric-blue">
                              Total: {formatPrice(calculatePrice())} ({commentQty} comments)
                            </p>
                          )}
                          <Button
                            onClick={handlePlaceOrder}
                            disabled={submitting || (isCommentType ? commentQty === 0 : (isMentionType ? mentionList.length === 0 : !quantity))}
                            className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-bold py-6"
                          >
                            {submitting ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <>
                                <DollarSign size={20} className="mr-2" />
                                Place Order - {formatPrice(calculatePrice())}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default InstagramBoostPage;
