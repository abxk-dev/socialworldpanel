import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Globe, Mail, AlertTriangle, Upload, Image, Loader2, Trash2, Instagram, Bell, Home, Gift, Radio, MessageCircle, LayoutList, ArrowUpFromLine } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, useSettings } from '../../App';
import { API, assetUrl } from '../../config';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import api from '../../lib/axios';
import { normalizeAdminServiceId } from '../../lib/utils';
import ThemeSwitcher from '../../components/admin/ThemeSwitcher';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';

const AdminSettings = () => {
  const { token, user } = useAuth();
  const { refetchSettings } = useSettings();
  const isMainAdmin = user?.role === 'main_admin';
  const [settings, setSettings] = useState({
    panel_name: 'Social World Panel',
    panel_logo: '',
    panel_logo_light: '',
    panel_logo_light_updated_at: 0,
    favicon: '',
    maintenance_mode: false,
    registration_enabled: true,
    free_balance_new_users: 0,
    default_currency: 'USD',
    google_analytics_id: '',
    rapidapi_key: '',
    rapidapi_instagram_key: '',
    instagram_boost_enabled: true,
    max_saved_profiles: 5,
    notification_popup_limit: 1,
    hero_headline: '',
    hero_description: '',
    hero_image: '',
    hero_glow_color: '#FF5A46',
    referral_commission_percent: 5,
    referral_system_enabled: true,
    whatsapp_support_number: '',
    mass_order_enabled: true,
    mass_order_max_links: 100,
    mass_order_min_interval: 1,
    mass_order_max_interval: 1440,
    withdrawal_enabled: true,
    withdrawal_min_amount: 10,
    withdrawal_max_amount: 500,
    withdrawal_min_spent: 0,
    withdrawal_fee_fixed: 0.5,
    withdrawal_fee_percentage: 2,
    withdrawal_crypto_networks: ['TRC20', 'ERC20', 'BEP20'],
    google_site_verification: '',
    bing_site_verification: '',
    custom_head_html: '',
    custom_footer_html: '',
    new_order_sidebar_note: '',
    new_order_sidebar_note_format: 'html',
    spin_free_views_service_id: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoLight, setUploadingLogoLight] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoLightError, setLogoLightError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const [freeTrial, setFreeTrial] = useState({
    free_trial_enabled: false,
    free_trial_service_id: '',
    free_trial_quantity: 50,
    free_trial_label: '50 YouTube Views',
    free_trial_show_on_homepage: true,
    free_trial_link_placeholder: 'Paste your link',
    free_trial_disclaimer: 'One per account. Results typically in 1–6 hours.',
    free_trial_modal_title: 'Claim Your Free Trial',
    free_trial_button_text: "Claim Now — It's Free!",
  });
  const [freeTrialStats, setFreeTrialStats] = useState({ total_trials_used: 0, converted_to_paid: 0, conversion_rate_pct: 0, revenue_from_converted: 0 });
  const [savingFreeTrial, setSavingFreeTrial] = useState(false);
  const [liveFeed, setLiveFeed] = useState({ live_feed_enabled: true, live_feed_show_country: true, live_feed_speed_ms: 3000, live_feed_show_toast: true });
  const [savingLiveFeed, setSavingLiveFeed] = useState(false);

  const logoInputRef = useRef(null);
  const logoLightInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  const heroInputRef = useRef(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/admin/settings', { headers, withCredentials: true });
        const data = response.data && typeof response.data === 'object' ? response.data : {};
        setSettings((prev) => ({ ...prev, ...data, smtp_password: '' }));
        if ('free_trial_enabled' in data || 'free_trial_service_id' in data) {
          setFreeTrial((prev) => ({
            ...prev,
            free_trial_enabled: data.free_trial_enabled === true,
            free_trial_service_id: data.free_trial_service_id ?? prev.free_trial_service_id,
            free_trial_quantity: Number(data.free_trial_quantity) || prev.free_trial_quantity,
            free_trial_label: data.free_trial_label ?? prev.free_trial_label,
            free_trial_show_on_homepage: data.free_trial_show_on_homepage !== false,
            free_trial_link_placeholder: data.free_trial_link_placeholder ?? prev.free_trial_link_placeholder,
            free_trial_disclaimer: data.free_trial_disclaimer ?? prev.free_trial_disclaimer,
            free_trial_modal_title: data.free_trial_modal_title ?? prev.free_trial_modal_title,
            free_trial_button_text: data.free_trial_button_text ?? prev.free_trial_button_text,
          }));
        }
        if ('live_feed_enabled' in data || 'live_feed_speed_ms' in data) {
          setLiveFeed((prev) => ({
            ...prev,
            live_feed_enabled: data.live_feed_enabled !== false,
            live_feed_show_country: data.live_feed_show_country !== false,
            live_feed_speed_ms: Number(data.live_feed_speed_ms) || prev.live_feed_speed_ms,
            live_feed_show_toast: data.live_feed_show_toast !== false,
          }));
        }
        setLogoError(false);
        setFaviconError(false);
        setHeroError(false);
      } catch (error) {
        console.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchFreeTrialStats = async () => {
      try {
        const statsRes = await api.get('/admin/free-trial/stats', { headers, withCredentials: true });
        const st = statsRes.data || {};
        setFreeTrialStats({
          total_trials_used: st.total_trials_used ?? 0,
          converted_to_paid: st.converted_to_paid ?? 0,
          conversion_rate_pct: st.conversion_rate_pct ?? 0,
          revenue_from_converted: st.revenue_from_converted ?? 0,
        });
      } catch (err) {
        console.error('Failed to load free trial stats', err);
      }
    };
    fetchFreeTrialStats();
  }, [token]);

  const handleSaveFreeTrial = async () => {
    setSavingFreeTrial(true);
    try {
      await api.post('/admin/free-trial/settings', {
        enabled: freeTrial.free_trial_enabled,
        service_id: normalizeAdminServiceId(freeTrial.free_trial_service_id) || null,
        quantity: freeTrial.free_trial_quantity,
        label: freeTrial.free_trial_label,
        show_on_homepage: freeTrial.free_trial_show_on_homepage,
        link_placeholder: freeTrial.free_trial_link_placeholder,
        disclaimer: freeTrial.free_trial_disclaimer,
        modal_title: freeTrial.free_trial_modal_title,
        button_text: freeTrial.free_trial_button_text,
      }, { headers, withCredentials: true });
      toast.success('Free trial settings saved');
      await refetchSettings?.();
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Failed to save free trial settings';
      toast.error(msg);
    } finally {
      setSavingFreeTrial(false);
    }
  };

  const handleSaveLiveFeed = async () => {
    setSavingLiveFeed(true);
    try {
      await api.post('/admin/live-feed/settings', {
        enabled: liveFeed.live_feed_enabled,
        show_country: liveFeed.live_feed_show_country,
        speed_ms: liveFeed.live_feed_speed_ms,
        show_toast: liveFeed.live_feed_show_toast,
      }, { headers, withCredentials: true });
      toast.success('Live feed settings saved');
      await refetchSettings?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save live feed settings');
    } finally {
      setSavingLiveFeed(false);
    }
  };

  const buildSettingsSavePayload = () => {
    const smtpPass = String(settings.smtp_password || '').trim();
    return {
      ...settings,
      smtp_port: Math.min(65535, Math.max(1, parseInt(settings.smtp_port, 10) || 587)),
      smtp_password: smtpPass,
      free_trial_enabled: freeTrial.free_trial_enabled,
      free_trial_service_id: normalizeAdminServiceId(freeTrial.free_trial_service_id),
      free_trial_quantity: Math.max(1, parseInt(freeTrial.free_trial_quantity, 10) || 50),
      free_trial_label: freeTrial.free_trial_label,
      free_trial_show_on_homepage: freeTrial.free_trial_show_on_homepage,
      free_trial_link_placeholder: freeTrial.free_trial_link_placeholder,
      free_trial_disclaimer: freeTrial.free_trial_disclaimer,
      free_trial_modal_title: freeTrial.free_trial_modal_title,
      free_trial_button_text: freeTrial.free_trial_button_text,
      live_feed_enabled: liveFeed.live_feed_enabled,
      live_feed_show_country: liveFeed.live_feed_show_country,
      live_feed_speed_ms: Math.min(60000, Math.max(1000, parseInt(liveFeed.live_feed_speed_ms, 10) || 3000)),
      live_feed_show_toast: liveFeed.live_feed_show_toast,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', buildSettingsSavePayload(), { headers, withCredentials: true });
      toast.success('Settings saved successfully');
      setSettings((prev) => ({ ...prev, smtp_password: '' }));
      await refetchSettings?.();
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Failed to save settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploadingLogo(true);
    try {
      const base64 = await fileToDataUrl(file);
      const response = await api.post('/admin/upload/logo', { base64 }, { headers, withCredentials: true });
      const url = response.data?.url;
      const ts = response.data?.panel_logo_updated_at ?? Date.now();
      if (url) {
        setSettings(prev => ({ ...prev, panel_logo: url, panel_logo_updated_at: ts }));
        setLogoError(false);
        await refetchSettings?.();
      }
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleLightLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploadingLogoLight(true);
    try {
      const base64 = await fileToDataUrl(file);
      const response = await api.post(
        '/admin/upload/logo',
        { base64, logo_type: 'light' },
        { headers, withCredentials: true }
      );
      const url = response.data?.url;
      const ts = response.data?.panel_logo_light_updated_at ?? Date.now();
      if (url) {
        setSettings((prev) => ({ ...prev, panel_logo_light: url, panel_logo_light_updated_at: ts }));
        setLogoLightError(false);
        await refetchSettings?.();
      }
      toast.success('White theme logo uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload white theme logo');
    } finally {
      setUploadingLogoLight(false);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploadingFavicon(true);
    try {
      const base64 = await fileToDataUrl(file);
      const response = await api.post('/admin/upload/favicon', { base64 }, { headers, withCredentials: true });
      const url = response.data?.url;
      const ts = response.data?.favicon_updated_at ?? Date.now();
      if (url) {
        setSettings(prev => ({ ...prev, favicon: url, favicon_updated_at: ts }));
        setFaviconError(false);
        await refetchSettings?.();
      }
      toast.success('Favicon uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
      e.target.value = '';
    }
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, panel_logo: '' }));
    setLogoError(false);
  };

  const removeLightLogo = () => {
    setSettings(prev => ({ ...prev, panel_logo_light: '' }));
    setLogoLightError(false);
  };

  const removeFavicon = () => {
    setSettings(prev => ({ ...prev, favicon: '' }));
    setFaviconError(false);
  };

  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploadingHero(true);
    try {
      const base64 = await fileToDataUrl(file);
      const response = await api.post('/admin/upload/hero', { base64 }, { headers, withCredentials: true });
      const url = response.data?.url;
      const ts = response.data?.hero_image_updated_at ?? Date.now();
      if (url) {
        setSettings(prev => ({ ...prev, hero_image: url, hero_image_updated_at: ts }));
        setHeroError(false);
        await refetchSettings?.();
      }
      toast.success('Homepage hero image uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload hero image');
    } finally {
      setUploadingHero(false);
      e.target.value = '';
    }
  };

  const removeHero = () => {
    setSettings(prev => ({ ...prev, hero_image: '' }));
    setHeroError(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-3xl mx-auto space-y-6">
        {/* All settings sections — expand/collapse (accordion) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="text-cyber-purple" size={24} />
              <h2 className="text-xl font-exo font-bold text-white">Settings</h2>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Click a section to open it. Use <span className="text-gray-400">Save Settings</span> at the bottom for most fields; Free Trial and Live Feed also have their own save buttons.
            </p>
            <Accordion type="multiple" defaultValue={['branding']} className="w-full">
              <AccordionItem value="branding" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyber-purple [&[data-state=open]]:text-cyber-purple">
                  <span className="flex items-center gap-2">
                    <Image size={20} className="text-cyber-purple shrink-0" />
                    Branding
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-6">
                <div>
                  <Label>Panel Name</Label>
                  <Input
                    value={settings.panel_name}
                    onChange={(e) => setSettings({ ...settings, panel_name: e.target.value })}
                    className="mt-2 bg-deep-navy border-white/10"
                    data-testid="settings-panel-name"
                  />
                </div>

                <div>
                  <Label>Panel Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {settings.panel_logo && !logoError ? (
                      <div className="relative group">
                        <img
                          src={assetUrl(settings.panel_logo, settings.panel_logo_updated_at)}
                          alt="Logo"
                          className="h-16 w-auto object-contain bg-white/5 rounded-lg p-2"
                          onError={() => setLogoError(true)}
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-32 bg-white/5 rounded-lg flex flex-col items-center justify-center gap-1 border border-dashed border-white/20">
                        <Image className="text-gray-500" size={24} />
                        <span className="text-gray-500 text-sm">No logo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="border-white/10"
                    >
                      {uploadingLogo ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <Upload size={16} className="mr-2" />
                      )}
                      Upload Logo
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommended: 200x60px PNG or SVG</p>
                </div>

                <div>
                  <Label>White Theme Logo (Light mode)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {settings.panel_logo_light && !logoLightError ? (
                      <div className="relative group">
                        <img
                          src={assetUrl(settings.panel_logo_light, settings.panel_logo_light_updated_at)}
                          alt="White theme logo"
                          className="h-16 w-auto object-contain bg-white/5 rounded-lg p-2"
                          onError={() => setLogoLightError(true)}
                        />
                        <button
                          type="button"
                          onClick={removeLightLogo}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-32 bg-white/5 rounded-lg flex flex-col items-center justify-center gap-0.5 border border-dashed border-white/20">
                        <Image className="text-gray-500" size={24} />
                        <span className="text-gray-500 text-xs">No light logo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={logoLightInputRef}
                      onChange={handleLightLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoLightInputRef.current?.click()}
                      disabled={uploadingLogoLight}
                      className="border-white/10"
                    >
                      {uploadingLogoLight ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <Upload size={16} className="mr-2" />
                      )}
                      Upload Light Logo
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used automatically when Light theme is enabled</p>
                </div>

                <div>
                  <Label>Favicon</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {settings.favicon && !faviconError ? (
                      <div className="relative group">
                        <img
                          src={assetUrl(settings.favicon, settings.favicon_updated_at)}
                          alt="Favicon"
                          className="h-10 w-10 object-contain bg-white/5 rounded-lg p-1"
                          onError={() => setFaviconError(true)}
                        />
                        <button
                          type="button"
                          onClick={removeFavicon}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-10 w-10 bg-white/5 rounded-lg flex flex-col items-center justify-center gap-0.5 border border-dashed border-white/20">
                        <Image className="text-gray-500" size={16} />
                        <span className="text-gray-500 text-xs">No favicon</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={faviconInputRef}
                      onChange={handleFaviconUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="border-white/10"
                    >
                      {uploadingFavicon ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <Upload size={16} className="mr-2" />
                      )}
                      Upload Favicon
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommended: 32x32px ICO or PNG</p>
                </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="whatsapp" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-[#25D366] [&[data-state=open]]:text-[#25D366]">
                  <span className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#25D366]/20 shrink-0">
                      <MessageCircle className="text-[#25D366]" size={20} />
                    </span>
                    WhatsApp Support
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-500 text-sm mb-4">Show a WhatsApp button to users for support. Set the number below.</p>
                  <div>
                    <Label className="text-gray-400">WhatsApp Support Number</Label>
                    <Input
                      value={settings.whatsapp_support_number ?? ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_support_number: e.target.value })}
                      placeholder="e.g. 919876543210 or +91 98765 43210"
                      className="mt-2 bg-deep-navy border-white/10 max-w-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Country code + number (e.g. 919876543210). A floating WhatsApp button and footer link will appear for users when set. Leave empty to hide.</p>
                  </div>
                  <p className="text-xs text-amber-500/90 mt-3">Save using &quot;Save Settings&quot; at the bottom.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="hero" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyber-purple [&[data-state=open]]:text-cyber-purple">
                  <span className="flex items-center gap-2">
                    <Home className="text-cyber-purple shrink-0" size={22} />
                    Homepage Hero
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400">Hero headline (H1)</Label>
                <Input
                  value={settings.hero_headline ?? ''}
                  onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })}
                  placeholder="Best YouTube Watchtime SMM Panel – High Retention Guaranteed"
                  className="mt-2 bg-deep-navy border-white/10"
                />
                <p className="text-xs text-gray-500 mt-1">Main heading at top of homepage</p>
              </div>
              <div>
                <Label className="text-gray-400">Hero description</Label>
                <textarea
                  value={settings.hero_description ?? ''}
                  onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
                  placeholder="The #1 SMM Panel for instant social media growth. Get real followers, likes, views & more at the cheapest prices."
                  rows={3}
                  className="mt-2 w-full bg-deep-navy border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyber-purple"
                />
                <p className="text-xs text-gray-500 mt-1">Short text below the headline</p>
              </div>
              <div>
                <Label className="text-gray-400">Hero glow color</Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">Color of the glow behind the hero image on the homepage</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.hero_glow_color || '#FF5A46'}
                    onChange={(e) => setSettings({ ...settings, hero_glow_color: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-deep-navy"
                  />
                  <Input
                    value={settings.hero_glow_color || '#FF5A46'}
                    onChange={(e) => setSettings({ ...settings, hero_glow_color: e.target.value || '#FF5A46' })}
                    placeholder="#FF5A46"
                    className="w-28 bg-deep-navy border-white/10 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-400">Hero image</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.hero_image && !heroError ? (
                    <div className="relative group">
                      <img
                        src={assetUrl(settings.hero_image, settings.hero_image_updated_at)}
                        alt="Hero"
                        className="h-24 w-auto max-w-[200px] object-contain bg-white/5 rounded-lg p-2"
                        onError={() => setHeroError(true)}
                      />
                      <button
                        type="button"
                        onClick={removeHero}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-40 bg-white/5 rounded-lg flex flex-col items-center justify-center gap-1 border border-dashed border-white/20">
                      <Image className="text-gray-500" size={24} />
                      <span className="text-gray-500 text-sm">No hero image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={heroInputRef}
                    onChange={handleHeroUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadingHero}
                    className="border-white/10"
                  >
                    {uploadingHero ? (
                      <Loader2 size={16} className="animate-spin mr-2" />
                    ) : (
                      <Upload size={16} className="mr-2" />
                    )}
                    Upload Hero Image
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Large image on homepage. If empty, default image is used.</p>
              </div>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="free-trial" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-[#22c55e] [&[data-state=open]]:text-[#22c55e]">
                  <span className="flex items-center gap-2">
                    <Gift className="text-[#22c55e] shrink-0" size={22} />
                    Free Trial
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Enable Free Trial</Label>
                  <p className="text-sm text-gray-500">New users get one free small order on signup</p>
                </div>
                <Switch
                  checked={freeTrial.free_trial_enabled}
                  onCheckedChange={(val) => setFreeTrial((prev) => ({ ...prev, free_trial_enabled: val }))}
                />
              </div>
              <div>
                <Label>Trial Service (service ID used for free trial)</Label>
                <Input
                  value={freeTrial.free_trial_service_id || ''}
                  onChange={(e) => setFreeTrial((prev) => ({ ...prev, free_trial_service_id: e.target.value }))}
                  placeholder="e.g. 5786 or srv_abc123"
                  className="mt-2 bg-deep-navy border-white/10 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Type the exact <strong className="text-gray-300">service_id</strong> from your services list (with or without #). Must match an active service.</p>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={freeTrial.free_trial_quantity}
                  onChange={(e) => setFreeTrial((prev) => ({ ...prev, free_trial_quantity: parseInt(e.target.value, 10) || 50 }))}
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label>Display Label</Label>
                <Input
                  value={freeTrial.free_trial_label}
                  onChange={(e) => setFreeTrial((prev) => ({ ...prev, free_trial_label: e.target.value }))}
                  placeholder="50 YouTube Views"
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Show on Homepage</Label>
                  <p className="text-sm text-gray-500">Display &quot;Try Before You Buy&quot; section on landing page</p>
                </div>
                <Switch
                  checked={freeTrial.free_trial_show_on_homepage}
                  onCheckedChange={(val) => setFreeTrial((prev) => ({ ...prev, free_trial_show_on_homepage: val }))}
                />
              </div>
              <div className="border-t border-white/10 pt-4 mt-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Claim modal content (user-facing)</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400">Modal title</Label>
                    <Input
                      value={freeTrial.free_trial_modal_title}
                      onChange={(e) => setFreeTrial((prev) => ({ ...prev, free_trial_modal_title: e.target.value }))}
                      placeholder="Claim Your Free Trial"
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Link input placeholder</Label>
                    <Input
                      value={freeTrial.free_trial_link_placeholder}
                      onChange={(e) => setFreeTrial((prev) => ({ ...prev, free_trial_link_placeholder: e.target.value }))}
                      placeholder="Paste your YouTube video link"
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                    <p className="text-xs text-gray-500 mt-1">e.g. &quot;Paste your Instagram post link&quot;</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Disclaimer / fine print</Label>
                    <Input
                      value={freeTrial.free_trial_disclaimer}
                      onChange={(e) => setFreeTrial((prev) => ({ ...prev, free_trial_disclaimer: e.target.value }))}
                      placeholder="One per account. Results typically in 1–6 hours."
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Claim button text</Label>
                    <Input
                      value={freeTrial.free_trial_button_text}
                      onChange={(e) => setFreeTrial((prev) => ({ ...prev, free_trial_button_text: e.target.value }))}
                      placeholder="Claim Now — It's Free!"
                      className="mt-2 bg-deep-navy border-white/10"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
              <span className="text-gray-400">Total trials claimed: <strong className="text-white">{freeTrialStats.total_trials_used}</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">Converted to paid: <strong className="text-neon-green">{freeTrialStats.converted_to_paid}</strong> ({freeTrialStats.conversion_rate_pct}%)</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">Revenue from converted: <strong className="text-neon-green">${Number(freeTrialStats.revenue_from_converted || 0).toFixed(2)}</strong></span>
            </div>
            <p className="text-xs text-gray-500 mb-2">You can also use the main <strong className="text-gray-300">Save Settings</strong> at the bottom to save free trial together with the rest.</p>
            <Button onClick={handleSaveFreeTrial} disabled={savingFreeTrial} className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold">
              {savingFreeTrial ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Save Free Trial Settings
            </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="spin-wheel" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyan-400 [&[data-state=open]]:text-cyan-400">
                  <span className="flex items-center gap-2">
                    <Gift className="text-cyan-400 shrink-0" size={22} />
                    Spin wheel free views
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <p className="text-sm text-gray-400 mb-4">
              When a user wins free views on the spin wheel, they redeem them on <strong className="text-white">Place New Order</strong>. Enter one or more <strong className="text-white">service_id</strong> values (comma, space, or newline separated). The free-views box only appears when the user selects one of these services. Leave empty to allow redemption on <strong className="text-white">any</strong> service.
            </p>
            <div>
              <Label>Service IDs for spin free views redemption</Label>
              <Textarea
                value={settings.spin_free_views_service_id || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, spin_free_views_service_id: e.target.value }))}
                placeholder={'5786\n9210\nor: 5786, 9210, srv_abc'}
                rows={3}
                className="mt-2 bg-deep-navy border-white/10 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Saved with the green button here or with the main &quot;Save Settings&quot; at the bottom (both update the database).</p>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="live-feed" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-[#22c55e] [&[data-state=open]]:text-[#22c55e]">
                  <span className="flex items-center gap-2">
                    <Radio className="text-[#22c55e] shrink-0" size={22} />
                    Live Order Feed
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Enable Live Feed</Label>
                  <p className="text-sm text-gray-500">Show live orders ticker and toast on homepage</p>
                </div>
                <Switch
                  checked={liveFeed.live_feed_enabled}
                  onCheckedChange={(val) => setLiveFeed((prev) => ({ ...prev, live_feed_enabled: val }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Show Country</Label>
                  <p className="text-sm text-gray-500">Display country/flag in feed items</p>
                </div>
                <Switch
                  checked={liveFeed.live_feed_show_country}
                  onCheckedChange={(val) => setLiveFeed((prev) => ({ ...prev, live_feed_show_country: val }))}
                />
              </div>
              <div>
                <Label>Ticker Speed (ms)</Label>
                <Input
                  type="number"
                  min={1000}
                  max={60000}
                  step={1000}
                  value={liveFeed.live_feed_speed_ms}
                  onChange={(e) => setLiveFeed((prev) => ({ ...prev, live_feed_speed_ms: parseInt(e.target.value, 10) || 3000 }))}
                  className="mt-2 bg-deep-navy border-white/10"
                />
                <p className="text-xs text-gray-500 mt-1">Animation duration (1000–60000). Lower = faster scroll.</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Show Toast Popups</Label>
                  <p className="text-sm text-gray-500">Bottom-left toast every 8s on homepage and dashboard</p>
                </div>
                <Switch
                  checked={liveFeed.live_feed_show_toast}
                  onCheckedChange={(val) => setLiveFeed((prev) => ({ ...prev, live_feed_show_toast: val }))}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">Tip: The bottom &quot;Save Settings&quot; also saves live feed together with branding, spin IDs, and free trial.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveLiveFeed} disabled={savingLiveFeed} className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold">
                {savingLiveFeed ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Live Feed Settings
              </Button>
              <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-white/20 text-gray-300 hover:bg-white/10">
                Preview on Homepage →
              </a>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="general" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyber-purple [&[data-state=open]]:text-cyber-purple">
                  <span className="flex items-center gap-2">
                    <Globe className="text-cyber-purple shrink-0" size={22} />
                    General Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-4">
              <div>
                <Label>Default Currency</Label>
                <Input
                  value={settings.default_currency}
                  onChange={(e) => setSettings({...settings, default_currency: e.target.value})}
                  className="mt-2 bg-deep-navy border-white/10"
                  placeholder="USD"
                />
              </div>

              <div>
                <Label>Free Balance for New Users ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.free_balance_new_users}
                  onChange={(e) => setSettings({...settings, free_balance_new_users: parseFloat(e.target.value) || 0})}
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>

              <div>
                <Label>Google Analytics ID</Label>
                <Input
                  value={settings.google_analytics_id || ''}
                  onChange={(e) => setSettings({...settings, google_analytics_id: e.target.value})}
                  className="mt-2 bg-deep-navy border-white/10"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="referral_system_enabled"
                  checked={settings.referral_system_enabled !== false}
                  onCheckedChange={(v) => setSettings({...settings, referral_system_enabled: v})}
                />
                <Label htmlFor="referral_system_enabled" className="text-white cursor-pointer">Referral system On</Label>
              </div>
              <p className="text-xs text-gray-500 mt-1">When off, referral links and commission are disabled. Users will not see referral code or earn commission.</p>
              <div>
                <Label>Referral commission (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.referral_commission_percent ?? 5}
                  onChange={(e) => setSettings({...settings, referral_commission_percent: parseFloat(e.target.value) || 0})}
                  className="mt-2 bg-deep-navy border-white/10"
                  placeholder="5"
                />
                <p className="text-xs text-gray-500 mt-1">Percentage of each order amount credited to the referrer when a referred user places an order (only when referral system is On).</p>
              </div>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notifications" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyber-purple [&[data-state=open]]:text-cyber-purple">
                  <span className="flex items-center gap-2">
                    <Bell className="text-cyber-purple shrink-0" size={22} />
                    Notification Popup
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-2">
              <Label>Show each notification as popup</Label>
              <p className="text-sm text-gray-500">When you send a notification, how many times it can appear as a popup for each user.</p>
              <select
                value={settings.notification_popup_limit ?? 1}
                onChange={(e) => setSettings({ ...settings, notification_popup_limit: parseInt(e.target.value, 10) })}
                className="mt-2 w-full max-w-xs bg-deep-navy border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyber-purple"
              >
                <option value={1}>Once</option>
                <option value={2}>Twice</option>
                <option value={3}>3 times</option>
                <option value={0}>Unlimited</option>
              </select>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="instagram-boost" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyber-purple [&[data-state=open]]:text-cyber-purple">
                  <span className="flex items-center gap-2">
                    <Instagram className="text-cyber-purple shrink-0" size={22} />
                    Instagram Boost
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Enable Instagram Boost</Label>
                  <p className="text-sm text-gray-500">Show &quot;Instagram Boost&quot; in user sidebar</p>
                </div>
                <Switch
                  checked={settings.instagram_boost_enabled !== false}
                  onCheckedChange={(val) => setSettings({...settings, instagram_boost_enabled: val})}
                />
              </div>
              <div>
                <Label>RapidAPI Key (Start Count)</Label>
                <Input
                  type="password"
                  value={settings.rapidapi_key || ''}
                  onChange={(e) => setSettings({...settings, rapidapi_key: e.target.value})}
                  className="mt-2 bg-deep-navy border-white/10"
                  placeholder="X-RapidAPI-Key for real-time start count"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for real-time start count fetching (Instagram, YouTube, Facebook, X). Same or different key as below.
                </p>
              </div>
              <div>
                <Label>RapidAPI Instagram Key</Label>
                <Input
                  type="password"
                  value={settings.rapidapi_instagram_key || ''}
                  onChange={(e) => setSettings({...settings, rapidapi_instagram_key: e.target.value})}
                  className="mt-2 bg-deep-navy border-white/10"
                  placeholder="X-RapidAPI-Key (e.g. Instagram Scraper or Instagram Looter)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  RapidAPI key for Instagram: Instagram Scraper Stable API, Instagram Scraper API2, or Instagram Looter. Used for profile + posts when direct fetch fails.
                </p>
              </div>
              <div>
                <Label>Max Saved Profiles</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.max_saved_profiles ?? 5}
                  onChange={(e) => setSettings({...settings, max_saved_profiles: parseInt(e.target.value, 10) || 5})}
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="system" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-yellow-500 [&[data-state=open]]:text-yellow-500">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="text-yellow-500 shrink-0" size={22} />
                    System Controls
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Maintenance Mode</Label>
                  <p className="text-sm text-gray-500">Disable access for non-admin users</p>
                </div>
                <Switch
                  checked={settings.maintenance_mode}
                  onCheckedChange={(val) => setSettings({...settings, maintenance_mode: val})}
                  data-testid="settings-maintenance"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">User Registration</Label>
                  <p className="text-sm text-gray-500">Allow new users to register</p>
                </div>
                <Switch
                  checked={settings.registration_enabled}
                  onCheckedChange={(val) => setSettings({...settings, registration_enabled: val})}
                  data-testid="settings-registration"
                />
              </div>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="mass-order" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyber-purple [&[data-state=open]]:text-cyber-purple">
                  <span className="flex items-center gap-2">
                    <LayoutList className="text-cyber-purple shrink-0" size={22} />
                    Mass Order Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Enable Mass Ordering</Label>
                  <p className="text-sm text-gray-500">Allow users to place mass orders (one service, many links)</p>
                </div>
                <Switch
                  checked={settings.mass_order_enabled !== false}
                  onCheckedChange={(v) => setSettings({ ...settings, mass_order_enabled: v })}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-400">Max links per order</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    className="mt-1 bg-deep-navy border-white/10"
                    value={settings.mass_order_max_links ?? 100}
                    onChange={(e) => setSettings({ ...settings, mass_order_max_links: parseInt(e.target.value, 10) || 100 })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Min drip interval (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    className="mt-1 bg-deep-navy border-white/10"
                    value={settings.mass_order_min_interval ?? 1}
                    onChange={(e) => setSettings({ ...settings, mass_order_min_interval: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Max drip interval (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    className="mt-1 bg-deep-navy border-white/10"
                    value={settings.mass_order_max_interval ?? 1440}
                    onChange={(e) => setSettings({ ...settings, mass_order_max_interval: parseInt(e.target.value, 10) || 1440 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">1440 = 24 hours</p>
                </div>
              </div>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="withdrawal" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-cyber-purple [&[data-state=open]]:text-cyber-purple">
                  <span className="flex items-center gap-2">
                    <ArrowUpFromLine className="text-cyber-purple shrink-0" size={22} />
                    Withdrawal Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Enable Withdrawals</Label>
                  <p className="text-sm text-gray-500">Master toggle for user withdrawal requests</p>
                </div>
                <Switch
                  checked={settings.withdrawal_enabled !== false}
                  onCheckedChange={(v) => setSettings({ ...settings, withdrawal_enabled: v })}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-400">Minimum Amount (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="mt-1 bg-deep-navy border-white/10"
                    value={settings.withdrawal_min_amount ?? 10}
                    onChange={(e) => setSettings({ ...settings, withdrawal_min_amount: parseFloat(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Maximum Amount (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="mt-1 bg-deep-navy border-white/10"
                    value={settings.withdrawal_max_amount ?? 500}
                    onChange={(e) => setSettings({ ...settings, withdrawal_max_amount: parseFloat(e.target.value) || 500 })}
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Minimum Spend Required (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="mt-1 bg-deep-navy border-white/10"
                    value={settings.withdrawal_min_spent ?? 0}
                    onChange={(e) => setSettings({ ...settings, withdrawal_min_spent: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">User must have spent this much before withdrawing</p>
                </div>
              </div>
              <div>
                <Label className="text-white">Fee Structure</Label>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-gray-400">Fixed Fee (USD)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="mt-1 bg-deep-navy border-white/10"
                      value={settings.withdrawal_fee_fixed ?? 0.5}
                      onChange={(e) => setSettings({ ...settings, withdrawal_fee_fixed: parseFloat(e.target.value) || 0.5 })}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Percentage Fee (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className="mt-1 bg-deep-navy border-white/10"
                      value={settings.withdrawal_fee_percentage ?? 2}
                      onChange={(e) => setSettings({ ...settings, withdrawal_fee_percentage: parseFloat(e.target.value) || 2 })}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Fee preview: &quot;$100 withdrawal → ${(settings.withdrawal_fee_fixed ?? 0.5).toFixed(2)} + ${((100 * (settings.withdrawal_fee_percentage ?? 2)) / 100).toFixed(2)} = ${((settings.withdrawal_fee_fixed ?? 0.5) + (100 * (settings.withdrawal_fee_percentage ?? 2)) / 100).toFixed(2)} fee → user gets ${(100 - (settings.withdrawal_fee_fixed ?? 0.5) - (100 * (settings.withdrawal_fee_percentage ?? 2)) / 100).toFixed(2)}&quot;
                </p>
              </div>
              <div>
                <Label className="text-gray-400">Crypto Networks (comma-separated)</Label>
                <Input
                  className="mt-1 bg-deep-navy border-white/10"
                  placeholder="TRC20, ERC20, BEP20"
                  value={Array.isArray(settings.withdrawal_crypto_networks) ? settings.withdrawal_crypto_networks.join(', ') : 'TRC20, ERC20, BEP20'}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const arr = raw.split(',').map((s) => s.trim()).filter(Boolean);
                    setSettings({ ...settings, withdrawal_crypto_networks: arr.length ? arr : ['TRC20', 'ERC20', 'BEP20'] });
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-amber-500/90 mt-4">Save using the &quot;Save Settings&quot; button at the bottom of this page.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="new-order-note" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-electric-blue [&[data-state=open]]:text-electric-blue">
                  <span className="flex items-center gap-2">
                    <LayoutList className="text-electric-blue shrink-0" size={22} />
                    New order — sidebar note
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <p className="text-gray-400 text-sm mb-4">
              Shown on the right side of <strong className="text-white">Dashboard → New Order</strong> (large screens). Leave empty to hide the box.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-400 text-sm">Format</Label>
                <select
                  className="mt-2 w-full max-w-xs bg-deep-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                  value={settings.new_order_sidebar_note_format === 'text' ? 'text' : 'html'}
                  onChange={(e) =>
                    setSettings({ ...settings, new_order_sidebar_note_format: e.target.value === 'text' ? 'text' : 'html' })
                  }
                >
                  <option value="html">HTML (tags, inline styles)</option>
                  <option value="text">Plain text</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Content</Label>
                <p className="text-xs text-gray-500 mb-1">
                  HTML mode renders as trusted panel markup (admins only). Plain text is shown as-is with line breaks preserved.
                </p>
                <textarea
                  value={settings.new_order_sidebar_note || ''}
                  onChange={(e) => setSettings({ ...settings, new_order_sidebar_note: e.target.value })}
                  className="mt-1 w-full min-h-[140px] bg-deep-navy border-white/10 text-xs text-gray-200 rounded-lg p-3 font-mono"
                  placeholder="e.g. &lt;p&gt;Need help? Contact support.&lt;/p&gt; or a short notice…"
                />
              </div>
            </div>
            <p className="text-xs text-amber-500/90 mt-3">Save using &quot;Save Settings&quot; at the bottom of this page.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="meta" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-electric-blue [&[data-state=open]]:text-electric-blue">
                  <span className="flex items-center gap-2">
                    <Globe className="text-electric-blue shrink-0" size={22} />
                    Meta &amp; Verification
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <p className="text-gray-400 text-sm mb-4">
              Manage site-wide verification tags and custom head/footer HTML (Google Search Console, Bing, pixels, chat widgets).
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-gray-400 text-sm">Google Site Verification</Label>
                <Input
                  value={settings.google_site_verification || ''}
                  onChange={(e) => setSettings({ ...settings, google_site_verification: e.target.value })}
                  className="mt-2 bg-deep-navy border-white/10 text-sm font-mono"
                  placeholder="Paste verification code (content value)"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Bing / Microsoft Verification</Label>
                <Input
                  value={settings.bing_site_verification || ''}
                  onChange={(e) => setSettings({ ...settings, bing_site_verification: e.target.value })}
                  className="mt-2 bg-deep-navy border-white/10 text-sm font-mono"
                  placeholder="Paste msvalidate.01 code"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400 text-sm">Custom &lt;head&gt; HTML (all pages)</Label>
                <p className="text-xs text-gray-500 mb-1">
                  Injected into the document &lt;head&gt; on every page. For additional meta tags, analytics, or verification snippets.
                </p>
                <textarea
                  value={settings.custom_head_html || ''}
                  onChange={(e) => setSettings({ ...settings, custom_head_html: e.target.value })}
                  className="mt-1 w-full h-32 bg-deep-navy border-white/10 text-xs text-gray-200 rounded-lg p-3 font-mono"
                  placeholder="&lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot; /&gt;"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Custom footer HTML (all pages)</Label>
                <p className="text-xs text-gray-500 mb-1">
                  Injected near the end of the page. Ideal for chat widgets, tracking pixels, or other scripts.
                </p>
                <textarea
                  value={settings.custom_footer_html || ''}
                  onChange={(e) => setSettings({ ...settings, custom_footer_html: e.target.value })}
                  className="mt-1 w-full h-32 bg-deep-navy border-white/10 text-xs text-gray-200 rounded-lg p-3 font-mono"
                  placeholder="&lt;script&gt;/* your widget / pixel code */&lt;/script&gt;"
                />
              </div>
            </div>
            <p className="text-xs text-amber-500/90 mt-3">
              Always paste trusted code only. Changes take effect after saving settings.
            </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="email" className="border-b border-white/10">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-electric-blue [&[data-state=open]]:text-electric-blue">
                  <span className="flex items-center gap-2">
                    <Mail className="text-electric-blue shrink-0" size={22} />
                    Email Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            <p className="text-sm text-gray-400 mb-4">
              SMTP credentials are saved to the database with <strong className="text-white">Save Settings</strong> at the bottom. Password is never shown again after save — leave password blank to keep the current one. Outbound mail still requires your server or worker to call an email sender using these values.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>SMTP Host</Label>
                <Input
                  value={settings.smtp_host || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  placeholder="smtp.example.com"
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={settings.smtp_port ?? 587}
                  onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value, 10) || 587 })}
                  placeholder="587"
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label>SMTP Username</Label>
                <Input
                  value={settings.smtp_user || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  placeholder="user@example.com"
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label>SMTP Password</Label>
                <Input
                  type="password"
                  value={settings.smtp_password || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  placeholder="Leave blank to keep existing"
                  autoComplete="new-password"
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
            </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="appearance" className="border-b border-white/10 last:border-b-0">
                <AccordionTrigger className="py-4 text-left text-lg font-exo font-bold text-white hover:no-underline hover:text-electric-blue [&[data-state=open]]:text-electric-blue">
                  <span className="flex items-center gap-2">
                    <Globe className="text-electric-blue shrink-0" size={22} />
                    Appearance
                  </span>
                </AccordionTrigger>
                <AccordionContent>
            {isMainAdmin ? (
              <ThemeSwitcher />
            ) : (
              <div className="text-gray-400 text-sm">
                Only Main Admin can change the site theme globally.
              </div>
            )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-cyber-purple text-white font-bold py-6"
            data-testid="settings-save"
          >
            {saving ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
