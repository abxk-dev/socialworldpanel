import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, 
  MessageSquare, Settings, LogOut, Home, Menu, X,
  Server, Gift, BarChart3, Layers
} from 'lucide-react';
import { useAuth, useSettings } from '../../App';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Services', path: '/admin/services', icon: Package },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Providers', path: '/admin/providers', icon: Server },
    { name: 'Platforms', path: '/admin/platforms', icon: Layers },
    { name: 'Bonuses', path: '/admin/bonuses', icon: Gift },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'Tickets', path: '/admin/tickets', icon: MessageSquare },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-deep-navy border-r border-cyber-purple/20">
        <div className="p-6 border-b border-cyber-purple/20">
          <div className="flex items-center gap-2">
            {settings.panel_logo ? (
              <img 
                src={`${BACKEND_URL}${settings.panel_logo}`} 
                alt="Logo" 
                className="h-10 w-auto object-contain"
              />
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-purple to-electric-blue flex items-center justify-center">
                  <span className="text-white font-exo font-black text-xl">A</span>
                </div>
                <span className="text-white font-exo font-bold">
                  Admin <span className="text-cyber-purple">Panel</span>
                </span>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`admin-nav-${item.name.toLowerCase()}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-cyber-purple/20 text-cyber-purple border-l-2 border-cyber-purple'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-cyber-purple/20 space-y-2">
          <Link to="/dashboard">
            <Button variant="outline" className="w-full border-white/10 text-gray-400 hover:text-white">
              <Home size={16} className="mr-2" />
              User Panel
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full text-gray-400 hover:text-red-400 hover:bg-red-400/10"
            data-testid="admin-logout"
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
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-deep-navy border-r border-cyber-purple/20 overflow-y-auto">
            <div className="p-4 flex justify-between items-center border-b border-cyber-purple/20">
              <span className="text-white font-exo font-bold">Admin Panel</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-cyber-purple/20 text-cyber-purple'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 glass border-b border-cyber-purple/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-exo font-bold text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Admin:</span>
              <span className="text-cyber-purple">{user?.name}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
