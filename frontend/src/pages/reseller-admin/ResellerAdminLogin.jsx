import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { useReseller } from '../../context/ResellerContext';
import { useResellerAdminAuth } from '../../context/ResellerAdminAuthContext';
import { toast } from 'sonner';

export default function ResellerAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isReseller, config } = useReseller();
  const { login } = useResellerAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/reseller-admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isReseller) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center text-gray-400">
          <p>Reseller admin is only available on your panel domain.</p>
          <Link to="/" className="text-electric-blue hover:underline mt-2 inline-block">Go home</Link>
        </div>
      </div>
    );
  }

  const panelName = config?.panel_name || config?.brand?.panel_name || 'Reseller Panel';

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">{panelName}</h1>
          <p className="text-gray-400 mt-1">Reseller Admin Login</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-400">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourpanel.com"
                className="pl-10 bg-deep-navy border-white/10"
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-gray-400">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 bg-deep-navy border-white/10"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-electric-blue hover:bg-electric-blue/90 text-black font-bold">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="text-center text-gray-500 text-sm mt-6">
          <Link to="/" className="text-electric-blue hover:underline">Back to panel</Link>
        </p>
      </div>
    </div>
  );
}
