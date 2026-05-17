import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AtSign, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useAuth, useSettings } from '../App';
import { useReseller } from '../context/ResellerContext';
import { useResellerAuth } from '../context/ResellerAuthContext';
import { assetUrl } from '../config';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

const INVITE_REF_KEY = 'swp_invite_ref';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isReseller } = useReseller();
  const swpAuth = useAuth();
  const resellerAuth = useResellerAuth();
  const { register, loginWithGoogle } = swpAuth;
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fromUrl = (searchParams.get('ref') || '').trim();
    if (fromUrl) {
      try {
        sessionStorage.setItem(INVITE_REF_KEY, fromUrl);
      } catch {
        /* ignore */
      }
    }
  }, [searchParams]);

  const refFromInvite = useMemo(() => {
    const fromUrl = (searchParams.get('ref') || '').trim();
    if (fromUrl) return fromUrl;
    try {
      return (sessionStorage.getItem(INVITE_REF_KEY) || '').trim();
    } catch {
      return '';
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isReseller) {
        await resellerAuth.register(name, email, password);
      } else {
        const refFromUrl =
          (typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('ref')
            : null) || '';
        const ref =
          (refFromUrl && String(refFromUrl).trim()) ||
          refFromInvite ||
          (typeof window !== 'undefined'
            ? (sessionStorage.getItem(INVITE_REF_KEY) || '').trim()
            : '');
        await register(name, email, password, username, whatsapp, ref);
      }
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Registration failed';
      toast.error(typeof msg === 'string' ? msg : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      <Toaster position="top-right" theme="dark" />

      {/* Left Panel - Features */}
      <div className="hidden lg:flex flex-[0_0_60%] items-center justify-center bg-[var(--bg-secondary)] p-12 border-r border-[var(--border)]">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <div className="flex items-center gap-3 mb-6">
              {settings?.favicon ? (
                <img
                  src={assetUrl(settings.favicon, settings.favicon_updated_at)}
                  alt="Favicon"
                  className="w-12 h-12 rounded-xl object-contain bg-[var(--bg-card)] border border-[var(--border)] p-2"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'var(--accent-light)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 900 }}>SW</span>
                </div>
              )}
              <div>
                <div className="text-sm font-exo font-bold text-[var(--text-primary)]">SocialWorldPanel</div>
                <div className="text-xs text-[var(--text-secondary)]">Watchtime SMM Panel</div>
              </div>
            </div>

            <h2 className="text-3xl font-exo font-bold text-[var(--text-primary)] mb-4">Start growing</h2>
            <p className="text-[var(--text-muted)] mb-6">Create an account and launch reliable, high-retention delivery.</p>

            <ul className="space-y-3">
              {[
                { t: 'Instant Delivery', d: 'Start within minutes' },
                { t: 'Secure Orders', d: 'Designed for safe delivery' },
                { t: '24/7 Support', d: 'Help whenever you need it' },
                { t: 'Best Rates', d: 'Competitive pricing' },
              ].map((x) => (
                <li key={x.t} className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}
                  >
                    <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 13 }}>✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-exo font-bold text-[var(--text-primary)]">{x.t}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{x.d}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 glass rounded-2xl p-6 border border-[var(--border)]">
              <div className="text-xs text-[var(--text-muted)] mb-2">Testimonial</div>
              <div className="text-sm text-[var(--text-secondary)]">
                "Setup took seconds. Delivery was fast and consistent—highly recommended."
              </div>
              <div className="text-sm font-exo font-bold text-[var(--text-primary)] mt-3">— Happy Customer</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 auth-page-mobile lg:flex-[0_0_40%]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            {settings?.favicon ? (
              <img
                src={assetUrl(settings.favicon, settings.favicon_updated_at)}
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

          <form onSubmit={handleSubmit} className="space-y-6 auth-form-mobile">
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

            {!isReseller && (
              <div>
                <Label htmlFor="username" className="text-gray-400">Username</Label>
                <div className="relative mt-2">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    className="pl-10 bg-deep-navy border-white/10 focus:border-electric-blue"
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    title="Letters, numbers and underscores only (3-30 chars)"
                    data-testid="register-username"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">3-30 characters, letters, numbers and underscores only</p>
              </div>
            )}

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
              <Label htmlFor="whatsapp" className="text-gray-400">WhatsApp Number (optional)</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+ </span>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="91xxxxxxxxxx"
                  className="pl-7 bg-deep-navy border-white/10 focus:border-electric-blue"
                  data-testid="register-whatsapp"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Include country code, e.g. 91 for India. Used for quick WhatsApp support.
              </p>
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
                  className="pl-10 pr-12 bg-deep-navy border-white/10 focus:border-electric-blue"
                  required
                  data-testid="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-500 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-bold py-6 auth-submit-btn min-h-[52px]"
              data-testid="register-submit"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <>Create Account <ArrowRight size={20} className="ml-2" /></>
              )}
            </Button>
          </form>

          {!isReseller && (
            <>
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
                onClick={() => loginWithGoogle(refFromInvite)}
                className="w-full border-white/10 hover:bg-white/5 py-6 min-h-[52px]"
                data-testid="register-google"
              >
                <svg className="w-5 h-5 mr-2 text-[var(--info)]" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </>
          )}

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

      {/* (Redesigned) No extra decoration panel on large screens.
          The left features panel already provides the marketing content. */}
    </div>
  );
};

export default RegisterPage;
