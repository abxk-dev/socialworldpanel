import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, useSettings } from '../App';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const navLinks = [
    { name: 'Services', path: '/services' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'API', path: '/api-docs' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
            {settings.panel_logo ? (
              <img 
                src={`${BACKEND_URL}${settings.panel_logo}`} 
                alt={settings.panel_name || 'Logo'} 
                className="h-10 w-auto object-contain"
              />
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                  <span className="text-white font-exo font-black text-xl">SW</span>
                </div>
                <span className="hidden sm:block text-white font-exo font-bold text-lg">
                  {settings.panel_name || 'Social World'}<span className="text-electric-blue">Panel</span>
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
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
            ))}
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Balance</div>
                  <div className="text-electric-blue font-bold">${user.balance?.toFixed(2) || '0.00'}</div>
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
                    {(user.role === 'admin' || user.role === 'superadmin') && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2" data-testid="menu-admin">
                          <Settings size={16} />
                          Admin Panel
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
            className="lg:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-2 rounded-lg transition-colors ${
                      isActive(link.path)
                        ? 'bg-electric-blue/10 text-electric-blue'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  {user ? (
                    <>
                      <div className="px-4 py-2 text-gray-400">
                        Balance: <span className="text-electric-blue font-bold">${user.balance?.toFixed(2)}</span>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 text-white hover:bg-white/5 rounded-lg"
                      >
                        Dashboard
                      </Link>
                      {(user.role === 'admin' || user.role === 'superadmin') && (
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className="block px-4 py-2 text-white hover:bg-white/5 rounded-lg"
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => { logout(); setIsOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-red-400 hover:bg-white/5 rounded-lg"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 text-white hover:bg-white/5 rounded-lg"
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 bg-electric-blue text-black font-bold rounded-lg text-center"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
