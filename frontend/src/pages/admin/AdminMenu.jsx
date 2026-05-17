import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import api from '../../lib/axios';
import { useAuth } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { DEFAULT_ADMIN_NAV_CONFIG } from '../../config/adminNavConfig';

/** Default user dashboard sidebar items shown in Menu Builder when none saved. */
const DEFAULT_DASHBOARD_MENU = [
  { name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', children: [] },
  { name: 'New Order', path: '/dashboard/new-order', icon: 'ShoppingCart', children: [] },
  { name: 'AI Recommender', path: '/dashboard/recommend', icon: 'Sparkles', children: [] },
  { name: 'Mass Order', path: '/dashboard/mass-order', icon: 'LayoutList', children: [] },
  { name: 'Build Bundle', path: '/dashboard/bundle', icon: 'Package', children: [] },
  { name: 'Instagram Boost', path: '/instagram-boost', icon: 'Instagram', children: [] },
  { name: 'Service Prices', path: '/dashboard/service-prices', icon: 'DollarSign', children: [] },
  { name: 'Order History', path: '/dashboard/orders', icon: 'History', children: [] },
  { name: 'Analytics', path: '/dashboard/analytics', icon: 'BarChart2', children: [] },
  { name: 'My Reviews', path: '/dashboard/my-reviews', icon: 'Star', children: [] },
  { name: 'My Accounts', path: '/dashboard/accounts', icon: 'Users', children: [] },
  { name: 'Templates', path: '/dashboard/templates', icon: 'FileText', children: [] },
  { name: 'Daily Spin', path: '/dashboard/rewards', icon: 'Gift', children: [] },
  { name: 'Rewards', path: '/dashboard/loyalty', icon: 'Award', children: [] },
  { name: 'Referral Wallet', path: '/dashboard/referral', icon: 'UserPlus', children: [] },
  { name: 'Notifications', path: '/dashboard/notifications', icon: 'Bell', children: [] },
  { name: 'Add Funds', path: '/dashboard/add-funds', icon: 'CreditCard', children: [] },
  { name: 'Withdraw', path: '/dashboard/withdraw', icon: 'ArrowUpFromLine', children: [] },
  { name: 'Support', path: '/dashboard/tickets', icon: 'MessageSquare', children: [] },
  { name: 'API Access', path: '/dashboard/api', icon: 'Code', children: [] },
  { name: 'Billing', path: '/dashboard/billing', icon: 'Receipt', children: [] },
  { name: 'Profile', path: '/dashboard/profile', icon: 'User', children: [] },
];

const AdminMenu = () => {
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [menu, setMenu] = useState([]);
  const [dashboardMenu, setDashboardMenu] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dashboardDragIndex, setDashboardDragIndex] = useState(null);
  const [adminNav, setAdminNav] = useState(DEFAULT_ADMIN_NAV_CONFIG);

  useEffect(() => {
    api.get('/admin/menu', { headers }).then(res => {
      setMenu(res.data.menu || []);
      const saved = res.data.dashboard_menu;
      setDashboardMenu(Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_DASHBOARD_MENU);
    }).catch(() => {});
    api.get('/admin/admin-nav', { headers }).then(res => {
      const cfg = res.data?.admin_nav;
      if (Array.isArray(cfg) && cfg.length) {
        setAdminNav(cfg);
      }
    }).catch(() => {
      setAdminNav(DEFAULT_ADMIN_NAV_CONFIG);
    });
  }, []);

  const saveAll = async () => {
    await api.put('/admin/menu', { menu, dashboard_menu: dashboardMenu }, { headers });
    await api.put('/admin/admin-nav', { admin_nav: adminNav }, { headers });
    toast.success('Menus saved');
  };

  const moveAdminGroup = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= adminNav.length) return;
    const next = [...adminNav];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setAdminNav(next);
  };

  const moveAdminChild = (groupIndex, childIndex, direction) => {
    const group = adminNav[groupIndex];
    if (!group || !Array.isArray(group.children)) return;
    const target = childIndex + direction;
    if (target < 0 || target >= group.children.length) return;
    const updatedGroups = [...adminNav];
    const children = [...group.children];
    const [moved] = children.splice(childIndex, 1);
    children.splice(target, 0, moved);
    updatedGroups[groupIndex] = { ...group, children };
    setAdminNav(updatedGroups);
  };

  const updateAdminChildField = (groupIndex, childIndex, field, value) => {
    const group = adminNav[groupIndex];
    if (!group || !Array.isArray(group.children)) return;
    const updatedGroups = [...adminNav];
    const children = [...group.children];
    const updatedChild = { ...children[childIndex], [field]: value };
    children[childIndex] = updatedChild;
    updatedGroups[groupIndex] = { ...group, children };
    setAdminNav(updatedGroups);
  };

  const moveAdminChildToGroup = (fromGroupIndex, childIndex, targetGroupId) => {
    if (fromGroupIndex === null || childIndex === null) return;
    const fromGroup = adminNav[fromGroupIndex];
    if (!fromGroup || !Array.isArray(fromGroup.children)) return;
    const updated = [...adminNav];
    const fromChildren = [...fromGroup.children];
    const [moved] = fromChildren.splice(childIndex, 1);
    updated[fromGroupIndex] = { ...fromGroup, children: fromChildren };
    const targetIndex = updated.findIndex((g) => g.id === targetGroupId);
    if (targetIndex === -1) {
      // if target not found, restore original
      return;
    }
    const targetGroup = updated[targetIndex];
    const nextChildren = Array.isArray(targetGroup.children) ? [...targetGroup.children, moved] : [moved];
    updated[targetIndex] = { ...targetGroup, children: nextChildren };
    setAdminNav(updated);
  };

  const moveUserMenuItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= menu.length) return;
    const next = [...menu];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setMenu(next);
  };

  const removeUserMenuItem = (index) => {
    const next = menu.filter((_, i) => i !== index);
    setMenu(next);
  };

  const moveDashboardItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= dashboardMenu.length) return;
    const next = [...dashboardMenu];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setDashboardMenu(next);
  };

  const removeDashboardItem = (index) => {
    setDashboardMenu(dashboardMenu.filter((_, i) => i !== index));
  };

  return (
    <AdminLayout title="Menu Builder">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        <Card className="glass p-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">User Menu (before/after login)</h2>
            <Button onClick={()=>setMenu([...menu, { name: 'New', path: '/', children: [] }])} className="bg-electric-blue text-black">Add Menu Item</Button>
            <div className="space-y-2 mt-4">
              {menu.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 p-3 rounded space-y-3"
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === idx) return;
                    const m = [...menu];
                    const [moved] = m.splice(dragIndex, 1);
                    m.splice(idx, 0, moved);
                    setMenu(m);
                    setDragIndex(null);
                  }}
                >
                  <div className="grid md:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-400">Label</Label>
                      <Input
                        value={item.name}
                        onChange={(e)=>{ const m=[...menu]; m[idx] = { ...m[idx], name: e.target.value }; setMenu(m); }}
                        className="mt-2 bg-deep-navy border-white/10"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Path</Label>
                      <Input
                        value={item.path}
                        onChange={(e)=>{ const m=[...menu]; m[idx] = { ...m[idx], path: e.target.value }; setMenu(m); }}
                        className="mt-2 bg-deep-navy border-white/10"
                      />
                    </div>
                  </div>
                  <div className="mt-2 border-t border-white/10 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400 text-sm">Dropdown items (optional)</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-dashed border-cyber-purple/50 text-cyber-purple"
                        onClick={() => {
                          const m = [...menu];
                          const children = Array.isArray(m[idx].children) ? [...m[idx].children] : [];
                          children.push({ label: 'Sub item', path: '/' });
                          m[idx] = { ...m[idx], children };
                          setMenu(m);
                        }}
                      >
                        + Add dropdown link
                      </Button>
                    </div>
                    {Array.isArray(item.children) && item.children.length > 0 && (
                      <div className="space-y-2">
                        {item.children.map((child, cIdx) => (
                          <div key={cIdx} className="grid md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                            <div>
                              <Label className="text-xs text-gray-400">Sub label</Label>
                              <Input
                                value={child.label}
                                onChange={(e) => {
                                  const m = [...menu];
                                  const children = Array.isArray(m[idx].children) ? [...m[idx].children] : [];
                                  children[cIdx] = { ...children[cIdx], label: e.target.value };
                                  m[idx] = { ...m[idx], children };
                                  setMenu(m);
                                }}
                                className="mt-1 bg-deep-navy border-white/10 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-400">Sub path</Label>
                              <Input
                                value={child.path}
                                onChange={(e) => {
                                  const m = [...menu];
                                  const children = Array.isArray(m[idx].children) ? [...m[idx].children] : [];
                                  children[cIdx] = { ...children[cIdx], path: e.target.value };
                                  m[idx] = { ...m[idx], children };
                                  setMenu(m);
                                }}
                                className="mt-1 bg-deep-navy border-white/10 h-8 text-xs"
                              />
                            </div>
                            <div className="flex items-end justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-400"
                                onClick={() => {
                                  const m = [...menu];
                                  const children = (Array.isArray(m[idx].children) ? [...m[idx].children] : []).filter((_, j) => j !== cIdx);
                                  m[idx] = { ...m[idx], children };
                                  setMenu(m);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5 mt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => moveUserMenuItem(idx, -1)}
                    >
                      Move up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => moveUserMenuItem(idx, 1)}
                    >
                      Move down
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-red-400"
                      onClick={() => removeUserMenuItem(idx)}
                    >
                      Remove item
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass p-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">User Dashboard Sidebar (after login)</h2>
            <p className="text-sm text-gray-400">Control the left sidebar menu shown to users in the dashboard. Add items, remove, reorder, or add dropdown sub-items for any entry.</p>
            <Button onClick={() => setDashboardMenu([...dashboardMenu, { name: 'New', path: '/dashboard', icon: '', children: [] }])} className="bg-electric-blue text-black">Add Item</Button>
            <div className="space-y-2 mt-4">
              {dashboardMenu.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 p-3 rounded space-y-3"
                  draggable
                  onDragStart={() => setDashboardDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dashboardDragIndex === null || dashboardDragIndex === idx) return;
                    const m = [...dashboardMenu];
                    const [moved] = m.splice(dashboardDragIndex, 1);
                    m.splice(idx, 0, moved);
                    setDashboardMenu(m);
                    setDashboardDragIndex(null);
                  }}
                >
                  <div className="grid md:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-gray-400">Label</Label>
                      <Input
                        value={item.name || ''}
                        onChange={(e) => { const m = [...dashboardMenu]; m[idx] = { ...m[idx], name: e.target.value }; setDashboardMenu(m); }}
                        className="mt-2 bg-deep-navy border-white/10"
                        placeholder="e.g. Dashboard"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Path</Label>
                      <Input
                        value={item.path || ''}
                        onChange={(e) => { const m = [...dashboardMenu]; m[idx] = { ...m[idx], path: e.target.value }; setDashboardMenu(m); }}
                        className="mt-2 bg-deep-navy border-white/10"
                        placeholder="e.g. /dashboard"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">Icon (optional)</Label>
                      <Input
                        value={item.icon || ''}
                        onChange={(e) => { const m = [...dashboardMenu]; m[idx] = { ...m[idx], icon: e.target.value }; setDashboardMenu(m); }}
                        className="mt-2 bg-deep-navy border-white/10"
                        placeholder="e.g. LayoutDashboard"
                      />
                    </div>
                  </div>
                  <div className="mt-2 border-t border-white/10 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400 text-sm">Dropdown sub-items (optional)</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-dashed border-cyber-purple/50 text-cyber-purple"
                        onClick={() => {
                          const m = [...dashboardMenu];
                          const children = Array.isArray(m[idx].children) ? [...m[idx].children] : [];
                          children.push({ name: 'Sub item', path: '/dashboard' });
                          m[idx] = { ...m[idx], children };
                          setDashboardMenu(m);
                        }}
                      >
                        + Add dropdown link
                      </Button>
                    </div>
                    {Array.isArray(item.children) && item.children.length > 0 && (
                      <div className="space-y-2">
                        {item.children.map((child, cIdx) => (
                          <div key={cIdx} className="grid md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                            <div>
                              <Label className="text-xs text-gray-400">Sub label</Label>
                              <Input
                                value={child.name || child.label || ''}
                                onChange={(e) => {
                                  const m = [...dashboardMenu];
                                  const children = Array.isArray(m[idx].children) ? [...m[idx].children] : [];
                                  children[cIdx] = { ...children[cIdx], name: e.target.value };
                                  m[idx] = { ...m[idx], children };
                                  setDashboardMenu(m);
                                }}
                                className="mt-1 bg-deep-navy border-white/10 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-400">Sub path</Label>
                              <Input
                                value={child.path || ''}
                                onChange={(e) => {
                                  const m = [...dashboardMenu];
                                  const children = Array.isArray(m[idx].children) ? [...m[idx].children] : [];
                                  children[cIdx] = { ...children[cIdx], path: e.target.value };
                                  m[idx] = { ...m[idx], children };
                                  setDashboardMenu(m);
                                }}
                                className="mt-1 bg-deep-navy border-white/10 h-8 text-xs"
                              />
                            </div>
                            <div className="flex items-end justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-400"
                                onClick={() => {
                                  const m = [...dashboardMenu];
                                  const children = (Array.isArray(m[idx].children) ? [...m[idx].children] : []).filter((_, j) => j !== cIdx);
                                  m[idx] = { ...m[idx], children };
                                  setDashboardMenu(m);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5 mt-2">
                    <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => moveDashboardItem(idx, -1)}>Move up</Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => moveDashboardItem(idx, 1)}>Move down</Button>
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs text-red-400" onClick={() => removeDashboardItem(idx)}>Remove item</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass p-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Admin Navigation (top bar with dropdowns)</h2>
            <p className="text-sm text-gray-400">
              Reorder, rename, change paths, and even move dropdown items between groups.
            </p>
            <div className="space-y-3 mt-4">
              {adminNav.map((group, gIdx) => (
                <div key={group.id} className="bg-white/5 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{group.label}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => moveAdminGroup(gIdx, -1)}>
                        ↑
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => moveAdminGroup(gIdx, 1)}>
                        ↓
                      </Button>
                    </div>
                  </div>
                  {Array.isArray(group.children) && group.children.length > 0 && (
                    <div className="space-y-1 pl-3 border-l border-white/10">
                      {group.children.map((child, cIdx) => (
                        <div key={child.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-gray-300 py-1">
                          <div className="flex-1 grid sm:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-400">Label</Label>
                              <Input
                                value={child.label}
                                onChange={(e) => updateAdminChildField(gIdx, cIdx, 'label', e.target.value)}
                                className="mt-1 bg-deep-navy border-white/10 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-400">Path</Label>
                              <Input
                                value={child.path}
                                onChange={(e) => updateAdminChildField(gIdx, cIdx, 'path', e.target.value)}
                                className="mt-1 bg-deep-navy border-white/10 h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="bg-deep-navy border border-white/10 rounded px-2 py-1 text-xs text-gray-200"
                              value={group.id}
                              onChange={(e) => moveAdminChildToGroup(gIdx, cIdx, e.target.value)}
                            >
                              {adminNav.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => moveAdminChild(gIdx, cIdx, -1)}>
                                ↑
                              </Button>
                              <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => moveAdminChild(gIdx, cIdx, 1)}>
                                ↓
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Button onClick={saveAll} className="bg-electric-blue text-black">Save All Menus</Button>
      </div>
    </AdminLayout>
  );
};

export default AdminMenu;
