import React, { useState, useEffect } from 'react';
import { Users, ShoppingCart, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import ResellerAdminLayout from '../../components/layouts/ResellerAdminLayout';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';

export default function ResellerAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    api.get('/reseller/admin/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ResellerAdminLayout title="Dashboard">
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-[var(--accent,#7c3aed)]" size={32} />
        </div>
      </ResellerAdminLayout>
    );
  }

  if (!data) {
    return (
      <ResellerAdminLayout title="Dashboard">
        <p className="text-gray-400">Failed to load dashboard.</p>
      </ResellerAdminLayout>
    );
  }

  const cards = [
    { label: 'Total Users', value: data.total_users ?? 0, icon: Users },
    { label: 'Total Orders', value: data.total_orders ?? 0, icon: ShoppingCart },
    { label: 'Total Revenue', value: formatPrice(data.total_revenue ?? 0), icon: DollarSign },
    { label: 'Total Profit', value: formatPrice(data.total_profit ?? 0), icon: TrendingUp },
  ];

  return (
    <ResellerAdminLayout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Icon size={18} />
              {label}
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3">Orders by status</h3>
          <ul className="space-y-2 text-sm">
            {Object.entries(data.orders_by_status || {}).map(([status, count]) => (
              <li key={status} className="flex justify-between text-gray-300">
                <span className="capitalize">{status}</span>
                <span className="text-white">{count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3">Recent orders</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(data.recent_orders || []).slice(0, 10).map((o) => (
              <div key={o.order_id || o._id} className="flex justify-between text-sm text-gray-300 border-b border-white/5 pb-1">
                <span className="truncate">{o.service_name}</span>
                <span className="text-white">{o.quantity}</span>
              </div>
            ))}
            {(!data.recent_orders || data.recent_orders.length === 0) && (
              <p className="text-gray-500 text-sm">No orders yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-3">Recent users</h3>
        <div className="space-y-2">
          {(data.recent_users || []).map((u) => (
            <div key={u._id} className="flex justify-between text-sm text-gray-300">
              <span>{u.email}</span>
              <span className="text-white">{formatPrice(u.balance ?? 0)}</span>
            </div>
          ))}
          {(!data.recent_users || data.recent_users.length === 0) && (
            <p className="text-gray-500 text-sm">No users yet.</p>
          )}
        </div>
      </div>
    </ResellerAdminLayout>
  );
}
