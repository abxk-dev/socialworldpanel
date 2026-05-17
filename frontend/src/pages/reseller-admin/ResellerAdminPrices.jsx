import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import ResellerAdminLayout from '../../components/layouts/ResellerAdminLayout';
import api from '../../lib/axios';
import { useCurrency } from '../../context/CurrencyContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function ResellerAdminPrices() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { formatPrice } = useCurrency();

  const fetchPrices = () => {
    setLoading(true);
    api.get('/reseller/admin/prices')
      .then((res) => setPrices(res.data.prices || []))
      .catch(() => toast.error('Failed to load prices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const updateLocal = (index, field, value) => {
    setPrices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/reseller/admin/prices', {
        prices: prices.map((p) => ({
          service_id: p.service_id,
          reseller_price: p.reseller_price != null ? parseFloat(p.reseller_price) : undefined,
          min_quantity: p.min_quantity != null ? parseInt(p.min_quantity, 10) : undefined,
          max_quantity: p.max_quantity != null ? parseInt(p.max_quantity, 10) : undefined,
          is_enabled: p.is_enabled,
        })),
      });
      toast.success('Prices saved');
      fetchPrices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ResellerAdminLayout title="Prices">
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-[var(--accent,#7c3aed)]" size={32} />
        </div>
      </ResellerAdminLayout>
    );
  }

  return (
    <ResellerAdminLayout title="Service Prices">
      <p className="text-gray-400 text-sm mb-4">Set your selling price per 1000 units. Your price must be at least the SWP cost.</p>
      <div className="mb-4">
        <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: 'var(--accent)' }}>
          <Save size={18} className="mr-2" />
          {saving ? 'Saving...' : 'Save all'}
        </Button>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-3 text-gray-400 font-medium text-sm">Service</th>
              <th className="text-right p-3 text-gray-400 font-medium text-sm">SWP Cost (min)</th>
              <th className="text-right p-3 text-gray-400 font-medium text-sm">Your price</th>
              <th className="text-right p-3 text-gray-400 font-medium text-sm">Min qty</th>
              <th className="text-right p-3 text-gray-400 font-medium text-sm">Max qty</th>
              <th className="text-center p-3 text-gray-400 font-medium text-sm">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p, i) => (
              <tr key={p.service_id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-3 text-white truncate max-w-[200px]" title={p.service_name}>{p.service_name}</td>
                <td className="p-3 text-right text-gray-400">
                  {formatPrice((p.swp_price || 0) / 1000)}
                  <span className="text-xs text-gray-500 block">per 1000</span>
                </td>
                <td className="p-3 text-right">
                  <Input
                    type="number"
                    min={p.swp_price}
                    step="0.0001"
                    className="w-24 text-right bg-white/5 border-white/10 h-8 inline-block"
                    value={p.reseller_price ?? ''}
                    onChange={(e) => updateLocal(i, 'reseller_price', e.target.value)}
                  />
                  <span className="text-xs text-gray-500 block">Min: {formatPrice((p.swp_price || 0) / 1000)}</span>
                </td>
                <td className="p-3 text-right">
                  <Input
                    type="number"
                    min={1}
                    className="w-20 text-right bg-white/5 border-white/10 h-8 inline-block"
                    value={p.min_quantity ?? ''}
                    onChange={(e) => updateLocal(i, 'min_quantity', e.target.value)}
                  />
                </td>
                <td className="p-3 text-right">
                  <Input
                    type="number"
                    min={1}
                    className="w-20 text-right bg-white/5 border-white/10 h-8 inline-block"
                    value={p.max_quantity ?? ''}
                    onChange={(e) => updateLocal(i, 'max_quantity', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={p.is_enabled !== false}
                    onChange={(e) => updateLocal(i, 'is_enabled', e.target.checked)}
                    className="rounded border-white/20"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {prices.length === 0 && <p className="text-gray-500 mt-4">No services to price.</p>}
    </ResellerAdminLayout>
  );
}
