import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useAuth, useSettings } from '../App';
import { useReseller } from '../context/ResellerContext';
import { useResellerAuth } from '../context/ResellerAuthContext';
import { assetUrl } from '../config';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isReseller } = useReseller();
  const swpAuth = useAuth();
  const resellerAuth = useResellerAuth();
  const { login, loginWithGoogle, suspendedMessage, clearSuspendedMessage } = swpAuth;
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const messages = {
        google_not_configured: 'Google sign-in is not configured on the server (missing OAuth credentials).',
        google_denied: 'Google sign-in was cancelled.',
        missing_code: 'Google sign-in was cancelled or failed.',
        invalid_state: 'Sign-in session expired. Please try again.',
        token_exchange_failed: 'Could not complete Google sign-in. Check OAuth redirect URI in Google Cloud Console.',
        db_unavailable: 'Database unavailable. Try again later.',
        no_token: 'Could not get token from Google.',
        no_email: 'Google did not return a verified email address.',
        registration_disabled: 'Registration is currently disabled.',
        account_suspended: 'This account has been suspended.',
        server_error: 'Something went wrong. Please try again.',
      };
      toast.error(messages[error] || 'Sign-in failed.');
      setSearchParams((p) => {
        p.delete('error');
        return p;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isReseller) {
        await resellerAuth.login(email, password);
      } else {
        await login(email, password);
      }
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      const raw = error.response?.data?.detail ?? error.response?.data?.error ?? error.message ?? 'Login failed';
      const detail = typeof raw === 'string' ? raw : (raw?.message ?? (typeof raw === 'object' ? JSON.stringify(raw) : String(raw)));
      const status = error.response?.status ? ` (${error.response.status})` : '';
      toast.error(`${detail}${status}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <Toaster position="top-right" theme="dark" />
      {!isReseller && suspendedMessage && (
        <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-3 flex items-center justify-between">
          <p className="text-red-400 font-medium">{suspendedMessage}</p>
          <button onClick={clearSuspendedMessage} className="text-red-400/80 hover:text-red-400 text-sm underline">Dismiss</button>
        </div>
      )}
      <div className="flex-1 flex">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex flex-[0_0_60%] items-center justify-center bg-[var(--bg-secondary)] p-12 border-r border-[var(--border)]">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
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

            <h2 className="text-3xl font-exo font-bold text-[var(--text-primary)] mb-4">Welcome back</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Keep orders moving and grow with consistent delivery.
            </p>

            <ul className="space-y-3">
              {[
                { t: 'Instant Delivery', d: 'Start within minutes' },
                { t: 'Secure Orders', d: 'No password required' },
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
              <div className="text-xs text-[var(--text-muted)] mb-2">What customers say</div>
              <div className="text-sm text-[var(--text-secondary)]">
                "Fast delivery and great support. My go-to panel for watchtime!"
              </div>
              <div className="text-sm font-exo font-bold text-[var(--text-primary)] mt-3">— Verified Creator</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 auth-page-mobile lg:flex-[0_0_40%]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
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

          <h1 className="text-3xl font-exo font-bold text-white mb-2">Sign In</h1>
          <p className="text-gray-400 mb-8">Access your dashboard and manage orders</p>

          <form onSubmit={handleSubmit} className="space-y-6 auth-form-mobile">
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
                  data-testid="login-email"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-400">Password</Label>
                <Link to="/forgot-password" className="text-sm text-electric-blue hover:underline">
                  Forgot password?
                </Link>
              </div>
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
                  data-testid="login-password"
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
              className="w-full bg-electric-blue hover:bg-electric-blue/90 text-black font-bold py-6 auth-submit-btn min-h-[52px]"
              data-testid="login-submit"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <>Sign In <ArrowRight size={20} className="ml-2" /></>
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
                onClick={loginWithGoogle}
                className="w-full border-white/10 hover:bg-white/5 py-6 min-h-[52px]"
                data-testid="login-google"
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
            Don't have an account?{' '}
            <Link to="/register" className="text-electric-blue hover:underline">
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
      </div>
    </div>
  );
};

export default LoginPage;
