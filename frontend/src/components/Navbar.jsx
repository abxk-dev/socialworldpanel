import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, LayoutDashboard, ChevronDown, Crown, Shield } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { Button } from './ui/button';
import { useSettings } from '../App';
import { useCurrency } from '../context/CurrencyContext';
import { useReseller } from '../context/ResellerContext';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { useFormatRate } from '../hooks/useFormatRate';
import ThemeSelector from './ThemeSelector';
import { useTheme } from '../context/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { assetUrl } from '../config';

const ADMIN_NAV_ROLES = new Set(['admin', 'main_admin']);

const CURRENCY_OPTIONS = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'INR', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal' },
  { code: 'PKR', flag: '🇵🇰', name: 'Pakistani Rupee' },
  { code: 'BDT', flag: '🇧🇩', name: 'Bangladeshi Taka' },
  { code: 'NGN', flag: '🇳🇬', name: 'Nigerian Naira' },
  { code: 'BRL', flag: '🇧🇷', name: 'Brazilian Real' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, logout } = useDashboardAuth();
  const { settings } = useSettings();
  const { isReseller, config: resellerConfig } = useReseller();
  const { formatPrice } = useCurrency();
  const { formatPriceWithRateDecimals } = useFormatRate();
  const location = useLocation();
  const { isLight } = useTheme();
  const [logoError, setLogoError] = React.useState(false);

  const defaultLinks = [
    ...(user ? [{ name: 'Dashboard', path: '/dashboard' }] : []),
    { name: 'Services', path: '/services' },
    { name: 'Terms & Conditions', path: '/terms' },
    { name: 'API', path: '/api-docs' },
    {
      name: 'Blogs',
      path: '/blog',
      children: [
        { name: 'Blog', path: '/blog' },
        { name: 'YT Monetization', path: '/youtube-monetization' },
        { name: 'Social Proof', path: '/proof' },
      ],
    },
    { name: 'Contact', path: '/contact' },
  ];
  const baseLinks = Array.isArray(settings.menu) && settings.menu.length ? settings.menu : defaultLinks;
  const navLinks = user && baseLinks.every((l) => l.path !== '/dashboard')
    ? [{ name: 'Dashboard', path: '/dashboard' }, ...baseLinks]
    : baseLinks;

  const resolvedLogo =
    isLight && settings?.panel_logo_light ? settings.panel_logo_light : settings?.panel_logo;
  const resolvedLogoUpdatedAt =
    isLight && settings?.panel_logo_light ? settings?.panel_logo_light_updated_at : settings?.panel_logo_updated_at;

  React.useEffect(() => {
    setLogoError(false);
  }, [resolvedLogo]);

  const isActive = (path) => location.pathname === path;

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <nav className="navbar-fixed sticky top-0 z-[1000] glass border-b border-white/5">
        <div className="navbar-inner max-w-7xl mx-auto py-2 md:py-0">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="navbar-logo">
            {isReseller && resellerConfig?.brand?.logo_url ? (
              <img
                src={resellerConfig.brand.logo_url}
                alt={resellerConfig.brand.panel_name || resellerConfig.panel_name || 'Logo'}
                className="h-[50px] w-auto object-contain"
              />
            ) : resolvedLogo && !logoError ? (
              <img 
                src={assetUrl(resolvedLogo, resolvedLogoUpdatedAt)} 
                alt={settings.panel_name || 'Logo'} 
                className="h-[50px] w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <>
                <div className="w-[50px] h-[50px] rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                  <span className="text-white font-exo font-black text-xl">SW</span>
                </div>
                <span className="hidden sm:block text-white font-exo font-bold text-lg md:text-2xl">
                  {isReseller ? (resellerConfig?.panel_name || resellerConfig?.brand?.panel_name || 'Panel') : (settings.panel_name || 'Social World')}
                  {!isReseller && <span className="text-electric-blue">Panel</span>}
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links-desktop hidden lg:flex flex-1 justify-center items-center gap-5 xl:gap-8 px-4 min-w-0">
            {navLinks.map((link, idx) =>
              link.children && link.children.length > 0 ? (
                <DropdownMenu key={`dropdown-${idx}`}>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-testid={`nav-${link.name.toLowerCase()}`}
                      className="text-sm font-medium transition-colors flex items-center gap-1 text-gray-400 hover:text-white outline-none focus-visible:outline-none focus-visible:ring-0"
                    >
                      {link.name}
                      <ChevronDown size={16} className="opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="glass border-white/10 min-w-[180px]">
                    {link.children.map((child) => (
                      <DropdownMenuItem key={child.path} asChild>
                        <Link
                          to={child.path}
                          className={child.path === location.pathname ? 'text-electric-blue' : ''}
                        >
                          {child.name || child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={link.path || idx}
                  to={link.path}
                  data-testid={`nav-${link.name.toLowerCase()}`}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'text-electric-blue'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              )
            )}
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="nav-auth-desktop hidden lg:flex items-center gap-3 xl:gap-4">
            <ThemeSelector />
            {user ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="text-right">
                  <div className="text-sm text-gray-400">Balance</div>
                  <div className="text-electric-blue font-bold">
                    {formatPriceWithRateDecimals(user?.balance ?? 0)}
                  </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-white/10 gap-2"
                        data-testid="user-menu-trigger"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                          {user.picture ? (
                            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <User size={16} className="text-white" />
                          )}
                        </div>
                        <span className="max-w-[100px] truncate">{user.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 glass border-white/10">
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="flex items-center gap-2" data-testid="menu-dashboard">
                          <LayoutDashboard size={16} />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      {ADMIN_NAV_ROLES.has(user.role) && (
                        <DropdownMenuItem asChild>
                          <Link
                            to="/admin"
                            className={`flex items-center gap-2 font-semibold ${
                              user.role === 'main_admin'
                                ? 'text-amber-200 focus:text-amber-100 focus:bg-amber-500/10'
                                : 'text-violet-200 focus:text-violet-100 focus:bg-violet-600/15'
                            }`}
                            data-testid="menu-admin"
                          >
                            {user.role === 'main_admin' ? (
                              <Crown size={16} className="text-amber-400 shrink-0" />
                            ) : (
                              <Shield size={16} className="text-violet-400 shrink-0" />
                            )}
                            {user.role === 'main_admin' ? 'Main Admin' : 'Admin Panel'}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/profile" className="flex items-center gap-2" data-testid="menu-profile">
                          <User size={16} />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="text-red-400 focus:text-red-400 cursor-pointer"
                        data-testid="menu-logout"
                      >
                        <LogOut size={16} className="mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-gray-400 hover:text-white" data-testid="nav-login">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="btn-skew bg-electric-blue hover:bg-electric-blue/90 text-black" data-testid="nav-register">
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="hamburger-btn lg:hidden text-gray-400 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            data-testid="mobile-menu-toggle"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        </div>
      </nav>

      {/* Mobile overlay (tap to close) */}
      <div
        className={`mobile-menu-overlay ${isOpen ? 'open' : ''}`}
        onClick={closeMenu}
        onKeyDown={(e) => e.key === 'Escape' && closeMenu()}
        role="button"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Mobile menu drawer */}
      <div className={`mobile-menu-drawer glass border-t border-white/10 ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-drawer-scroll py-4 space-y-1">
          {navLinks.map((link, idx) =>
            link.children && link.children.length > 0 ? (
              <div key={`mobile-dropdown-${idx}`}>
                <div className="px-4 py-2 text-gray-400 font-medium text-sm">{link.name}</div>
                {link.children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={closeMenu}
                    className={`mobile-menu-item rounded-lg ${
                      isActive(child.path)
                        ? 'bg-electric-blue/10 text-electric-blue'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {child.name || child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={link.path || idx}
                to={link.path}
                onClick={closeMenu}
                className={`mobile-menu-item rounded-lg ${
                  isActive(link.path)
                    ? 'bg-electric-blue/10 text-electric-blue'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            )
          )}
          <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
            <div className="px-4 py-2">
              <ThemeSelector />
            </div>
            {user ? (
              <>
                <div className="px-4 py-2 text-gray-400 text-sm">
                  Balance: <span className="text-electric-blue font-bold">{formatPriceWithRateDecimals(user?.balance ?? 0)}</span>
                </div>
                <Link to="/dashboard" onClick={closeMenu} className="mobile-menu-item rounded-lg text-white hover:bg-white/5">
                  Dashboard
                </Link>
                {ADMIN_NAV_ROLES.has(user.role) && (
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className={`mobile-menu-item rounded-lg font-semibold flex items-center gap-2 ${
                      user.role === 'main_admin'
                        ? 'text-amber-200 border border-amber-400/35 bg-amber-500/10 hover:bg-amber-500/15'
                        : 'text-violet-100 border border-violet-500/35 bg-violet-600/10 hover:bg-violet-600/18'
                    }`}
                  >
                    {user.role === 'main_admin' ? (
                      <Crown size={16} className="text-amber-400 shrink-0" />
                    ) : (
                      <Shield size={16} className="text-violet-400 shrink-0" />
                    )}
                    {user.role === 'main_admin' ? 'Main Admin' : 'Admin Panel'}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => { logout(); closeMenu(); }}
                  className="mobile-menu-item w-full text-left rounded-lg text-red-400 hover:bg-white/5"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu} className="mobile-menu-item rounded-lg text-white hover:bg-white/5">
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="block mx-4 mt-2 py-3 bg-electric-blue text-black font-bold rounded-lg text-center min-h-[48px] flex items-center justify-center"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
