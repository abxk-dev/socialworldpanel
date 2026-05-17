import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/axios';
import {
  CURRENCY_FLAGS,
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
  ZERO_DECIMAL_CURRENCIES,
  DEFAULT_FALLBACK_SUPPORTED,
} from '../lib/currencyDisplay';

const STORAGE_KEY = 'swp_preferred_currency';

const CurrencyContext = createContext(null);

function formatPriceFallback(usd) {
  const n = Number(usd) || 0;
  if (n !== 0 && Math.abs(n) < 0.01) return `$${parseFloat(Number(n).toFixed(6))}`;
  return `$${Number(n).toFixed(2)}`;
}

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  return ctx || {
    currency: 'USD',
    rates: {},
    setCurrency: () => {},
    convertPrice: (usd) => usd,
    formatPrice: formatPriceFallback,
    supportedCurrencies: ['USD'],
    loading: false,
    hydrateFromAuth: () => {},
  };
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'USD';
    } catch {
      return 'USD';
    }
  });
  const [rates, setRates] = useState({});
  const [supportedCurrencies, setSupportedCurrencies] = useState(() => [...DEFAULT_FALLBACK_SUPPORTED]);
  const [loading, setLoading] = useState(true);
  const supportedRef = useRef(supportedCurrencies);
  supportedRef.current = supportedCurrencies;

  const fetchRates = useCallback(async () => {
    try {
      const res = await api.get('/currencies', { params: { _: Date.now() } });
      const data = res.data || {};
      const nextRates = data.exchange_rates && Object.keys(data.exchange_rates).length > 0
        ? data.exchange_rates
        : { USD: 1 };
      setRates(nextRates);
      setSupportedCurrencies((prev) => {
        const next = data.supported_currencies;
        if (Array.isArray(next) && next.length > 0) return next;
        return prev.length ? prev : [...DEFAULT_FALLBACK_SUPPORTED];
      });
      return data;
    } catch (err) {
      console.error('Currency fetch error:', err.message);
      setRates({ USD: 1 });
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  /**
   * Call from a component inside AuthProvider (see App.js).
   * Logged-in: use DB preferred_currency when valid, else USD.
   * Guest: localStorage or USD.
   */
  const hydrateFromAuth = useCallback((user, authLoading) => {
    if (authLoading) return;

    const readStorage = () => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    };

    const list = supportedRef.current;

    if (user) {
      const pref = user.preferred_currency
        ? String(user.preferred_currency).toUpperCase()
        : null;
      if (pref && list.includes(pref)) {
        setCurrencyState(pref);
        try {
          localStorage.setItem(STORAGE_KEY, pref);
        } catch {
          /* ignore */
        }
      } else {
        setCurrencyState('USD');
        try {
          localStorage.setItem(STORAGE_KEY, 'USD');
        } catch {
          /* ignore */
        }
      }
    } else {
      const s = readStorage();
      if (s && list.includes(s)) {
        setCurrencyState(s);
      } else {
        setCurrencyState('USD');
      }
    }
  }, []);

  const convertPrice = useCallback((usdAmount, toCurrency = currency) => {
    const amt = parseFloat(usdAmount) || 0;
    if (toCurrency === 'USD') return amt;
    const rate = rates[toCurrency];
    if (!rate || rate === 0) return amt;
    return amt * rate;
  }, [currency, rates]);

  const formatPrice = useCallback((usdAmount, toCurrency = currency) => {
    const converted = convertPrice(usdAmount, toCurrency);
    const zeroLike =
      ZERO_DECIMAL_CURRENCIES.has(toCurrency) ||
      ['INR', 'PKR', 'BDT', 'NGN'].includes(toCurrency);
    const baseDecimals = zeroLike ? 0 : 2;
    const symbol = CURRENCY_SYMBOLS[toCurrency] || `${toCurrency} `;
    const wouldRoundToZero = baseDecimals === 0
      ? Math.round(converted) === 0
      : Number(Number(converted).toFixed(baseDecimals)) === 0;
    const decimals = (converted !== 0 && wouldRoundToZero) ? 6 : baseDecimals;
    const fixed = Number(converted).toFixed(decimals);
    const display = decimals > 0 ? parseFloat(fixed) : Math.round(converted);
    return `${symbol}${display}`;
  }, [currency, convertPrice]);

  const setCurrency = useCallback(async (newCurrency) => {
    const code = String(newCurrency || '').toUpperCase();
    if (!supportedRef.current.includes(code)) return;
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
    try {
      await api.patch('/user/currency', { currency: code }, { withCredentials: true });
    } catch {
      /* guest or session — local preference still applies */
    }
  }, []);

  const value = {
    currency,
    rates,
    setCurrency,
    convertPrice,
    formatPrice,
    supportedCurrencies,
    loading,
    CURRENCY_FLAGS,
    CURRENCY_NAMES,
    refetchRates: fetchRates,
    hydrateFromAuth,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export default CurrencyContext;
