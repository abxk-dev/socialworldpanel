import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/axios';
import { themes as cssThemes } from '../themes';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'swp_theme';

// Map legacy/localStorage theme keys -> new keys
const normalizeTheme = (value) => {
  if (!value) return 'dark';
  const v = String(value);
  if (v === 'light' || v === 'day') return 'light';
  if (v === 'dark' || v === 'night' || v === 'midnight' || v === 'sunrise' || v === 'sunset' || v === 'ocean') return 'dark';
  return v === 'light' ? 'light' : 'dark';
};

const toDataTheme = (themeName) => {
  return themeName === 'light' ? 'day' : 'night';
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  return (
    ctx || {
      activeTheme: 'dark',
      theme: 'dark',
      setTheme: () => {},
      changeTheme: async () => ({ success: false, error: 'ThemeContext not ready' }),
      /** Admin: updates the site default theme for all visitors / users without a personal preference */
      saveGlobalSiteTheme: async () => ({ success: false, error: 'ThemeContext not ready' }),
      themes: {
        dark: { label: 'Dark Mode', icon: '🌙' },
        light: { label: 'Light Mode', icon: '☀️' },
      },
      loading: false,
      isDark: true,
      isLight: false,
    }
  );
};

export function ThemeProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState('dark');
  const [loading, setLoading] = useState(true);

  const activeThemeRef = useRef(activeTheme);
  /** When true, do not overwrite with global /public/theme polling (user chose a saved preference). */
  const userPreferenceLockedRef = useRef(false);

  useEffect(() => {
    activeThemeRef.current = activeTheme;
  }, [activeTheme]);

  const uiThemes = useMemo(
    () => ({
      dark: { label: 'Dark Mode', icon: '🌙' },
      light: { label: 'Light Mode', icon: '☀️' },
    }),
    []
  );

  const applyTheme = useCallback((themeName) => {
    const normalized = normalizeTheme(themeName);
    const theme = cssThemes[normalized] || cssThemes.dark;
    const root = document.documentElement;

    Object.entries(theme).forEach(([key, value]) => {
      if (key.startsWith('--')) root.style.setProperty(key, String(value));
    });

    root.style.setProperty('--theme-bg', String(theme['--bg-primary']));
    root.style.setProperty('--theme-card', String(theme['--bg-card']));
    root.style.setProperty('--theme-sidebar', String(theme['--sidebar-bg']));
    root.style.setProperty('--theme-text', String(theme['--text-primary']));
    root.style.setProperty('--theme-muted', String(theme['--text-secondary']));
    root.style.setProperty('--theme-border', String(theme['--border']));
    root.style.setProperty('--theme-accent', String(theme['--accent']));
    root.style.setProperty('--theme-accent-alt', String(theme['--accent']));

    root.setAttribute('data-theme', toDataTheme(normalized));

    if (document.body) {
      document.body.style.background = theme['--bg-primary'];
      document.body.style.color = theme['--text-primary'];
    }
  }, []);

  const loadTheme = useCallback(async () => {
    try {
      const cachedRaw = localStorage.getItem(STORAGE_KEY);
      const cached = normalizeTheme(cachedRaw);

      userPreferenceLockedRef.current = false;
      setActiveTheme(cached);
      applyTheme(cached);

      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        try {
          const me = await api.get('/auth/me');
          const pref = me?.data?.theme_preference;
          if (pref && (String(pref).toLowerCase() === 'light' || String(pref).toLowerCase() === 'dark')) {
            const t = normalizeTheme(pref);
            userPreferenceLockedRef.current = true;
            setActiveTheme(t);
            applyTheme(t);
            localStorage.setItem(STORAGE_KEY, t);
            return;
          }
        } catch {
          // fall through to public default
        }
      }

      const res = await api.get('/public/theme').catch(() => null);
      const serverTheme = normalizeTheme(res?.data?.theme);
      setActiveTheme(serverTheme);
      applyTheme(serverTheme);
      localStorage.setItem(STORAGE_KEY, serverTheme);
    } catch {
      setActiveTheme('dark');
      applyTheme('dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // After login/register, reload so saved theme_preference applies.
  useEffect(() => {
    const onLogin = () => loadTheme();
    window.addEventListener('swp-login', onLogin);
    return () => window.removeEventListener('swp-login', onLogin);
  }, [loadTheme]);

  // Same-tab logout does not fire `storage`; sync global theme after sign-out.
  useEffect(() => {
    const onLogout = () => {
      userPreferenceLockedRef.current = false;
      loadTheme();
    };
    window.addEventListener('swp-logout', onLogout);
    return () => window.removeEventListener('swp-logout', onLogout);
  }, [loadTheme]);

  // Poll global default only when the user has no saved personal preference.
  useEffect(() => {
    if (loading) return;
    const id = setInterval(async () => {
      if (userPreferenceLockedRef.current) return;
      try {
        const res = await api.get('/public/theme').catch(() => null);
        const serverTheme = normalizeTheme(res?.data?.theme);
        if (serverTheme !== activeThemeRef.current) {
          setActiveTheme(serverTheme);
          applyTheme(serverTheme);
          localStorage.setItem(STORAGE_KEY, serverTheme);
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => clearInterval(id);
  }, [applyTheme, loading]);

  /** Logged-in user: saves preference + stops global polling overwriting their choice. */
  const changeTheme = useCallback(
    async (themeName) => {
      const normalized = normalizeTheme(themeName);
      setActiveTheme(normalized);
      applyTheme(normalized);
      localStorage.setItem(STORAGE_KEY, normalized);

      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        userPreferenceLockedRef.current = true;
        try {
          await api.put('/user/profile', { theme_preference: normalized });
          return { success: true };
        } catch (err) {
          return {
            success: false,
            error:
              err?.response?.data?.error ||
              err?.response?.data?.detail ||
              err?.message ||
              'Failed to save theme preference',
          };
        }
      }

      if (!token) {
        userPreferenceLockedRef.current = false;
      }
      return { success: true };
    },
    [applyTheme]
  );

  /** Admin Advanced → Site Theme: updates global default for the site (not per-user). */
  const saveGlobalSiteTheme = useCallback(
    async (themeName) => {
      const normalized = normalizeTheme(themeName);
      setActiveTheme(normalized);
      applyTheme(normalized);
      localStorage.setItem(STORAGE_KEY, normalized);

      try {
        await api.put('/admin/settings/theme', { theme: normalized });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err?.response?.data?.error ||
            err?.response?.data?.detail ||
            err?.message ||
            'Failed to update site theme',
        };
      }
    },
    [applyTheme]
  );

  const setTheme = (value) => {
    changeTheme(value);
  };

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        theme: activeTheme,
        setTheme,
        changeTheme,
        saveGlobalSiteTheme,
        loading,
        isDark: activeTheme === 'dark',
        isLight: activeTheme === 'light',
        themes: uiThemes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
