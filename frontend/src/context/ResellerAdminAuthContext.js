import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const RESELLER_ADMIN_TOKEN_KEY = 'reseller_admin_token';
const RESELLER_ADMIN_DATA_KEY = 'reseller_admin_data';

const ResellerAdminAuthContext = createContext(null);

export function useResellerAdminAuth() {
  const ctx = useContext(ResellerAdminAuthContext);
  return ctx || {
    reseller: null,
    token: null,
    loading: true,
    isAuthenticated: false,
    login: async () => {},
    logout: () => {},
  };
}

export function ResellerAdminAuthProvider({ children }) {
  const [reseller, setReseller] = useState(() => {
    try {
      const raw = localStorage.getItem(RESELLER_ADMIN_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(RESELLER_ADMIN_TOKEN_KEY));
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(RESELLER_ADMIN_TOKEN_KEY);
    localStorage.removeItem(RESELLER_ADMIN_DATA_KEY);
    setToken(null);
    setReseller(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const api = (await import('../lib/axios')).default;
    const res = await api.post('/reseller/admin/login', { email, password });
    const t = res.data?.access_token;
    const r = res.data?.reseller;
    if (t) {
      localStorage.setItem(RESELLER_ADMIN_TOKEN_KEY, t);
      localStorage.setItem(RESELLER_ADMIN_DATA_KEY, JSON.stringify(r || {}));
      setToken(t);
      setReseller(r || null);
    }
  }, []);

  const value = {
    reseller,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return (
    <ResellerAdminAuthContext.Provider value={value}>
      {children}
    </ResellerAdminAuthContext.Provider>
  );
}
