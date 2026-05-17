import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Save, Eye, EyeOff, Receipt } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth } from '../../App';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { useFormatRate } from '../../hooks/useFormatRate';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

const ProfilePage = () => {
  const { user, token, refreshUser } = useAuth();
  const { formatPrice } = useCurrency();
  const { formatPriceWithRateDecimals } = useFormatRate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const hasPassword = user?.has_password === true;
  const [profileSection, setProfileSection] = useState('account');
  const [billing, setBilling] = useState({
    full_name: '',
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    gst_number: '',
    pan_number: '',
    email_for_invoice: '',
  });
  const [savingBilling, setSavingBilling] = useState(false);

  useEffect(() => {
    api
      .get('/invoices/settings')
      .then((r) => {
        if (r.data?.billing) setBilling((b) => ({ ...b, ...r.data.billing }));
      })
      .catch(() => {});
  }, [token]);

  const saveBilling = async (e) => {
    e.preventDefault();
    setSavingBilling(true);
    try {
      await api.put('/invoices/settings', billing);
      toast.success('Billing info saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSavingBilling(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.put(
        '/user/profile',
        { name, email },
        { headers, withCredentials: true }
      );
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    const pwd = newPassword.trim();
    if (pwd.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (hasPassword && !currentPassword.trim()) {
      toast.error('Enter your current password');
      return;
    }
    setSavingPassword(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.put(
        '/user/profile',
        hasPassword
          ? { current_password: currentPassword, new_password: pwd }
          : { password: pwd },
        { headers, withCredentials: true }
      );
      setCurrentPassword('');
      setNewPassword('');
      await refreshUser();
      toast.success(hasPassword ? 'Password changed successfully' : 'Password set. You can now sign in with email and password.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <DashboardLayout title="Profile Settings">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={profileSection === 'account' ? 'default' : 'outline'} onClick={() => setProfileSection('account')} className={profileSection === 'account' ? 'bg-electric-blue text-black' : ''}>
            Account
          </Button>
          <Button type="button" size="sm" variant={profileSection === 'billing' ? 'default' : 'outline'} onClick={() => setProfileSection('billing')} className={profileSection === 'billing' ? 'bg-electric-blue text-black' : ''}>
            <Receipt size={14} className="mr-1" />
            Billing info
          </Button>
        </div>

        {profileSection === 'billing' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass p-6">
              <h3 className="font-exo font-bold text-[var(--text-primary)] mb-4">Invoice billing details</h3>
              <form onSubmit={saveBilling} className="space-y-3">
                {['full_name', 'company_name', 'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code', 'gst_number', 'pan_number', 'email_for_invoice'].map((field) => (
                  <div key={field}>
                    <Label className="text-[var(--text-muted)] capitalize">{field.replace(/_/g, ' ')}</Label>
                    <Input
                      value={billing[field] || ''}
                      onChange={(e) => setBilling({ ...billing, [field]: e.target.value })}
                      className="mt-1 bg-deep-navy border-[var(--border)]"
                    />
                  </div>
                ))}
                <Button type="submit" disabled={savingBilling} className="bg-electric-blue text-black">
                  {savingBilling ? 'Saving…' : 'Save billing info'}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {profileSection === 'account' && (
        <>
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full" />
                ) : (
                  <User size={32} className="text-[var(--text-primary)]" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-exo font-bold text-[var(--text-primary)]">{user?.name}</h2>
                <p className="text-[var(--text-muted)]">{user?.email}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label className="text-[var(--text-muted)]">Full Name</Label>
                <div className="relative mt-2">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-deep-navy border-[var(--border)]"
                    data-testid="profile-name"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[var(--text-muted)]">Email Address</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-deep-navy border-[var(--border)]"
                    data-testid="profile-email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="bg-electric-blue text-black"
                data-testid="profile-save"
              >
                {saving ? (
                  <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Account Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass p-6">
            <h3 className="font-exo font-bold text-[var(--text-primary)] mb-4">Account Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-card)] rounded-lg p-4">
                <div className="text-[var(--text-muted)] text-sm">User ID</div>
                <div className="text-[var(--text-primary)] font-mono text-sm mt-1">{user?.user_id}</div>
              </div>
              <div className="bg-[var(--bg-card)] rounded-lg p-4">
                <div className="text-[var(--text-muted)] text-sm">Account Type</div>
                <div className="text-[var(--text-primary)] capitalize mt-1">{user?.role}</div>
              </div>
              <div className="bg-[var(--bg-card)] rounded-lg p-4">
                <div className="text-[var(--text-muted)] text-sm">Balance</div>
                <div className="text-electric-blue font-bold mt-1">{formatPriceWithRateDecimals(user?.balance ?? 0)}</div>
              </div>
              <div className="bg-[var(--bg-card)] rounded-lg p-4">
                <div className="text-[var(--text-muted)] text-sm">Status</div>
                <div className={`mt-1 ${user?.is_active ? 'text-neon-green' : 'text-[var(--error)]'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Password: Set (Google users) or Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass p-6">
            <h3 className="font-exo font-bold text-[var(--text-primary)] mb-4">Security</h3>
            {!hasPassword && (
              <p className="text-[var(--text-muted)] text-sm mb-4">
                You signed in with Google. Set a password below to also sign in with email and password.
              </p>
            )}
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {hasPassword && (
                <div>
                  <Label className="text-[var(--text-muted)]">Current password</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-deep-navy border-[var(--border)]"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-[var(--text-muted)]">{hasPassword ? 'New password' : 'Password'}</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-10 pr-10 bg-deep-navy border-[var(--border)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={savingPassword}
                variant="outline"
                className="border-[var(--border)]"
              >
                {savingPassword ? (
                  <div className="animate-spin w-5 h-5 border-2 border-[var(--text-primary)] border-t-transparent rounded-full" />
                ) : hasPassword ? (
                  'Change password'
                ) : (
                  'Set password (enables email sign-in)'
                )}
              </Button>
            </form>
          </Card>
        </motion.div>
        </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
