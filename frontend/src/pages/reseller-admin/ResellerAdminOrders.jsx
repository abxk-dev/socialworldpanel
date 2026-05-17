import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ResellerAdminLayout from '../../components/layouts/ResellerAdminLayout';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { Button } from '../../components/ui/button';

export default function ResellerAdminOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (status) params.status = status;
    api.get('/reseller/admin/orders', { params })
      .then((res) => {
        setOrders(res.data.orders || []);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [page, status]);

  const pages = Math.ceil(total / 20) || 1;

  return (
    <ResellerAdminLayout title="Orders">
      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          variant={status === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setStatus(''); setPage(1); }}
          style={status === '' ? { backgroundColor: 'var(--accent)' } : {}}
        >
          All
        </Button>
        {['pending', 'processing', 'completed', 'failed'].map((s) => (
          <Button
            key={s}
            variant={status === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatus(s); setPage(1); }}
            style={status === s ? { backgroundColor: 'var(--accent)' } : {}}
          >
            {s}
          </Button>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[var(--accent,#7c3aed)]" size={28} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Order ID</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Customer</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Service</th>
                    <th className="text-right p-3 text-gray-400 font-medium text-sm">Qty</th>
                    <th className="text-right p-3 text-gray-400 font-medium text-sm">Charge</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Status</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">No orders.</td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.order_id || o._id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-3 text-white font-mono text-sm">{o.order_id || o._id}</td>
                        <td className="p-3 text-gray-300">{o.reseller_user_email || '—'}</td>
                        <td className="p-3 text-gray-300 truncate max-w-[180px]">{o.service_name}</td>
                        <td className="p-3 text-right text-gray-400">{o.quantity}</td>
                        <td className="p-3 text-right text-neon-green">{formatPrice(o.charge ?? 0)}</td>
                        <td className="p-3">
                          <span className={`capitalize px-2 py-0.5 rounded text-xs ${
                            o.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            o.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-white/10 text-gray-300'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-sm">
                          {o.created_at ? new Date(o.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 p-3 border-t border-white/10">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="px-3 py-1 text-gray-400 text-sm">Page {page} of {pages}</span>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </ResellerAdminLayout>
  );
}
