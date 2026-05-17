import React, { createContext, useContext, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import api from "./lib/axios";

/* ================================
   BACKEND CONFIG (FIXED PROPERLY)
================================ */

import { API, BACKEND_URL, assetUrl } from "./config";

// Backwards-compatible re-exports.
// Several pages import these constants from `../App`.
export { API, BACKEND_URL, assetUrl };

/* ================================
   PUBLIC PAGES
================================ */

import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import PricingPage from './pages/PricingPage';
import ApiDocsPage from './pages/ApiDocsPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import YouTubeMonetizationDynamicPage from './pages/YouTubeMonetizationDynamicPage';
import ProofDynamicPage from './pages/ProofDynamicPage';
import CustomPageWrapper from './pages/CustomPageWrapper';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import YouTubeMonetizationPage from './pages/YouTubeMonetizationPage';
import SocialProofPage from './pages/SocialProofPage';

/* ================================
   USER DASHBOARD
================================ */

import DashboardPage from './pages/dashboard/DashboardPage';
import NewOrderPage from './pages/dashboard/NewOrderPage';
import OrderHistoryPage from './pages/dashboard/OrderHistoryPage';
import OrderDetailPage from './pages/dashboard/OrderDetailPage';
import NotificationsPage from './pages/dashboard/NotificationsPage';
import AccountsPage from './pages/dashboard/AccountsPage';
import TemplatesPage from './pages/dashboard/TemplatesPage';
import BillingPage from './pages/dashboard/BillingPage';
import RecommendPage from './pages/dashboard/RecommendPage';
import BundlePage from './pages/dashboard/BundlePage';
import AddFundsPage from './pages/dashboard/AddFundsPage';
import WithdrawalPage from './pages/dashboard/WithdrawalPage';
import DepositHistoryPage from './pages/dashboard/DepositHistoryPage';
import ServicePricesPage from './pages/dashboard/ServicePricesPage';
import TicketsPage from './pages/dashboard/TicketsPage';
import ApiAccessPage from './pages/dashboard/ApiAccessPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import InstagramBoostPage from './pages/dashboard/InstagramBoostPage';
import SpinWheelPage from './pages/dashboard/SpinWheelPage';
import ReferralWalletPage from './pages/dashboard/ReferralWalletPage';
import MassOrderPage from './pages/dashboard/MassOrderPage';
import AnalyticsDashboard from './pages/dashboard/AnalyticsDashboard';
import MyReviewsPage from './pages/dashboard/MyReviewsPage';
import ReviewsPage from './pages/ReviewsPage';
import AIOrderAssistant from './pages/dashboard/AIOrderAssistant';
import HealthScore from './pages/dashboard/HealthScore';
import DripCampaign from './pages/dashboard/DripCampaign';
import ResellerSetup from './pages/dashboard/ResellerSetup';
import GamificationPage from './pages/dashboard/GamificationPage';
import CollabMarket from './pages/dashboard/CollabMarket';
import InvoicesPage from './pages/dashboard/InvoicesPage';

/* ================================
   ADMIN PAGES
================================ */

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminServices from './pages/admin/AdminServices';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTickets from './pages/admin/AdminTickets';
import AdminReviews from './pages/admin/AdminReviews';
import AdminSettings from './pages/admin/AdminSettings';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminProviders from './pages/admin/AdminProviders';
import AdminBonuses from './pages/admin/AdminBonuses';
import AdminVipTiers from './pages/admin/AdminVipTiers';
import AdminSpinRewards from './pages/admin/AdminSpinRewards';
import AdminReports from './pages/admin/AdminReports';
import AdminLogs from './pages/admin/AdminLogs';
import AdminBlogList from './pages/admin/BlogList';
import AdminBlogEditor from './pages/admin/BlogEditor';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminPlatforms from './pages/admin/AdminPlatforms';
import CategoryManager from './pages/admin/CategoryManager';
import CategoryManagement from './pages/admin/CategoryManagement';
import AdminAdvanced from './pages/admin/AdminAdvanced';
import AdminPayments from './pages/admin/AdminPayments';
import AdminPages from './pages/admin/AdminPages';
import AdminMenu from './pages/admin/AdminMenu';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSEO from './pages/admin/AdminSEO';
import AdvancedImport from './pages/admin/AdvancedImport';
import AdminBundles from './pages/admin/AdminBundles';
import AdminRefills from './pages/admin/AdminRefills';
import AdminResellers from './pages/admin/AdminResellers';
import AdminLoyalty from './pages/admin/AdminLoyalty';
import AdminPromocodes from './pages/admin/AdminPromocodes';
import AdminUserPricing from './pages/admin/AdminUserPricing';
import SpamUsers from './pages/admin/SpamUsers';
import AdminAiConversations from './pages/admin/AdminAiConversations';
import AdminHealthScores from './pages/admin/AdminHealthScores';
import AdminDripCampaigns from './pages/admin/AdminDripCampaigns';
import AdminResellerPanels from './pages/admin/AdminResellerPanels';
import AdminReorderAlerts from './pages/admin/AdminReorderAlerts';
import AdminGamification from './pages/admin/AdminGamification';
import AdminCollabListings from './pages/admin/AdminCollabListings';
import AdminPlatformInvoices from './pages/admin/AdminPlatformInvoices';
import LoyaltyPage from './pages/dashboard/LoyaltyPage';
import ResellerAdminLogin from './pages/reseller-admin/ResellerAdminLogin';
import ResellerAdminDashboard from './pages/reseller-admin/ResellerAdminDashboard';
import ResellerAdminUsers from './pages/reseller-admin/ResellerAdminUsers';
import ResellerAdminOrders from './pages/reseller-admin/ResellerAdminOrders';
import ResellerAdminPrices from './pages/reseller-admin/ResellerAdminPrices';
import ResellerAdminBrand from './pages/reseller-admin/ResellerAdminBrand';

/* ================================
   COMPONENTS
================================ */

import AuthCallback from './components/AuthCallback';
import ErrorBoundary from './components/ErrorBoundary';
import WhatsAppSupportButton from './components/WhatsAppSupportButton';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { ResellerProvider, useReseller } from './context/ResellerContext';
import { ResellerAuthProvider, useResellerAuth } from './context/ResellerAuthContext';
import { ResellerAdminAuthProvider, useResellerAdminAuth } from './context/ResellerAdminAuthContext';
import { Toaster } from './components/ui/sonner';

/* ================================
   SETTINGS CONTEXT
================================ */

const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  return context || { settings: {}, loading: true };
};

const applyMeta = (meta, baseUrl) => {
  if (!meta) return;
  const ensure = (name, content) => {
    if (!content) return;
    let tag = document.querySelector(`meta[name='${name}']`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };
  ensure('description', meta.description);
  ensure('keywords', meta.keywords);
  if (meta.title) document.title = meta.title;
  let ogImg = document.querySelector("meta[property='og:image']");
  if (!ogImg) {
    ogImg = document.createElement('meta');
    ogImg.setAttribute('property', 'og:image');
    document.head.appendChild(ogImg);
  }
  if (meta.og_image) {
    const href = meta.og_image.startsWith('http') ? meta.og_image : `${baseUrl || ''}${meta.og_image}`;
    ogImg.setAttribute('content', href);
  }
  let ogTitle = document.querySelector("meta[property='og:title']");
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  if (meta.title) ogTitle.setAttribute('content', meta.title);
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("sw_settings_cache");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const raw = localStorage.getItem("sw_settings_cache");
      return !raw;
    } catch {
      return true;
    }
  });
  const location = useLocation();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get("/public/settings", { params: { _: Date.now() } });
      setSettings(response.data);
      try {
        localStorage.setItem("sw_settings_cache", JSON.stringify(response.data || {}));
      } catch {
        // ignore
      }
      return response.data;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings().then((data) => {
      if (!data) return;
      if (data.favicon) {
        const faviconUrl = assetUrl(data.favicon, data.favicon_updated_at);
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      }
    });
  }, [fetchSettings]);

  useLayoutEffect(() => {
    if (!settings) return;
  
    const path = location.pathname || '/';
    const pages = settings.seo_pages || {};

    const pageMeta =
      pages[path] ||
      pages[path.replace(/\/$/, '')] ||
      pages[path + '/'] ||
      {};
  
    const meta =
      pageMeta && (pageMeta.title || pageMeta.description)
        ? { ...settings.seo_meta, ...pageMeta }
        : settings.seo_meta;
  
    if (settings.panel_name && !meta?.title) {
      document.title = settings.panel_name;
    }
  
    applyMeta(meta || { title: settings.panel_name }, baseUrl);

    // Inject verification tags & custom <head> HTML from admin settings
    if (typeof document !== 'undefined') {
      const ensureMeta = (name, content) => {
        if (!content) return;
        let tag = document.querySelector(`meta[name='${name}']`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };

      // Google / Bing verification codes from Admin Settings
      ensureMeta('google-site-verification', settings.google_site_verification);
      ensureMeta('msvalidate.01', settings.bing_site_verification);

      // Custom raw HTML for <head> – remove previous injection then add fresh.
      // We must append nodes directly into <head>, not wrapped in a <span>,
      // otherwise some meta tags may be ignored by crawlers.
      const previousNodes = document.querySelectorAll('[data-swp-custom-head]');
      previousNodes.forEach((node) => node.parentNode && node.parentNode.removeChild(node));

      if (settings.custom_head_html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = settings.custom_head_html;
        Array.from(tmp.childNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            // mark so we can clean up on next route/settings change
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.setAttribute('data-swp-custom-head', '1');
            }
            document.head.appendChild(node);
          }
        });
      }
    }
  }, [settings, location.pathname, baseUrl]);

  const refetchSettings = useCallback(async () => {
    setLoading(true);
    const data = await fetchSettings();
    if (data?.favicon) {
      const faviconUrl = assetUrl(data.favicon, data.favicon_updated_at);
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
    return data;
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

/* ================================
   AUTH CONTEXT
================================ */

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/** Keeps display currency in sync with auth: guests use localStorage; logged-in users use DB preference (default USD). */
function CurrencyUserSync() {
  const { user, loading } = useAuth();
  const { hydrateFromAuth, supportedCurrencies } = useCurrency();
  useEffect(() => {
    hydrateFromAuth(user, loading);
  }, [user, loading, hydrateFromAuth, supportedCurrencies]);
  return null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [suspendedMessage, setSuspendedMessage] = useState(null);

  const checkAuth = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setSuspendedMessage(null);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error || '';
      if (err.response?.status === 403 && detail) {
        setSuspendedMessage(detail);
      } else {
        setSuspendedMessage(null);
      }
      setUser(null);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user) checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // apply meta from public settings
    // this depends on SettingsProvider loading
  }, []);
  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('swp-login'));
  };

  const register = async (name, email, password, username, whatsapp, ref) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
      username,
      whatsapp,
      ...(ref ? { ref: String(ref).trim() } : {}),
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('swp-login'));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('swp-logout'));
    }
  };

  const clearSuspendedMessage = useCallback(() => setSuspendedMessage(null), []);

  const loginWithGoogle = (referralRef) => {
    const apiBase = API?.replace(/\/api\/?$/, '') || '';
    let authUrl = apiBase ? `${apiBase}/api/auth/google` : `${window.location.origin}/api/auth/google`;
    const r = referralRef != null && String(referralRef).trim() ? String(referralRef).trim() : '';
    if (r) {
      authUrl += `${authUrl.includes('?') ? '&' : '?'}ref=${encodeURIComponent(r)}`;
    }
    window.location.href = authUrl;
  };

  const role = user?.role || 'user';
  const permissions = {
    canViewLogs: role === 'main_admin',
    canManageTeam: role === 'main_admin',
    canChangeRoles: role === 'main_admin',
    canViewFinancials: ['main_admin'].includes(role),
    canManageServices: ['main_admin', 'admin'].includes(role),
    canManageUsers: ['main_admin', 'admin'].includes(role),
    canManageBlog: ['main_admin', 'admin'].includes(role),
    canManageSettings: ['main_admin', 'admin'].includes(role),
    canViewReports: ['main_admin', 'admin'].includes(role),
    canViewUsers: ['main_admin', 'admin', 'support'].includes(role),
    canViewOrders: ['main_admin', 'admin', 'support'].includes(role),
    canManageTickets: ['main_admin', 'admin', 'support'].includes(role),
    canAddOrderNotes: ['main_admin', 'admin', 'support'].includes(role),
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithGoogle, isAuthenticated: !!user, token, setToken, setUser, refreshUser: checkAuth, suspendedMessage, clearSuspendedMessage, permissions }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ================================
   PROTECTED ROUTE
================================ */

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isReseller } = useReseller();
  const { user, loading } = useAuth();
  const { user: resellerUser, loading: resellerLoading } = useResellerAuth();
  const location = useLocation();

  const isLoading = isReseller && !adminOnly ? resellerLoading : loading;
  const effectiveUser = adminOnly ? user : (isReseller ? resellerUser : user);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!effectiveUser) return <Navigate to="/login" state={{ from: location }} replace />;

  if (adminOnly && !['admin', 'main_admin', 'support'].includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ResellerAdminProtectedRoute = ({ children }) => {
  const { isReseller } = useReseller();
  const { isAuthenticated } = useResellerAdminAuth();
  const location = useLocation();

  if (!isReseller) return <Navigate to="/" replace />;
  if (!isAuthenticated) return <Navigate to="/reseller-admin/login" state={{ from: location }} replace />;
  return children;
};

/* ================================
   ROUTER
================================ */

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/api-docs" element={<ApiDocsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      {/* Custom landing pages: preferred public URL prefix */}
      <Route path="/smm-panel/:slug" element={<CustomPageWrapper />} />
      {/* Backwards compatibility for older links */}
      <Route path="/pages/:slug" element={<CustomPageWrapper />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/youtube-monetization" element={<YouTubeMonetizationDynamicPage />} />
      <Route path="/proof" element={<ProofDynamicPage />} />
      <Route path="/reviews" element={<SocialProofPage />} />
      <Route path="/testimonials" element={<SocialProofPage />} />
      <Route path="/reviews/:serviceId" element={<ReviewsPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/service-prices" element={<ProtectedRoute><ServicePricesPage /></ProtectedRoute>} />
      <Route path="/dashboard/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
      <Route path="/dashboard/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
      <Route path="/dashboard/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/dashboard/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
      <Route path="/dashboard/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
      <Route path="/dashboard/new-order" element={<ProtectedRoute><NewOrderPage /></ProtectedRoute>} />
      <Route path="/dashboard/mass-order" element={<ProtectedRoute><MassOrderPage /></ProtectedRoute>} />
      <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
      <Route path="/instagram-boost" element={<ProtectedRoute><InstagramBoostPage /></ProtectedRoute>} />
      <Route path="/dashboard/add-funds" element={<ProtectedRoute><AddFundsPage /></ProtectedRoute>} />
      <Route path="/dashboard/withdraw" element={<ProtectedRoute><WithdrawalPage /></ProtectedRoute>} />
      <Route path="/dashboard/deposits" element={<ProtectedRoute><DepositHistoryPage /></ProtectedRoute>} />
      <Route path="/dashboard/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/dashboard/api" element={<ProtectedRoute><ApiAccessPage /></ProtectedRoute>} />
      <Route path="/dashboard/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
      <Route path="/dashboard/recommend" element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />
      <Route path="/dashboard/bundle" element={<ProtectedRoute><BundlePage /></ProtectedRoute>} />
      <Route path="/dashboard/rewards" element={<ProtectedRoute><SpinWheelPage /></ProtectedRoute>} />
      <Route path="/dashboard/spin" element={<ProtectedRoute><SpinWheelPage /></ProtectedRoute>} />
      <Route path="/dashboard/referral" element={<ProtectedRoute><ReferralWalletPage /></ProtectedRoute>} />
      <Route path="/dashboard/loyalty" element={<ProtectedRoute><LoyaltyPage /></ProtectedRoute>} />
      <Route path="/dashboard/my-reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />
      <Route path="/dashboard/ai-assistant" element={<ProtectedRoute><AIOrderAssistant /></ProtectedRoute>} />
      <Route path="/dashboard/health-score" element={<ProtectedRoute><HealthScore /></ProtectedRoute>} />
      <Route path="/dashboard/drip-campaigns" element={<ProtectedRoute><DripCampaign /></ProtectedRoute>} />
      <Route path="/dashboard/reseller-panel" element={<ProtectedRoute><ResellerSetup /></ProtectedRoute>} />
      <Route path="/dashboard/achievements" element={<ProtectedRoute><GamificationPage /></ProtectedRoute>} />
      <Route path="/dashboard/collab-market" element={<ProtectedRoute><CollabMarket /></ProtectedRoute>} />
      <Route path="/dashboard/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/services" element={<ProtectedRoute adminOnly><AdminServices /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/refills" element={<ProtectedRoute adminOnly><AdminRefills /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/spam-users" element={<ProtectedRoute adminOnly><SpamUsers /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute adminOnly><AdminWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/tickets" element={<ProtectedRoute adminOnly><AdminTickets /></ProtectedRoute>} />
      <Route path="/admin/reviews" element={<ProtectedRoute adminOnly><AdminReviews /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/providers" element={<ProtectedRoute adminOnly><AdminProviders /></ProtectedRoute>} />
      <Route path="/admin/import" element={<ProtectedRoute adminOnly><AdvancedImport /></ProtectedRoute>} />
      <Route path="/admin/bonuses" element={<ProtectedRoute adminOnly><AdminBonuses /></ProtectedRoute>} />
      <Route path="/admin/vip-tiers" element={<ProtectedRoute adminOnly><AdminVipTiers /></ProtectedRoute>} />
      <Route path="/admin/spin-rewards" element={<ProtectedRoute adminOnly><AdminSpinRewards /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/payment-history" element={<ProtectedRoute adminOnly><AdminReports paymentHistoryOnly /></ProtectedRoute>} />
      <Route path="/admin/logs" element={<ProtectedRoute adminOnly><AdminLogs /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute adminOnly><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/platforms" element={<ProtectedRoute adminOnly><AdminPlatforms /></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute adminOnly><CategoryManager /></ProtectedRoute>} />
      <Route path="/admin/category-management" element={<ProtectedRoute adminOnly><CategoryManagement /></ProtectedRoute>} />
      <Route path="/admin/advanced" element={<ProtectedRoute adminOnly><AdminAdvanced /></ProtectedRoute>} />
      <Route path="/admin/seo" element={<ProtectedRoute adminOnly><AdminSEO /></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute>} />
      <Route path="/admin/pages" element={<ProtectedRoute adminOnly><AdminPages /></ProtectedRoute>} />
      <Route path="/admin/menu" element={<ProtectedRoute adminOnly><AdminMenu /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute adminOnly><AdminNotifications /></ProtectedRoute>} />
      <Route path="/admin/bundles" element={<ProtectedRoute adminOnly><AdminBundles /></ProtectedRoute>} />
      <Route path="/admin/resellers" element={<ProtectedRoute adminOnly><AdminResellers /></ProtectedRoute>} />
      <Route path="/admin/loyalty" element={<ProtectedRoute adminOnly><AdminLoyalty /></ProtectedRoute>} />
      <Route path="/admin/promocodes" element={<ProtectedRoute adminOnly><AdminPromocodes /></ProtectedRoute>} />
      <Route path="/admin/user-pricing" element={<ProtectedRoute adminOnly><AdminUserPricing /></ProtectedRoute>} />
      <Route path="/admin/blogs" element={<ProtectedRoute adminOnly><AdminBlogList /></ProtectedRoute>} />
      <Route path="/admin/blogs/new" element={<ProtectedRoute adminOnly><AdminBlogEditor /></ProtectedRoute>} />
      <Route path="/admin/blogs/:id/edit" element={<ProtectedRoute adminOnly><AdminBlogEditor /></ProtectedRoute>} />
      <Route path="/admin/ai-conversations" element={<ProtectedRoute adminOnly><AdminAiConversations /></ProtectedRoute>} />
      <Route path="/admin/health-scores" element={<ProtectedRoute adminOnly><AdminHealthScores /></ProtectedRoute>} />
      <Route path="/admin/drip-campaigns" element={<ProtectedRoute adminOnly><AdminDripCampaigns /></ProtectedRoute>} />
      <Route path="/admin/reseller-panels" element={<ProtectedRoute adminOnly><AdminResellerPanels /></ProtectedRoute>} />
      <Route path="/admin/reorder-alerts" element={<ProtectedRoute adminOnly><AdminReorderAlerts /></ProtectedRoute>} />
      <Route path="/admin/gamification" element={<ProtectedRoute adminOnly><AdminGamification /></ProtectedRoute>} />
      <Route path="/admin/collab-listings" element={<ProtectedRoute adminOnly><AdminCollabListings /></ProtectedRoute>} />
      <Route path="/admin/platform-invoices" element={<ProtectedRoute adminOnly><AdminPlatformInvoices /></ProtectedRoute>} />

      <Route path="/reseller-admin/login" element={<ResellerAdminLogin />} />
      <Route path="/reseller-admin/dashboard" element={<ResellerAdminProtectedRoute><ResellerAdminDashboard /></ResellerAdminProtectedRoute>} />
      <Route path="/reseller-admin/users" element={<ResellerAdminProtectedRoute><ResellerAdminUsers /></ResellerAdminProtectedRoute>} />
      <Route path="/reseller-admin/orders" element={<ResellerAdminProtectedRoute><ResellerAdminOrders /></ResellerAdminProtectedRoute>} />
      <Route path="/reseller-admin/prices" element={<ResellerAdminProtectedRoute><ResellerAdminPrices /></ResellerAdminProtectedRoute>} />
      <Route path="/reseller-admin/brand" element={<ResellerAdminProtectedRoute><ResellerAdminBrand /></ResellerAdminProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ================================
   MAIN APP
================================ */

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ResellerProvider>
            <SettingsProvider>
              <AuthProvider>
                <CurrencyProvider>
                  <CurrencyUserSync />
                  <ThemeProvider>
                    <ResellerAuthProvider>
                      <ResellerAdminAuthProvider>
                        <AppRouter />
                        <WhatsAppSupportButton />
                        <Toaster position="top-right" theme="dark" />
                      </ResellerAdminAuthProvider>
                    </ResellerAuthProvider>
                  </ThemeProvider>
                </CurrencyProvider>
              </AuthProvider>
            </SettingsProvider>
          </ResellerProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
