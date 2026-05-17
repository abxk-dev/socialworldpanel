import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, History, CreditCard, 
  Wallet, MessageSquare, Code, User, LogOut, Settings,
  Menu, X, ChevronRight, ChevronDown, Instagram, Bell, Users, FileText, Receipt, Package, DollarSign, Gift, UserPlus, Crown, Award, LayoutList, BarChart2, Star, Sparkles, ArrowUpFromLine,
  Bot, HeartPulse, Timer, Trophy, Handshake, Store, Shield,
} from 'lucide-react';
import { useSettings } from '../../App';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useReseller } from '../../context/ResellerContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import ErrorBoundary from '../ErrorBoundary';
import LiveOrderFeed from '../LiveOrderFeed';
import WhatsAppSupportBanner from '../WhatsAppSupportBanner';

import { assetUrl } from '../../config';
import { useCurrency } from '../../context/CurrencyContext';
import { useFormatRate } from '../../hooks/useFormatRate';
import CurrencySelector from '../CurrencySelector';
import ThemeSelector from '../ThemeSelector';
import api from '../../lib/axios';
import { useTheme } from '../../context/ThemeContext';

const DASHBOARD_ICON_MAP = {
  LayoutDashboard, ShoppingCart, History, CreditCard, Wallet, MessageSquare, Code, User, Settings,
  Menu, Instagram, Bell, Users, FileText, Receipt, Package, DollarSign, Gift, UserPlus, Crown, Award,
  LayoutList, BarChart2, Star, Sparkles, ArrowUpFromLine, Bot, HeartPulse, Timer, Trophy, Handshake, Store, Shield,
};

const ADMIN_SIDEBAR_ROLES = new Set(['admin', 'main_admin']);

function adminMenuClasses(adminStyle, active) {
  if (adminStyle === 'main') {
    return active
      ? 'bg-amber-500/15 text-amber-200 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
      : 'text-amber-100/90 border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/15 hover:border-amber-400/35';
  }
  return active
    ? 'bg-violet-500/15 text-violet-100 border border-violet-400/35'
    : 'text-violet-100/90 border border-violet-500/25 bg-gradient-to-r from-violet-600/15 to-transparent hover:from-violet-600/22 hover:border-violet-400/40';
}

const DashboardLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  // Mobile sidebar accordion (used in small screens menu)
  const [expandedSidebarKey, setExpandedSidebarKey] = React.useState(null);
  const [canSpin, setCanSpin] = React.useState(false);
  const [vipTiers, setVipTiers] = React.useState([]);
  const { user, logout, token } = useDashboardAuth();
  const { isReseller } = useReseller();
  const { settings } = useSettings();
  const { formatPrice, setCurrency, currency } = useCurrency();
  const { formatPriceWithRateDecimals } = useFormatRate();
  const location = useLocation();
  const { isLight } = useTheme();
  const [logoError, setLogoError] = React.useState(false);
  const [faviconError, setFaviconError] = React.useState(false);
  const [ticketCount, setTicketCount] = React.useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = React.useState(0);
  const [hasAdminBackup, setHasAdminBackup] = React.useState(false);
  const [openMenus, setOpenMenus] = React.useState({
    newOrder: false,
    aiRecommender: false,
    dailySpin: false,
    addFunds: false,
    myAccounts: false,
    community: false,
  });
  const [gamificationLevel, setGamificationLevel] = React.useState(null);

  React.useEffect(() => {
    if (user?.preferred_currency && user.preferred_currency !== currency) {
      setCurrency(user.preferred_currency);
    }
  }, [user?.preferred_currency]);

  React.useEffect(() => {
    if (isReseller || !user || !token) return;
    api.get('/spin/status', { withCredentials: true })
      .then((res) => { if (res.data?.can_spin === true) setCanSpin(true); })
      .catch(() => {});
  }, [isReseller, user, token]);

  React.useEffect(() => {
    if (isReseller) return;
    api.get('/public/vip-tiers', { withCredentials: true })
      .then((res) => {
        const data = res?.data
        setVipTiers(Array.isArray(data) ? data : (Array.isArray(data?.vip_tiers) ? data.vip_tiers : []))
      })
      .catch(() => setVipTiers([]));
  }, [isReseller]);

  React.useEffect(() => {
    if (isReseller || !token) return;
    api.get('/tickets?count_only=1', { withCredentials: true })
      .then((res) => setTicketCount(Number(res.data?.count) || 0))
      .catch(() => setTicketCount(0));
  }, [isReseller, token]);

  React.useEffect(() => {
    if (isReseller || !token) return;
    api.get('/reviews/eligible', { withCredentials: true })
      .then((res) => setPendingReviewsCount((res.data?.eligible || []).length))
      .catch(() => setPendingReviewsCount(0));
  }, [isReseller, token]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const backup = localStorage.getItem('admin_backup_token');
      setHasAdminBackup(!!backup);
    } catch {
      setHasAdminBackup(false);
    }
  }, []);

  React.useEffect(() => {
    if (isReseller || !token) return;
    api
      .get('/gamification/profile')
      .then((res) => setGamificationLevel(res.data?.level ?? null))
      .catch(() => setGamificationLevel(null));
  }, [isReseller, token]);

  const totalSpent = user?.total_spent ?? 0;
  const currentVipTier = React.useMemo(() => {
    const sorted = [...(vipTiers || [])].sort((a, b) => (b.min_total_spend ?? 0) - (a.min_total_spend ?? 0));
    return sorted.find((t) => totalSpent >= (t.min_total_spend ?? 0)) || null;
  }, [vipTiers, totalSpent]);

  const igBoostEnabled = !isReseller && settings.instagram_boost_enabled !== false;
  const referralEnabled = !isReseller && settings.referral_system_enabled !== false;
  const massOrderEnabled = !isReseller && settings.mass_order_enabled !== false;

  const isActive = (path) => location.pathname === path;

  // Auto-open parents based on current route
  React.useEffect(() => {
    const path = location.pathname;
    setOpenMenus({
      newOrder: ['/mass-order', '/bundle', '/instagram-boost', '/new-order', '/drip-campaigns'].some((r) => path.includes(r)),
      aiRecommender: ['/analytics', '/my-reviews', '/recommend', '/ai-assistant', '/health-score'].some((r) => path.includes(r)),
      dailySpin: ['/rewards', '/loyalty', '/referral', '/achievements'].some((r) => path.includes(r)),
      addFunds: ['/billing', '/withdraw', '/add-funds', '/invoices'].some((r) => path.includes(r)),
      myAccounts: ['/templates', '/accounts', '/reseller-panel'].some((r) => path.includes(r)),
      community: ['/collab-market'].some((r) => path.includes(r)),
    });
  }, [location.pathname]);

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const baseMenuItems = React.useMemo(() => {
    // New grouped menu for normal users
    const items = [
      {
        key: 'dashboard',
        type: 'single',
        label: 'Dashboard',
        icon: LayoutDashboard,
        route: '/dashboard',
      },
      {
        key: 'newOrder',
        type: 'parent',
        label: 'New Order',
        icon: ShoppingCart,
        children: [
          {
            label: 'New Order',
            icon: ShoppingCart,
            // keep existing route for main new order page
            route: '/dashboard/new-order',
            isParentLink: true,
          },
          ...(massOrderEnabled ? [{ label: 'Mass Order', icon: LayoutList, route: '/dashboard/mass-order' }] : []),
          { label: 'Build Bundle', icon: Package, route: '/dashboard/bundle' },
          { label: 'Drip Campaigns', icon: Timer, route: '/dashboard/drip-campaigns' },
          ...(igBoostEnabled ? [{ label: 'Instagram Boost', icon: Instagram, route: '/instagram-boost' }] : []),
        ],
      },
      {
        key: 'aiRecommender',
        type: 'parent',
        label: 'AI Recommender',
        icon: Sparkles,
        children: [
          {
            label: 'AI Recommender',
            icon: Sparkles,
            // existing route for AI recommender page
            route: '/dashboard/recommend',
            isParentLink: true,
          },
          { label: 'Analytics', icon: BarChart2, route: '/dashboard/analytics' },
          { label: 'My Reviews', icon: Star, route: '/dashboard/my-reviews' },
          { label: 'AI Order Assistant', icon: Bot, route: '/dashboard/ai-assistant' },
          { label: 'Health Score', icon: HeartPulse, route: '/dashboard/health-score' },
        ],
      },
      {
        key: 'orderHistory',
        type: 'single',
        label: 'Order History',
        icon: History,
        route: '/dashboard/orders',
      },
      {
        key: 'dailySpin',
        type: 'parent',
        label: 'Daily Spin',
        icon: Gift,
        children: [
          {
            label: 'Daily Spin',
            icon: Gift,
            route: '/dashboard/spin',
            isParentLink: true,
          },
          { label: 'Rewards', icon: Award, route: '/dashboard/loyalty' },
          ...(referralEnabled
            ? [{ label: 'Referral Wallet', icon: UserPlus, route: '/dashboard/referral' }]
            : []),
          { label: 'Achievements', icon: Trophy, route: '/dashboard/achievements' },
        ],
      },
      {
        key: 'community',
        type: 'parent',
        label: 'Community',
        icon: Handshake,
        children: [
          { label: 'Collab Market', icon: Handshake, route: '/dashboard/collab-market', isParentLink: true },
        ],
      },
      {
        key: 'addFunds',
        type: 'parent',
        label: 'Add Funds',
        icon: CreditCard,
        children: [
          { label: 'Add Funds', icon: CreditCard, route: '/dashboard/add-funds', isParentLink: true },
          { label: 'Invoices', icon: Receipt, route: '/dashboard/invoices' },
        ],
      },
      {
        key: 'myAccounts',
        type: 'parent',
        label: 'My Accounts',
        icon: Users,
        children: [
          {
            label: 'My Accounts',
            icon: Users,
            route: '/dashboard/accounts',
            isParentLink: true,
          },
          { label: 'Templates', icon: FileText, route: '/dashboard/templates' },
          { label: 'Reseller Panel', icon: Store, route: '/dashboard/reseller-panel' },
        ],
      },
      { type: 'divider' },
      {
        key: 'servicePrices',
        type: 'single',
        label: 'Service Prices',
        icon: DollarSign,
        route: '/dashboard/service-prices',
      },
      {
        key: 'notifications',
        type: 'single',
        label: 'Notifications',
        icon: Bell,
        route: '/dashboard/notifications',
      },
      {
        key: 'support',
        type: 'single',
        label: 'Support',
        icon: MessageSquare,
        route: '/dashboard/tickets',
      },
      {
        key: 'api',
        type: 'single',
        label: 'API Access',
        icon: Code,
        route: '/dashboard/api',
      },
      { type: 'divider' },
      {
        key: 'profile',
        type: 'single',
        label: 'Profile',
        icon: User,
        route: '/dashboard/profile',
      },
      {
        key: 'admin',
        type: 'single',
        label: user?.role === 'main_admin' ? 'Main Admin' : 'Admin Panel',
        icon: user?.role === 'main_admin' ? Crown : Shield,
        route: '/admin',
        showIf: ADMIN_SIDEBAR_ROLES.has(user?.role),
        adminStyle: user?.role === 'main_admin' ? 'main' : 'staff',
      },
    ];
    return items;
  }, [user?.role, massOrderEnabled, igBoostEnabled, referralEnabled]);

  const handleBackToAdmin = () => {
    if (typeof window === 'undefined') return;
    try {
      const backup = localStorage.getItem('admin_backup_token');
      if (!backup) return;
      localStorage.setItem('token', backup);
      localStorage.removeItem('admin_backup_token');
      window.location.href = '/admin';
    } catch {
      // ignore
    }
  };

  const bottomNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', path: '/dashboard/orders', icon: History },
    { name: 'Add Funds', path: '/dashboard/add-funds', icon: CreditCard },
    { name: 'Profile', path: '/dashboard/profile', icon: User },
    { name: 'More', path: '/dashboard', icon: Menu },
  ];

  const resolvedLogo =
    isLight && settings?.panel_logo_light ? settings.panel_logo_light : settings?.panel_logo;
  const resolvedLogoUpdatedAt =
    isLight && settings?.panel_logo_light ? settings?.panel_logo_light_updated_at : settings?.panel_logo_updated_at;

  React.useEffect(() => {
    setLogoError(false);
  }, [resolvedLogo]);

  return (
    <div className="user-dashboard-root flex h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sidebar - Desktop: fixed height; nav scrolls inside ScrollArea only */}
      <aside
        className="dashboard-sidebar-hidden-mobile hidden lg:flex flex-col w-64 shrink-0 h-full min-h-0 overflow-hidden border-r border-[var(--sidebar-border)] theme-sidebar bg-[var(--sidebar-bg)]"
      >
        {/* Logo */}
        <div className="p-4 border-b border-[var(--sidebar-border)]">
          <Link to="/" className="flex items-center gap-2">
            {resolvedLogo && !logoError ? (
              <img 
                src={assetUrl(resolvedLogo, resolvedLogoUpdatedAt)} 
                alt="Logo" 
                className="h-10 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            ) : settings.favicon && !faviconError ? (
              <>
                <img
                  src={assetUrl(settings.favicon, settings.favicon_updated_at)}
                  alt=""
                  className="h-10 w-10 rounded-lg object-contain"
                  onError={() => setFaviconError(true)}
                />
                <span className="text-[var(--text-primary)] font-exo font-bold">
                  {settings.panel_name || 'Social'}<span className="text-electric-blue">Panel</span>
                </span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                  <span className="text-white font-exo font-black text-lg">SW</span>
                </div>
                <span className="text-[var(--text-primary)] font-exo font-bold">
                  {settings.panel_name || 'Social'}<span className="text-electric-blue">Panel</span>
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Balance Card */}
        <div className="p-3">
          <div className="gradient-border p-3">
              <div className="text-[var(--text-muted)] text-xs">Balance</div>
            <div className="text-xl font-exo font-bold text-electric-blue">
              {formatPriceWithRateDecimals(user?.balance ?? 0, undefined, { forBalance: true })}
            </div>
            <Button
              asChild
              className="w-full mt-2 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30 text-xs py-1.5 font-semibold cursor-pointer"
              size="sm"
            >
              <Link to="/dashboard/add-funds" data-testid="sidebar-add-funds">
                Add Funds
              </Link>
            </Button>
            {!isReseller && vipTiers.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-[var(--text-muted)]">
                  VIP: <span className="text-amber-400 font-medium">{currentVipTier ? `${currentVipTier.name} (${currentVipTier.discount_percent ?? 0}% off)` : 'None'}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0 px-3">
          <nav className="space-y-1">
            {/* MAIN section */}
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] px-4 pt-2 pb-1" style={{ color: 'var(--sidebar-section)' }}>
              Main
            </div>
            {baseMenuItems.map((item) => {
              if (item.type === 'divider') {
                return <div key={item.key || Math.random()} className="h-px mx-4 my-2 bg-white/5" />;
              }
              if (item.showIf === false) return null;
              if (item.showIf !== undefined && !item.showIf) return null;

              if (item.type === 'single') {
                const active = isActive(item.route);
                const isAdminEntry = item.key === 'admin' && item.adminStyle;
                return (
                  <Link
                    key={item.key}
                    to={item.route}
                    data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`relative flex items-center gap-3 px-4 py-2.5 mx-2 rounded-[10px] text-sm font-medium transition-all ${
                      isAdminEntry
                        ? adminMenuClasses(item.adminStyle, active)
                        : active
                          ? 'bg-[rgba(0,210,255,0.10)] text-[#00d2ff] border border-[rgba(0,210,255,0.20)]'
                          : 'text-slate-500 hover:text-slate-100 hover:bg-[rgba(0,210,255,0.05)]'
                    }`}
                  >
                    {active && !isAdminEntry && (
                      <span className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-[#00d2ff] rounded-r-sm" />
                    )}
                    {active && isAdminEntry && (
                      <span
                        className={`absolute left-0 top-[20%] h-[60%] w-[3px] rounded-r-sm ${
                          item.adminStyle === 'main' ? 'bg-amber-400' : 'bg-violet-400'
                        }`}
                      />
                    )}
                    <item.icon size={18} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.key === 'support' && ticketCount > 0 && (
                      <span className="ml-auto min-w-[20px] px-1.5 h-5 rounded-full bg-[#00d2ff] text-[#060b14] text-[10px] font-extrabold flex items-center justify-center">
                        {ticketCount > 99 ? '99+' : ticketCount}
                      </span>
                    )}
                    {item.key === 'dailySpin' && canSpin && (
                      <span className="w-2 h-2 rounded-full bg-neon-green shrink-0" />
                    )}
                    {item.key === 'notifications' && pendingReviewsCount > 0 && (
                      <span className="ml-auto min-w-[20px] px-1.5 h-5 rounded-full bg-neon-green text-[#060b14] text-[10px] font-extrabold flex items-center justify-center">
                        {pendingReviewsCount > 99 ? '99+' : pendingReviewsCount}
                      </span>
                    )}
                  </Link>
                );
              }

              if (item.type === 'parent') {
                const isOpen = openMenus[item.key];
                const activeChild = (item.children || []).some((c) => isActive(c.route));
                const parentActive = activeChild;
                return (
                  <div key={item.key}>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.key)}
                      className={`relative flex items-center gap-3 px-4 py-2.5 mx-2 rounded-[10px] text-sm font-medium w-full text-left transition-colors duration-200 ${
                        parentActive
                          ? 'bg-[rgba(0,210,255,0.10)] text-[#00d2ff] border border-[rgba(0,210,255,0.20)]'
                          : 'text-slate-500 hover:text-slate-100 hover:bg-[rgba(0,210,255,0.05)]'
                      }`}
                    >
                      {parentActive && (
                        <span className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-[#00d2ff] rounded-r-sm" />
                      )}
                      <item.icon size={18} className="shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight
                        size={14}
                        className={`ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </button>
                    <div
                      className={`relative ml-2 mr-2 mt-1 sub-menu ${
                        isOpen ? 'open max-h-[300px]' : 'max-h-0'
                      } overflow-hidden transition-[max-height] duration-250 ease-out`}
                    >
                      <div className="relative pt-1 pb-2">
                        <span className="pointer-events-none absolute left-[27px] top-0 bottom-2 w-px bg-[rgba(0,210,255,0.12)]" />
                        {(item.children || []).map((child, index) => {
                          const active = isActive(child.route);
                          const IconComp = child.icon;
                          const isParentLink = child.isParentLink;
                          return (
                            <Link
                              key={child.route}
                              to={child.route}
                              onClick={(e) => e.stopPropagation()}
                              className={[
                                'relative flex items-center gap-2 pl-11 pr-4 w-full rounded-[8px] text-[13px] transition-all',
                                // Keep the parent-link child visually consistent with other children
                                // (it was missing `py-*`, making the vertical spacing look off).
                                isParentLink ? 'py-2 pb-2 border-b border-white/5' : 'py-2',
                                active
                                  ? 'text-[#00d2ff] bg-[rgba(0,210,255,0.06)] font-semibold'
                                  : isParentLink
                                  ? 'text-slate-300 font-semibold hover:text-slate-100 hover:bg-white/5'
                                  : 'text-slate-500 hover:text-slate-100 hover:bg-white/5',
                              ].join(' ')}
                            >
                              {active && (
                                <span className="absolute left-[28px] w-[6px] h-[6px] rounded-full bg-[#00d2ff]" />
                              )}
                              {IconComp && <IconComp size={16} className="shrink-0" />}
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </nav>
        </ScrollArea>

        {/* Admin / Back-to-admin links */}
        {(ADMIN_SIDEBAR_ROLES.has(user?.role) || hasAdminBackup) && (
          <div className="p-4 border-t border-white/5 space-y-2">
            {ADMIN_SIDEBAR_ROLES.has(user?.role) && (
              <Link to="/admin">
                <Button
                  variant="outline"
                  className={`w-full font-semibold ${
                    user?.role === 'main_admin'
                      ? 'border-amber-400/50 text-amber-200 hover:bg-amber-500/15 bg-gradient-to-r from-amber-500/10 to-transparent'
                      : 'border-violet-500/45 text-violet-100 hover:bg-violet-600/15 bg-gradient-to-r from-violet-600/12 to-transparent'
                  }`}
                >
                  {user?.role === 'main_admin' ? (
                    <Crown size={16} className="mr-2 shrink-0 text-amber-400" />
                  ) : (
                    <Shield size={16} className="mr-2 shrink-0 text-violet-400" />
                  )}
                  {user?.role === 'main_admin' ? 'Main Admin' : 'Admin Panel'}
                </Button>
              </Link>
            )}
            {hasAdminBackup && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-400/40 text-amber-300 hover:bg-amber-400/10 text-xs"
                onClick={handleBackToAdmin}
              >
                <Settings size={14} className="mr-2" />
                Back to Admin Session
              </Button>
            )}
          </div>
        )}

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <User size={20} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-medium truncate">{user?.name}</span>
                {!isReseller && gamificationLevel != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                    L{gamificationLevel}
                  </span>
                )}
                {!isReseller && user?.loyalty_tier && user.loyalty_tier !== 'bronze' && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium capitalize"
                    style={{
                      backgroundColor: `${(({ silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' })[user.loyalty_tier] || '#cd7f32')}40`,
                      color: ({ silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' })[user.loyalty_tier] || '#cd7f32',
                    }}
                  >
                    {user.loyalty_tier === 'gold' && '🥇 '}{user.loyalty_tier === 'platinum' && '💎 '}{user.loyalty_tier === 'silver' && '🥈 '}{user.loyalty_tier}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full text-gray-400 hover:text-red-400 hover:bg-red-400/10"
            data-testid="sidebar-logout"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar — z above bottom nav (1000) so Logout and footer actions stay tappable */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[1100]">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--modal-overlay)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 max-w-[85vw] flex flex-col border-r border-[var(--sidebar-border)] theme-sidebar bg-[var(--sidebar-bg)] shadow-2xl">
            <div className="shrink-0 p-4 flex justify-between items-center border-b border-[var(--sidebar-border)]">
              <Link to="/" className="flex items-center gap-2">
                {settings.favicon && !faviconError ? (
                  <img
                    src={assetUrl(settings.favicon, settings.favicon_updated_at)}
                    alt=""
                    className="w-8 h-8 rounded-lg object-contain bg-white/5"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                    <span className="text-white font-exo font-bold text-sm">SW</span>
                  </div>
                )}
              </Link>
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-[var(--text-muted)] p-1" aria-label="Close menu">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] [-webkit-overflow-scrolling:touch]">
              <div className="gradient-border p-3 mb-4">
                <div className="text-xs text-[var(--text-muted)]">Balance</div>
                <div className="text-xl font-exo font-bold text-electric-blue">{formatPriceWithRateDecimals(user?.balance ?? 0, undefined, { forBalance: true })}</div>
                <Button
                  asChild
                  className="w-full mt-2 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30 text-xs py-1.5 font-semibold cursor-pointer"
                  size="sm"
                >
                  <Link to="/dashboard/add-funds" data-testid="sidebar-add-funds-mobile" onClick={() => setSidebarOpen(false)}>
                    Add Funds
                  </Link>
                </Button>
                {vipTiers.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-[var(--text-muted)]">
                      VIP: <span className="text-amber-400 font-medium">{currentVipTier ? `${currentVipTier.name} (${currentVipTier.discount_percent ?? 0}% off)` : 'None'}</span>
                    </span>
                  </div>
                )}
              </div>
              <nav className="space-y-1">
                {baseMenuItems.map((item, idx) => {
                  if (item.type === 'divider') {
                    return <div key={`divider-${idx}`} className="my-2 h-px bg-[var(--border)]" />;
                  }
                  if (item.showIf === false) return null;
                  if (item.showIf !== undefined && !item.showIf) return null;

                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  const route = item.route || item.path || '';
                  const label = item.label || item.name || '';
                  const IconComp = item.icon;
                  const key = `${item.key || route || label}-${idx}`;
                  const isExpanded = expandedSidebarKey === key;
                  if (hasChildren) {
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => setExpandedSidebarKey((k) => (k === key ? null : key))}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full text-left ${
                            item.children.some((c) => isActive(c.route || c.path)) ? 'bg-electric-blue/10 text-electric-blue' : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {IconComp ? <IconComp size={18} /> : null}
                          <span className="flex-1">{label}</span>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {isExpanded && (
                          <div className="pl-3 space-y-0.5">
                            {item.children.map((child) => (
                              <Link
                                key={child.route || child.path}
                                to={child.route || child.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`block px-3 py-2 rounded-lg text-sm ${isActive(child.route || child.path) ? 'bg-electric-blue/10 text-electric-blue' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                              >
                                {child.label || child.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const isAdminEntry = item.key === 'admin' && item.adminStyle;
                  return (
                    <Link
                      key={key}
                      to={route}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        isAdminEntry
                          ? adminMenuClasses(item.adminStyle, isActive(route))
                          : isActive(route)
                            ? 'bg-electric-blue/10 text-electric-blue'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {IconComp ? <IconComp size={18} /> : null}
                      <span>{label}</span>
                      {route === '/dashboard/tickets' && ticketCount > 0 && (
                        <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-electric-blue text-black text-xs font-bold flex items-center justify-center">
                          {ticketCount > 99 ? '99+' : ticketCount}
                        </span>
                      )}
                      {route === '/dashboard/my-reviews' && pendingReviewsCount > 0 && (
                        <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-neon-green text-black text-xs font-bold flex items-center justify-center">
                          {pendingReviewsCount > 99 ? '99+' : pendingReviewsCount}
                        </span>
                      )}
                      {(route === '/dashboard/spin' || route === '/dashboard/rewards') && canSpin && (
                        <span className="w-2 h-2 rounded-full bg-neon-green shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </nav>
              <Button
                variant="ghost"
                onClick={() => { logout(); setSidebarOpen(false); }}
                className="w-full mt-4 text-gray-400 hover:text-red-400"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-content-with-bottom-nav flex-1 flex flex-col min-h-0 h-full min-w-0 overflow-hidden bg-[var(--bg-secondary)]">
        {/* Top Bar */}
            <header
              className="sticky top-0 z-40 flex-shrink-0 glass border-b border-[var(--navbar-border)] px-3 sm:px-4 py-2.5 sm:py-3 backdrop-blur-xl bg-[var(--navbar-bg)]"
            >
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <button
                className="lg:hidden shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 -m-1"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-sidebar-toggle"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-exo font-bold text-[var(--text-primary)] truncate">{title}</h1>
                <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <Link to="/dashboard" className="hover:text-electric-blue">Dashboard</Link>
                  {title !== 'Dashboard' && (
                    <>
                      <ChevronRight size={14} />
                      <span className="text-[var(--text-muted)]">{title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeSelector />
              <CurrencySelector />
              <Link to="/dashboard/new-order">
                <Button className="hidden sm:flex bg-electric-blue hover:bg-electric-blue/90 text-black text-sm py-1.5 h-8" data-testid="header-new-order">
                  <ShoppingCart size={14} className="mr-1.5" />
                  New Order
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content - flex column so banner and page content never overlap */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="flex-1 p-3 sm:p-4 overflow-auto min-w-0 flex flex-col gap-4">
            {location.pathname !== '/dashboard/new-order' && (
              <div className="flex-shrink-0">
                <WhatsAppSupportBanner />
              </div>
            )}
            <div className="flex-shrink-0">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <nav
        className="bottom-nav-bar items-center justify-around theme-bg border-t border-[var(--navbar-border)] bg-[var(--navbar-bg)]"
        aria-label="Dashboard navigation"
      >
        {bottomNavItems.map((item) =>
              item.name === 'More' ? (
            <button
              key="more"
              type="button"
              onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-[44px] min-w-[44px] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Open menu"
            >
              <item.icon size={22} aria-hidden />
              <span>{item.name}</span>
            </button>
          ) : (
            <Link
              key={item.path + item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-[44px] min-w-[44px] text-xs transition-colors ${
                isActive(item.path) ? 'text-electric-blue' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <item.icon size={22} aria-hidden />
              <span>{item.name}</span>
            </Link>
          )
        )}
      </nav>

      {/* Live order toast for logged-in users */}
      <LiveOrderFeed mode="toast" />
    </div>
  );
};

export default DashboardLayout;
