import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../lib/axios';
import { useReseller } from './ResellerContext';

const RESELLER_TOKEN_KEY = 'reseller_token';

const ResellerAuthContext = createContext(null);

export function useResellerAuth() {
  const ctx = useContext(ResellerAuthContext);
  return ctx || {
    user: null,
    token: null,
    loading: true,
    isAuthenticated: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    refreshUser: () => {},
  };
}

export function ResellerAuthProvider({ children }) {
  const { isReseller, loading: resellerLoading } = useReseller();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(RESELLER_TOKEN_KEY) : null));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!isReseller || !token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/reseller/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data?.user ?? null);
    } catch {
      setUser(null);
      localStorage.removeItem(RESELLER_TOKEN_KEY);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [isReseller, token]);

  useEffect(() => {
    if (!resellerLoading && !isReseller) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    if (!resellerLoading && isReseller) {
      if (!token) {
        setLoading(false);
        return;
      }
      refreshUser();
    }
  }, [resellerLoading, isReseller, token, refreshUser]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/reseller/auth/login', { email, password });
    const t = res.data?.access_token;
    const u = res.data?.user;
    if (t) {
      localStorage.setItem(RESELLER_TOKEN_KEY, t);
      setToken(t);
      setUser(u ?? null);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/reseller/auth/register', { name, email, password });
    const t = res.data?.access_token;
    const u = res.data?.user;
    if (t) {
      localStorage.setItem(RESELLER_TOKEN_KEY, t);
      setToken(t);
      setUser(u ?? null);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(RESELLER_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading: resellerLoading || loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <ResellerAuthContext.Provider value={value}>
      {children}
    </ResellerAuthContext.Provider>
  );
}
