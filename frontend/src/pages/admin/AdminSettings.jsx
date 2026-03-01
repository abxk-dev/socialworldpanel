import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Globe, Mail, AlertTriangle } from 'lucide-react';
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
    maintenance_mode: false,
    registration_enabled: true,
    free_balance_new_users: 0,
    default_currency: 'USD',
    google_analytics_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API}/admin/settings`, { headers, withCredentials: true });
        setSettings(response.data);
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
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API}/admin/settings`, settings, { headers, withCredentials: true });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
        {/* General Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 border-cyber-purple/20">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="text-cyber-purple" size={24} />
              <h2 className="text-xl font-exo font-bold text-white">General Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Panel Name</Label>
                <Input
                  value={settings.panel_name}
                  onChange={(e) => setSettings({...settings, panel_name: e.target.value})}
                  className="mt-2 bg-deep-navy border-white/10"
                  data-testid="settings-panel-name"
                />
              </div>

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
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
