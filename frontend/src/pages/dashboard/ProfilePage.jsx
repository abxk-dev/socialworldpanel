import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth, API } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import axios from 'axios';

const ProfilePage = () => {
  const { user, token, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(
        `${API}/user/profile`,
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

  return (
    <DashboardLayout title="Profile Settings">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-2xl mx-auto space-y-6">
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
                  <User size={32} className="text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-exo font-bold text-white">{user?.name}</h2>
                <p className="text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-600 mt-1">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label className="text-gray-400">Full Name</Label>
                <div className="relative mt-2">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-deep-navy border-white/10"
                    data-testid="profile-name"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Email Address</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-deep-navy border-white/10"
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
            <h3 className="font-exo font-bold text-white mb-4">Account Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">User ID</div>
                <div className="text-white font-mono text-sm mt-1">{user?.user_id}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Account Type</div>
                <div className="text-white capitalize mt-1">{user?.role}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Balance</div>
                <div className="text-electric-blue font-bold mt-1">${user?.balance?.toFixed(2)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Status</div>
                <div className={`mt-1 ${user?.is_active ? 'text-neon-green' : 'text-red-400'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass p-6">
            <h3 className="font-exo font-bold text-white mb-4">Security</h3>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-500 text-sm">
                Password change functionality is available in the full version. For demo purposes, please use Google OAuth for secure authentication.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
