import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, History, CreditCard, 
  Wallet, MessageSquare, Code, User, LogOut, Settings,
  Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth, useSettings } from '../../App';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'New Order', path: '/dashboard/new-order', icon: ShoppingCart },
    { name: 'Order History', path: '/dashboard/orders', icon: History },
    { name: 'Add Funds', path: '/dashboard/add-funds', icon: CreditCard },
    { name: 'Deposits', path: '/dashboard/deposits', icon: Wallet },
    { name: 'Support', path: '/dashboard/tickets', icon: MessageSquare },
    { name: 'API Access', path: '/dashboard/api', icon: Code },
    { name: 'Profile', path: '/dashboard/profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-deep-navy border-r border-white/5">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            {settings.panel_logo ? (
              <img 
                src={`${BACKEND_URL}${settings.panel_logo}`} 
                alt="Logo" 
                className="h-10 w-auto object-contain"
              />
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                  <span className="text-white font-exo font-black text-xl">SW</span>
                </div>
                <span className="text-white font-exo font-bold">
                  {settings.panel_name || 'Social'}<span className="text-electric-blue">Panel</span>
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Balance Card */}
        <div className="p-4">
          <div className="gradient-border p-4">
            <div className="text-gray-400 text-sm">Balance</div>
            <div className="text-2xl font-exo font-bold text-electric-blue">
              ${user?.balance?.toFixed(2) || '0.00'}
            </div>
            <Link to="/dashboard/add-funds">
              <Button className="w-full mt-3 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30" size="sm">
                Add Funds
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`sidebar-${item.name.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-electric-blue/10 text-electric-blue border-l-2 border-electric-blue'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* Admin Link */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <div className="p-4 border-t border-white/5">
            <Link to="/admin">
              <Button variant="outline" className="w-full border-cyber-purple/30 text-cyber-purple hover:bg-cyber-purple/10">
                <Settings size={16} className="mr-2" />
                Admin Panel
              </Button>
            </Link>
          </div>
        )}

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <User size={20} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full text-gray-400 hover:text-red-400 hover:bg-red-400/10"
            data-testid="sidebar-logout"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-deep-navy border-r border-white/5 overflow-y-auto">
            <div className="p-4 flex justify-between items-center border-b border-white/5">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-blue to-cyber-purple flex items-center justify-center">
                  <span className="text-white font-exo font-bold text-sm">SW</span>
                </div>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <div className="gradient-border p-3 mb-4">
                <div className="text-xs text-gray-400">Balance</div>
                <div className="text-xl font-exo font-bold text-electric-blue">${user?.balance?.toFixed(2)}</div>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      isActive(item.path)
                        ? 'bg-electric-blue/10 text-electric-blue'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>
              <Button
                variant="ghost"
                onClick={() => { logout(); setSidebarOpen(false); }}
                className="w-full mt-4 text-gray-400 hover:text-red-400"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 glass border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-sidebar-toggle"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-xl font-exo font-bold text-white">{title}</h1>
                <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500">
                  <Link to="/dashboard" className="hover:text-electric-blue">Dashboard</Link>
                  {title !== 'Dashboard' && (
                    <>
                      <ChevronRight size={14} />
                      <span className="text-gray-400">{title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right lg:hidden">
                <div className="text-xs text-gray-500">Balance</div>
                <div className="text-electric-blue font-bold">${user?.balance?.toFixed(2)}</div>
              </div>
              <Link to="/dashboard/new-order">
                <Button className="hidden sm:flex bg-electric-blue hover:bg-electric-blue/90 text-black" data-testid="header-new-order">
                  <ShoppingCart size={16} className="mr-2" />
                  New Order
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
