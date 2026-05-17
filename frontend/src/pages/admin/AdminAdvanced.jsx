import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { API } from '../../config';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { Info } from 'lucide-react';
import Toggle from '../../components/ui/Toggle';

const reqOpts = (headers) => ({ headers, withCredentials: true });

const defaultDisplaySettings = {
  currency_format: '1000.00',
  balance_format: 'default',
  rates_rounding: 'hundredth',
  new_order_search_field: 'enabled',
  service_name_format: 'ID - Name - Rate per 1000',
};

const AdminAdvanced = () => {
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [theme, setTheme] = useState({ enabled: false, primary: '#00e0ff', mode: 'dark', cursor: 'default' });
  const [stats, setStats] = useState({
    base_orders: 0,
    base_users: 0,
    base_services: 0,
    base_orders_today: 0,
    auto_increment: false,
    increment_min: 1,
    increment_max: 5,
    increment_interval: 5
  });
  const [displaySettings, setDisplaySettings] = useState(defaultDisplaySettings);
  const [savingDisplay, setSavingDisplay] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      try {
        const [themeRes, statsRes, settingsRes] = await Promise.all([
          api.get('/admin/theme', reqOpts(headers)),
          api.get('/admin/stats-settings', reqOpts(headers)),
          api.get('/admin/settings', reqOpts(headers)).catch(() => ({ data: null })),
        ]);
        if (themeRes.data?.theme && typeof themeRes.data.theme === 'object') {
          setTheme((t) => ({ ...t, ...themeRes.data.theme }));
        }
        if (statsRes.data && typeof statsRes.data === 'object') {
          setStats((s) => ({ ...s, ...statsRes.data }));
        }
        if (settingsRes?.data && typeof settingsRes.data === 'object') {
          const d = settingsRes.data;
          setDisplaySettings({
            ...defaultDisplaySettings,
            currency_format: d.currency_format ?? defaultDisplaySettings.currency_format,
            balance_format: d.balance_format ?? defaultDisplaySettings.balance_format,
            rates_rounding: d.rates_rounding ?? defaultDisplaySettings.rates_rounding,
            new_order_search_field: d.new_order_search_field ?? defaultDisplaySettings.new_order_search_field,
            service_name_format: d.service_name_format ?? defaultDisplaySettings.service_name_format,
          });
        }
      } catch (e) {
        console.error("Failed to load settings", e);
        toast.error("Failed to load settings");
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const map = {
      stats: 'stats-section',
      display: 'display-section',
      theme: 'theme-section',
      files: 'files-section'
    };
    const id = map[tab];
    if (id) {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location]);

  const saveTheme = async () => {
    try {
      await api.put('/admin/theme', { theme }, reqOpts(headers));
      toast.success('Theme saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save theme');
    }
  };

  const saveStats = async () => {
    try {
      await api.put('/admin/stats-settings', stats, reqOpts(headers));
      toast.success('Stats settings saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save stats');
    }
  };

  const saveDisplaySettings = async () => {
    setSavingDisplay(true);
    try {
      await api.put('/admin/settings', displaySettings, reqOpts(headers));
      toast.success('Display settings saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save display settings');
    } finally {
      setSavingDisplay(false);
    }
  };

  const writeFile = async (filePath, content) => {
    try {
      const content_base64 = btoa(unescape(encodeURIComponent(content)));
      await api.post('/admin/files', { file_path: filePath, content_base64 }, reqOpts(headers));
      toast.success('File written');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to write file');
    }
  };

  return (
    <AdminLayout title="Advanced Settings">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        
        <Card id="stats-section" className="glass p-6">
          <h2 className="text-xl text-white font-exo font-bold mb-4">Homepage Stats Manager</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-gray-400">Base Orders</Label>
              <Input type="number" value={stats.base_orders} onChange={(e)=>setStats({...stats, base_orders: parseInt(e.target.value)||0})} className="mt-2 bg-deep-navy border-white/10" />
            </div>
            <div>
              <Label className="text-gray-400">Base Users</Label>
              <Input type="number" value={stats.base_users} onChange={(e)=>setStats({...stats, base_users: parseInt(e.target.value)||0})} className="mt-2 bg-deep-navy border-white/10" />
            </div>
            <div>
              <Label className="text-gray-400">Base Services</Label>
              <Input type="number" value={stats.base_services} onChange={(e)=>setStats({...stats, base_services: parseInt(e.target.value)||0})} className="mt-2 bg-deep-navy border-white/10" />
            </div>
            <div>
              <Label className="text-gray-400">Base Orders Today</Label>
              <Input type="number" value={stats.base_orders_today} onChange={(e)=>setStats({...stats, base_orders_today: parseInt(e.target.value)||0})} className="mt-2 bg-deep-navy border-white/10" />
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-4 mt-4">
            <h3 className="text-lg text-white font-bold mb-3">Auto Increment Simulation</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Toggle
                  checked={!!stats.auto_increment}
                  onChange={(v) => setStats({ ...stats, auto_increment: v })}
                  size="sm"
                  color="blue"
                />
                <Label className="text-white cursor-pointer">Enable Auto Increment (Visual)</Label>
              </div>
            </div>
            
            {stats.auto_increment && (
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-400">Min Increment</Label>
                  <Input type="number" value={stats.increment_min} onChange={(e)=>setStats({...stats, increment_min: parseInt(e.target.value)||1})} className="mt-2 bg-deep-navy border-white/10" />
                </div>
                <div>
                  <Label className="text-gray-400">Max Increment</Label>
                  <Input type="number" value={stats.increment_max} onChange={(e)=>setStats({...stats, increment_max: parseInt(e.target.value)||5})} className="mt-2 bg-deep-navy border-white/10" />
                </div>
                <div>
                  <Label className="text-gray-400">Interval (Seconds)</Label>
                  <Input type="number" value={stats.increment_interval} onChange={(e)=>setStats({...stats, increment_interval: parseInt(e.target.value)||5})} className="mt-2 bg-deep-navy border-white/10" />
                </div>
              </div>
            )}
          </div>

          <Button onClick={saveStats} className="mt-6 bg-electric-blue text-black">Save Stats Settings</Button>
        </Card>

        <Card id="display-section" className="glass p-6">
          <h2 className="text-xl text-white font-exo font-bold mb-4">Display & format</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-400">Currency format</Label>
              <Input
                value={displaySettings.currency_format}
                onChange={(e) => setDisplaySettings({ ...displaySettings, currency_format: e.target.value })}
                className="mt-2 bg-deep-navy border-white/10"
                placeholder="1000.00"
              />
              <p className="text-xs text-gray-500 mt-1">How currency values are displayed (e.g. decimals, separators)</p>
            </div>
            <div>
              <Label className="text-gray-400">Balance format</Label>
              <select
                value={displaySettings.balance_format}
                onChange={(e) => setDisplaySettings({ ...displaySettings, balance_format: e.target.value })}
                className="mt-2 w-full h-9 rounded-md border border-white/10 bg-deep-navy text-white px-3 text-sm"
              >
                <option value="default">Default</option>
                <option value="compact">Compact</option>
                <option value="full">Full</option>
                <option value="symbol_only">Symbol only</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-gray-400">Rates rounding</Label>
                <span
                  title="How service rates are rounded: None, Whole (1), Tenth (1.1), Hundredth (1.11), Thousandth (1.111), Ten-thousandth (1.1111), Hundred-thousandth (1.11111)."
                  className="text-gray-500 cursor-help"
                >
                  <Info className="h-4 w-4" />
                </span>
              </div>
              <select
                value={displaySettings.rates_rounding}
                onChange={(e) => setDisplaySettings({ ...displaySettings, rates_rounding: e.target.value })}
                className="mt-2 w-full h-9 rounded-md border border-white/10 bg-deep-navy text-white px-3 text-sm"
              >
                <option value="none">None</option>
                <option value="whole">Whole (1)</option>
                <option value="tenth">Tenth (1.1)</option>
                <option value="hundredth">Hundredth (1.11)</option>
                <option value="thousandth">Thousandth (1.111)</option>
                <option value="ten_thousandth">Ten-thousandth (1.1111)</option>
                <option value="hundred_thousandth">Hundred-thousandth (1.11111)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">How service rates are rounded in the panel</p>
            </div>
            <div>
              <Label className="text-gray-400">New order search field</Label>
              <select
                value={displaySettings.new_order_search_field}
                onChange={(e) => setDisplaySettings({ ...displaySettings, new_order_search_field: e.target.value })}
                className="mt-2 w-full h-9 rounded-md border border-white/10 bg-deep-navy text-white px-3 text-sm"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Label className="text-gray-400">Service name format</Label>
                <span
                  title="Use placeholders: {id}, {name}, {rate}, {rate_per_1000}, {min}, {max} to control how service names appear in lists and order forms."
                  className="text-gray-500 cursor-help"
                >
                  <Info className="h-4 w-4" />
                </span>
              </div>
              <Input
                value={displaySettings.service_name_format}
                onChange={(e) => setDisplaySettings({ ...displaySettings, service_name_format: e.target.value })}
                className="mt-2 bg-deep-navy border-white/10"
                placeholder="ID - Name - Rate per 1000"
              />
            </div>
          </div>
          <Button onClick={saveDisplaySettings} disabled={savingDisplay} className="mt-6 bg-electric-blue text-black">
            {savingDisplay ? 'Saving…' : 'Save display settings'}
          </Button>
        </Card>

        <Card id="files-section" className="glass p-6">
          <h2 className="text-xl text-white font-exo font-bold mb-4">File Manager</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400">File Path (relative to project)</Label>
              <Input id="file_path" className="mt-2 bg-deep-navy border-white/10" placeholder="/frontend/public/custom.css" />
            </div>
            <div>
              <Label className="text-gray-400">Content</Label>
              <textarea id="file_content" className="mt-2 w-full h-24 bg-deep-navy border-white/10 text-white rounded-lg p-3"></textarea>
            </div>
          </div>
          <Button onClick={()=>{
            const p = document.getElementById('file_path').value;
            const c = document.getElementById('file_content').value;
            writeFile(p, c);
          }} className="mt-4 bg-electric-blue text-black">Write File</Button>
        </Card>

        <Card id="theme-section" className="glass p-6">
          <h2 className="text-xl text-white font-exo font-bold mb-4">Theme Customizer</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 pt-8">
              <Toggle
                checked={!!theme.enabled}
                onChange={(v) => setTheme({ ...theme, enabled: v })}
                size="sm"
                color="blue"
              />
              <Label className="text-gray-400 cursor-pointer">Enabled</Label>
            </div>
            <div>
              <Label className="text-gray-400">Primary Color</Label>
              <Input type="color" value={theme.primary} onChange={(e)=>setTheme({...theme, primary: e.target.value})} />
            </div>
            <div>
              <Label className="text-gray-400">Mode</Label>
              <select value={theme.mode} onChange={(e)=>setTheme({...theme, mode: e.target.value})} className="mt-2 bg-deep-navy border-white/10 text-white rounded">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-400">Cursor</Label>
              <select value={theme.cursor} onChange={(e)=>setTheme({...theme, cursor: e.target.value})} className="mt-2 bg-deep-navy border-white/10 text-white rounded">
                <option value="default">Default</option>
                <option value="pointer">Pointer</option>
                <option value="crosshair">Crosshair</option>
              </select>
            </div>
          </div>
          <Button onClick={saveTheme} className="mt-4 bg-electric-blue text-black">Save Theme</Button>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAdvanced;
