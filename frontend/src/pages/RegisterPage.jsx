import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useAuth, useSettings } from '../App';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      <Toaster position="top-right" theme="dark" />
      
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            {settings?.favicon ? (
              <img
                src={`${BACKEND_URL}${settings.favicon}`}
                alt={settings.panel_name || 'Favicon'}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                <span className="text-white font-exo font-black text-xl">SW</span>
              </div>
            )}
            <span className="text-white font-exo font-bold text-lg">
              Social World<span className="text-electric-blue">Panel</span>
            </span>
          </Link>

          <h1 className="text-3xl font-exo font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400 mb-8">Start growing your social media today</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-gray-400">Full Name</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10 bg-deep-navy border-white/10 focus:border-electric-blue"
                  required
                  data-testid="register-name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-400">Email Address</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-deep-navy border-white/10 focus:border-electric-blue"
                  required
                  data-testid="register-email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-400">Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-deep-navy border-white/10 focus:border-electric-blue"
                  required
                  data-testid="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-bold py-6"
              data-testid="register-submit"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <>Create Account <ArrowRight size={20} className="ml-2" /></>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-bg text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={loginWithGoogle}
            className="w-full border-white/10 hover:bg-white/5 py-6"
            data-testid="register-google"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-gray-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-electric-blue hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-gray-600 text-xs mt-4">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Decoration */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-electric-blue/10 to-cyber-purple/10 p-12">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            {settings?.favicon ? (
              <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-gradient-to-br from-electric-blue/20 to-cyber-purple/20 flex items-center justify-center">
                <img
                  src={`${BACKEND_URL}${settings.favicon}`}
                  alt="Favicon"
                  className="w-40 h-40 object-contain"
                />
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-gradient-to-br from-electric-blue/20 to-cyber-purple/20 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-electric-blue/30 to-cyber-purple/30 flex items-center justify-center animate-pulse">
                  <div className="text-6xl font-exo font-black neon-text">SW</div>
                </div>
              </div>
            )}
            <h2 className="text-2xl font-exo font-bold text-white mb-4">Join 45,000+ Users</h2>
            <p className="text-gray-400">Growing their social media presence with us</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
