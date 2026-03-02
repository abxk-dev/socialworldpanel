import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";

/* ================================
   BACKEND CONFIG (FIXED PROPERLY)
================================ */

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "https://socialworldpanel-1.onrender.com";

export const API = `${BACKEND_URL}/api`;

/* ================================
   PUBLIC PAGES
================================ */

import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import PricingPage from './pages/PricingPage';
import ApiDocsPage from './pages/ApiDocsPage';
import BlogPage from './pages/BlogPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

/* ================================
   USER DASHBOARD
================================ */

import DashboardPage from './pages/dashboard/DashboardPage';
import NewOrderPage from './pages/dashboard/NewOrderPage';
import OrderHistoryPage from './pages/dashboard/OrderHistoryPage';
import AddFundsPage from './pages/dashboard/AddFundsPage';
import DepositHistoryPage from './pages/dashboard/DepositHistoryPage';
import TicketsPage from './pages/dashboard/TicketsPage';
import ApiAccessPage from './pages/dashboard/ApiAccessPage';
import ProfilePage from './pages/dashboard/ProfilePage';

/* ================================
   ADMIN PAGES
================================ */

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminServices from './pages/admin/AdminServices';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTickets from './pages/admin/AdminTickets';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProviders from './pages/admin/AdminProviders';
import AdminBonuses from './pages/admin/AdminBonuses';
import AdminReports from './pages/admin/AdminReports';
import AdminPlatforms from './pages/admin/AdminPlatforms';

/* ================================
   COMPONENTS
================================ */

import AuthCallback from './components/AuthCallback';

/* ================================
   SETTINGS CONTEXT
================================ */

const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  return context || { settings: {}, loading: true };
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API}/public/settings`);
        setSettings(response.data);

        if (response.data.favicon) {
          const faviconUrl = `${BACKEND_URL}${response.data.favicon}`;
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = faviconUrl;
        }

        if (response.data.panel_name) {
          document.title = response.data.panel_name;
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setUser(response.data);
    } catch {
      setUser(null);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
  };

  const register = async (name, email, password) => {
    const response = await axios.post(`${API}/auth/register`, { name, email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ================================
   PROTECTED ROUTE
================================ */

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

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
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
      <Route path="/dashboard/new-order" element={<ProtectedRoute><NewOrderPage /></ProtectedRoute>} />
      <Route path="/dashboard/add-funds" element={<ProtectedRoute><AddFundsPage /></ProtectedRoute>} />
      <Route path="/dashboard/deposits" element={<ProtectedRoute><DepositHistoryPage /></ProtectedRoute>} />
      <Route path="/dashboard/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/dashboard/api" element={<ProtectedRoute><ApiAccessPage /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/services" element={<ProtectedRoute adminOnly><AdminServices /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ================================
   MAIN APP
================================ */

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
