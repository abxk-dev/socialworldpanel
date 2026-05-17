import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';

const ResellerContext = createContext(null);

export function useReseller() {
  const ctx = useContext(ResellerContext);
  return ctx || { config: null, loading: true, isReseller: false };
}

export function ResellerProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reseller/config')
      .then((res) => {
        const raw = res.data || {};
        const cfg = raw?.config || {};
        const data = {
          ...raw,
          isReseller: raw?.isReseller === true || cfg?.enabled === true,
          brand: raw?.brand || cfg || {},
          panel_name: raw?.panel_name || cfg?.panel_name || cfg?.brand_name || 'Reseller Panel',
        };
        setConfig(data);
        if (data.isReseller && data.brand) {
          const b = data.brand;
          const root = document.documentElement;
          if (b.accent_color) root.style.setProperty('--accent', b.accent_color);
          if (b.accent_color_2) root.style.setProperty('--accent-2', b.accent_color_2);
          if (data.panel_name || b.panel_name) document.title = b.panel_name || data.panel_name || 'SMM Panel';
          if (b.favicon_url) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = b.favicon_url;
          }
          if (b.custom_css) {
            let style = document.getElementById('reseller-custom-css');
            if (!style) {
              style = document.createElement('style');
              style.id = 'reseller-custom-css';
              document.head.appendChild(style);
            }
            style.textContent = b.custom_css;
          }
        }
      })
      .catch(() => setConfig({ isReseller: false }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ResellerContext.Provider value={{ config, loading, isReseller: config?.isReseller === true }}>
      {!loading && children}
    </ResellerContext.Provider>
  );
}
