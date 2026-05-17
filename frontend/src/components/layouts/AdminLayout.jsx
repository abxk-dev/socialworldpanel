import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FolderOpen,
  MessageSquare, Settings, LogOut, Home, Menu, X,
  Server, Gift, BarChart3, Layers, Search, Download, Crown, Activity, CircleDot, RefreshCw, Star, ArrowUpFromLine, FileText,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../App';
import { Button } from '../ui/button';
import api from '../../lib/axios';
import { DEFAULT_ADMIN_NAV_CONFIG } from '../../config/adminNavConfig';

const AdminLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [ticketCount, setTicketCount] = React.useState(0);
  const [withdrawalPendingCount, setWithdrawalPendingCount] = React.useState(0);
  const { user, logout, token, permissions } = useAuth();
  const location = useLocation();
  const [navConfig, setNavConfig] = React.useState(DEFAULT_ADMIN_NAV_CONFIG);
  // Sidebar: which group is expanded (desktop left sidebar). Default: expand group containing current path.
  const [expandedSidebarGroups, setExpandedSidebarGroups] = React.useState(() => ({}));

  React.useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    api.get('/admin/tickets?limit=1', { headers, withCredentials: true })
      .then((res) => setTicketCount(Number(res.data?.awaiting_count) || Number(res.data?.open_count) || Number(res.data?.total) || 0))
      .catch(() => setTicketCount(0));
    api.get('/admin/withdrawals/stats', { headers, withCredentials: true })
      .then((res) => setWithdrawalPendingCount(Number(res.data?.pending_count) || 0))
      .catch(() => setWithdrawalPendingCount(0));
    // Load custom admin navigation (if configured); merge with default so new items (e.g. Activity Logs) always appear
    api.get('/admin/admin-nav', { headers, withCredentials: true })
      .then((res) => {
        const saved = res.data?.admin_nav;
        if (!Array.isArray(saved) || saved.length === 0) {
          setNavConfig(DEFAULT_ADMIN_NAV_CONFIG);
          return;
        }
        const merged = DEFAULT_ADMIN_NAV_CONFIG.map((defaultGroup) => {
          const savedGroup = saved.find((g) => g.id === defaultGroup.id);
          const defaultChildren = defaultGroup.children || [];
          if (!savedGroup || !Array.isArray(savedGroup.children)) return defaultGroup;
          const savedChildren = savedGroup.children;
          const mergedChildren = [...savedChildren];
          defaultChildren.forEach((d) => {
            if (!mergedChildren.some((c) => c.id === d.id)) mergedChildren.push(d);
          });
          return { ...defaultGroup, children: mergedChildren };
        });
        setNavConfig(merged);
      })
      .catch(() => {
        setNavConfig(DEFAULT_ADMIN_NAV_CONFIG);
      });
  }, [token]);

  // Map plain config from adminNavConfig + DB into rich nav items with icons
  const navItems = React.useMemo(() => {
    const iconForGroup = (id) => {
      switch (id) {
        case 'dashboard': return LayoutDashboard;
        case 'user': return Users;
        case 'category': return FolderOpen;
        case 'provider': return Server;
        case 'bonuses': return Gift;
        case 'reports': return BarChart3;
        case 'advance': return Settings;
        case 'settings': return Settings;
        default: return LayoutDashboard;
      }
    };

    const iconForChild = (childId, path) => {
      if (childId === 'dashboard-main') return LayoutDashboard;
      if (childId === 'dashboard-payments') return BarChart3;
      if (childId === 'dashboard-reports') return BarChart3;
      if (childId === 'user-users') return Users;
      if (childId === 'user-resellers') return Users;
      if (childId === 'user-orders') return ShoppingCart;
      if (childId === 'user-refills') return RefreshCw;
      if (childId === 'user-reviews') return Star;
      if (childId === 'category-services') return Package;
      if (childId === 'category-bundles') return Package;
      if (childId === 'category-categories') return FolderOpen;
      if (childId === 'provider-providers') return Server;
      if (childId === 'provider-import') return Download;
      if (childId === 'bonuses-bonuses') return Gift;
      if (childId === 'bonuses-loyalty') return Gift;
      if (childId === 'bonuses-vip') return Crown;
      if (childId === 'bonuses-spin') return CircleDot;
      if (childId === 'bonuses-promocodes') return Star;
      if (childId === 'bonuses-user-pricing') return ArrowUpFromLine;
      if (childId === 'reports-main') return BarChart3;
      if (childId === 'reports-withdrawals') return ArrowUpFromLine;
      if (childId === 'reports-analytics') return Activity;
      if (childId === 'reports-logs') return Activity;
      if (childId === 'advance-advanced') return Settings;
      if (childId === 'advance-seo') return Search;
      if (childId === 'advance-pages') return Layers;
      if (childId === 'advance-blog') return FileText;
      if (childId === 'advance-menu') return LayoutDashboard;
      if (childId === 'advance-notifications') return MessageSquare;
      // Fallback based on path
      if (path && path.includes('/withdrawals')) return ArrowUpFromLine;
      if (path && path.includes('/analytics')) return Activity;
      if (path && path.includes('/tickets')) return MessageSquare;
      return LayoutDashboard;
    };

    const badgeForChild = (childId, path) => {
      if (childId === 'reports-withdrawals' || (path && path.includes('/withdrawals'))) {
        return 'withdrawalPendingCount';
      }
      return undefined;
    };

    return navConfig.map((group) => {
      if (group.type === 'link') {
        return {
          type: 'link',
          name: group.label,
          path: group.path,
          icon: iconForGroup(group.id),
        };
      }
      let groupChildren = group.children || [];
      if (group.id === 'reports' && !permissions?.canViewLogs) {
        groupChildren = groupChildren.filter((c) => c.id !== 'reports-logs');
      }
      const children = groupChildren.map((child) => ({
        name: child.label,
        path: child.path,
        icon: iconForChild(child.id, child.path),
        badge: badgeForChild(child.id, child.path),
      }));
      return {
        type: 'submenu',
        name: group.label,
        icon: iconForGroup(group.id),
        children,
      };
    });
  }, [navConfig, permissions?.canViewLogs]);

  const isActive = (path) => {
    if (path.includes('?')) {
      return (location.pathname + (location.search || '')) === path;
    }
    return location.pathname === path;
  };

  const toggleSidebarGroup = (name) => {
    setExpandedSidebarGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Auto-expand group containing current path (initial and on route change)
  React.useEffect(() => {
    for (const item of navItems) {
      if (item.type === 'submenu' && item.children.some((c) => isActive(c.path))) {
        setExpandedSidebarGroups((prev) => ({ ...prev, [item.name]: true }));
        break;
      }
    }
  }, [location.pathname]);

  const renderNavItem = (item, isMobile = false) => {
    if (item.type === 'submenu') {
      const isExpanded = isMobile || expandedSidebarGroups[item.name] === true;
      const anyActive = item.children.some((c) => isActive(c.path));
      return (
        <div key={item.name} className="space-y-0.5">
          {isMobile ? (
            <div className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
              anyActive ? 'text-cyber-purple' : 'text-gray-500'
            }`}>
              <item.icon size={16} className="shrink-0" />
              <span>{item.name}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => toggleSidebarGroup(item.name)}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                anyActive ? 'text-cyber-purple bg-cyber-purple/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1">{item.name}</span>
              <span className="shrink-0 text-gray-500">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>
          )}
          {isExpanded && (
            <div className="pl-3 space-y-0.5 border-l border-white/10 ml-2.5">
              {item.children.map((child) => {
                const badgeCount = child.badge === 'withdrawalPendingCount' ? withdrawalPendingCount : 0;
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    data-testid={`admin-nav-${child.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive(child.path)
                        ? 'text-cyber-purple bg-cyber-purple/15 border-l-2 border-cyber-purple -ml-px pl-2.5'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <child.icon size={14} className="shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{child.name}</span>
                    {badgeCount > 0 && (
                      <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => isMobile && setSidebarOpen(false)}
        data-testid={`admin-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
          isActive(item.path)
            ? 'text-cyber-purple bg-cyber-purple/15'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <item.icon size={16} className="shrink-0" />
        <span className="flex-1">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="admin-panel-root flex h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-dark-bg">
      {/* Desktop: Left sidebar — viewport height; only nav scrolls */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 h-full min-h-0 overflow-hidden bg-deep-navy border-r border-white/10">
        <div className="p-3 border-b border-white/10 shrink-0">
          <Link to="/admin" className="flex items-center gap-2 text-white font-exo font-bold text-base hover:text-cyber-purple transition-colors">
            <LayoutDashboard size={20} />
            Admin
          </Link>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => renderNavItem(item, false))}
        </nav>
        <div className="p-2 border-t border-white/10 space-y-0.5 shrink-0">
          <Link to="/admin/tickets" className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm ${isActive('/admin/tickets') ? 'text-cyber-purple bg-cyber-purple/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <MessageSquare size={16} />
            <span>Tickets</span>
            {ticketCount > 0 && (
              <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cyber-purple text-white text-xs font-bold flex items-center justify-center">
                {ticketCount > 99 ? '99+' : ticketCount}
              </span>
            )}
          </Link>
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5">
            <Home size={18} />
            User Panel
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10"
            data-testid="admin-logout"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main: top bar + content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="shrink-0 z-40 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-dark-bg/95 border-b border-white/10 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 -m-2 text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-exo font-bold text-white truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-gray-400 text-sm truncate max-w-[120px]" title={user?.name}>
              {user?.name}
            </span>
            <Link to="/admin/tickets" className="lg:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5">
              <MessageSquare size={16} />
              {ticketCount > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-cyber-purple text-white text-xs font-bold flex items-center justify-center">
                  {ticketCount > 99 ? '99+' : ticketCount}
                </span>
              )}
            </Link>
            <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5">
              <Home size={16} />
              <span className="hidden md:inline">User Panel</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout} className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 shrink-0 p-1.5">
              <LogOut size={16} />
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-3 lg:p-4 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 bottom-0 w-64 max-w-[85vw] bg-deep-navy border-r border-white/10 shadow-xl overflow-y-auto">
            <div className="p-3 flex justify-between items-center border-b border-white/10 sticky top-0 bg-deep-navy z-10">
              <span className="text-white font-exo font-bold text-base">Admin</span>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-lg" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => renderNavItem(item, true))}
            </nav>
            <div className="p-3 border-t border-white/10 space-y-1">
              <Link to="/admin/tickets" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5">
                <MessageSquare size={18} />
                <span>Tickets</span>
                {ticketCount > 0 && (
                  <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cyber-purple text-white text-xs font-bold flex items-center justify-center">
                    {ticketCount > 99 ? '99+' : ticketCount}
                  </span>
                )}
              </Link>
              <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5">
                <Home size={18} />
                User Panel
              </Link>
              <button type="button" onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10">
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
