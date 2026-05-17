import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, DollarSign, Palette, LogOut } from 'lucide-react';
import { useReseller } from '../../context/ResellerContext';
import { useResellerAdminAuth } from '../../context/ResellerAdminAuthContext';
import { Button } from '../ui/button';

const nav = [
  { path: '/reseller-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reseller-admin/users', label: 'Users', icon: Users },
  { path: '/reseller-admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/reseller-admin/prices', label: 'Prices', icon: DollarSign },
  { path: '/reseller-admin/brand', label: 'Branding', icon: Palette },
];

export default function ResellerAdminLayout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { config } = useReseller();
  const { reseller, logout } = useResellerAdminAuth();
  const panelName = config?.panel_name || config?.brand?.panel_name || reseller?.name || 'Reseller Panel';

  const handleLogout = () => {
    logout();
    navigate('/reseller-admin/login');
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-[#0a0a0f] text-white">
      <aside className="w-56 shrink-0 h-full min-h-0 overflow-hidden border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 shrink-0">
          <h1 className="font-bold text-lg truncate" style={{ color: 'var(--accent, #7c3aed)' }}>{panelName}</h1>
          <p className="text-gray-500 text-xs mt-1">Reseller Admin</p>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
          {nav.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                style={isActive ? { backgroundColor: 'var(--accent)', color: '#fff' } : {}}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-white/10 shrink-0">
          <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white" onClick={handleLogout}>
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        {children}
      </main>
    </div>
  );
}
