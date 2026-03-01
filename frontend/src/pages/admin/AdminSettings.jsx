import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Globe, Mail, AlertTriangle, Upload, Image, Loader2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const AdminSettings = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    panel_name: 'Social World Panel',
    panel_logo: '',
    favicon: '',
    maintenance_mode: false,
    registration_enabled: true,
    free_balance_new_users: 0,
    default_currency: 'USD',
    google_analytics_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API}/admin/settings`, { headers, withCredentials: true });
        setSettings(prev => ({ ...prev, ...response.data }));
      } catch (error) {
        console.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, settings, { headers, withCredentials: true });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/admin/upload/logo`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setSettings(prev => ({ ...prev, panel_logo: response.data.url }));
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    setUploadingFavicon(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/admin/upload/favicon`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setSettings(prev => ({ ...prev, favicon: response.data.url }));
      toast.success('Favicon uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
    }
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, panel_logo: '' }));
  };

  const removeFavicon = () => {
    setSettings(prev => ({ ...prev, favicon: '' }));
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
        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <div className="flex items-center gap-3 mb-6">
              <Image className="text-cyber-purple" size={24} />
              <h2 className="text-xl font-exo font-bold text-white">Branding</h2>
            </div>

            <div className="space-y-6">
              {/* Panel Name */}
              <div>
                <Label>Panel Name</Label>
                <Input
                  value={settings.panel_name}
                  onChange={(e) => setSettings({...settings, panel_name: e.target.value})}
                  className="mt-2 bg-deep-navy border-white/10"
                  data-testid="settings-panel-name"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <Label>Panel Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.panel_logo ? (
                    <div className="relative group">
                      <img 
                        src={`${API.replace('/api', '')}${settings.panel_logo}`} 
                        alt="Logo" 
                        className="h-16 w-auto object-contain bg-white/5 rounded-lg p-2"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-32 bg-white/5 rounded-lg flex items-center justify-center border border-dashed border-white/20">
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

              {/* Favicon Upload */}
              <div>
                <Label>Favicon</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.favicon ? (
                    <div className="relative group">
                      <img 
                        src={`${API.replace('/api', '')}${settings.favicon}`} 
                        alt="Favicon" 
                        className="h-10 w-10 object-contain bg-white/5 rounded-lg p-1"
                      />
                      <button
                        onClick={removeFavicon}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center border border-dashed border-white/20">
                      <span className="text-gray-500 text-xs">-</span>
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
            </div>
          </Card>
        </motion.div>

        {/* General Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="text-cyber-purple" size={24} />
              <h2 className="text-xl font-exo font-bold text-white">General Settings</h2>
            </div>

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
            </div>
          </Card>
        </motion.div>

        {/* Toggles */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="text-yellow-500" size={24} />
              <h2 className="text-xl font-exo font-bold text-white">System Controls</h2>
            </div>

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
          </Card>
        </motion.div>

        {/* Email Settings (Demo) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="text-electric-blue" size={24} />
              <h2 className="text-xl font-exo font-bold text-white">Email Settings</h2>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-500 text-sm">
                Email configuration is available in the full version. Contact support to enable email functionality.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 opacity-50">
              <div>
                <Label>SMTP Host</Label>
                <Input disabled placeholder="smtp.example.com" className="mt-2 bg-deep-navy border-white/10" />
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input disabled placeholder="587" className="mt-2 bg-deep-navy border-white/10" />
              </div>
              <div>
                <Label>SMTP Username</Label>
                <Input disabled placeholder="user@example.com" className="mt-2 bg-deep-navy border-white/10" />
              </div>
              <div>
                <Label>SMTP Password</Label>
                <Input disabled type="password" placeholder="••••••••" className="mt-2 bg-deep-navy border-white/10" />
              </div>
            </div>
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
