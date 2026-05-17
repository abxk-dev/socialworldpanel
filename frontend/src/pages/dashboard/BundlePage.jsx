import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Link as LinkIcon } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { useAuth } from '../../App';

const BundlePage = () => {
  const navigate = useNavigate();
  const { token, refreshUser } = useAuth();
  const [bundles, setBundles] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [bundleQuantity, setBundleQuantity] = useState(1);
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const res = await api.get('/bundles', { withCredentials: true });
        setBundles(res.data?.bundles || []);
      } catch {
        setBundles([]);
      }
    };
    fetchBundles();
  }, []);

  const openBundle = (bundle) => {
    setSelectedBundle(bundle);
    setBundleQuantity(1);
  };

  const totalPrice = selectedBundle
    ? (Number(selectedBundle.price || 0) * Number(bundleQuantity || 0) || 0)
    : 0;

  const handlePlaceBundle = async () => {
    if (!selectedBundle) return;
    if (!link.trim()) {
      toast.error('Please enter the link for this bundle');
      return;
    }
    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const body = {
        bundle_id: selectedBundle._id,
        quantity: bundleQuantity,
        link: link.trim(),
      };
      const res = await api.post('/orders/bundle', body, { headers, withCredentials: true });
      toast.success(res.data?.message || 'Bundle ordered successfully');
      if (refreshUser) {
        try {
          await refreshUser();
        } catch {}
      }
      navigate('/dashboard/orders');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to place bundle';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Build Bundle">
      <Toaster position="top-right" theme="dark" />
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-[var(--text-muted)] text-sm">
          These Boost Bundles are created by the admin. Pick a bundle, enter your link and quantity, and place a single combined order.
        </p>

        <Card className="glass border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-cyber-purple" />
              <div>
                <h2 className="text-[var(--text-primary)] font-exo font-semibold text-sm sm:text-base">
                  Boost Bundles
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Ready-made combinations of multiple services for a single fixed price.
                </p>
              </div>
            </div>
          </div>
          {bundles.length === 0 ? (
            <div className="p-6 text-sm text-[var(--text-muted)]">
              No bundles are available yet. Please check again later.
            </div>
          ) : (
            <div className="p-4 grid gap-3 sm:grid-cols-2">
              {bundles.map((b) => (
                <div
                  key={b._id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {b.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-purple/15 text-cyber-purple font-medium">
                        ${Number(b.price || 0).toFixed(2)}
                      </span>
                    </div>
                    {b.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                        {b.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(b.services || []).map((s, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[10px] text-[var(--text-secondary)]"
                        >
                          {s.service_name || 'Service'} · {s.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      className="bg-cyber-purple hover:bg-cyber-purple/90 text-xs"
                      onClick={() => openBundle(b)}
                    >
                      Select Bundle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {selectedBundle && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold text-base flex items-center gap-2">
                  <Package size={18} className="text-cyber-purple" />
                  {selectedBundle.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  ${Number(selectedBundle.price || 0).toFixed(2)} per order
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                onClick={() => setSelectedBundle(null)}
              >
                Close
              </Button>
            </div>

            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Includes:</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto text-[11px] text-[var(--text-secondary)]">
                {(selectedBundle.services || []).map((s, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <span className="text-cyber-purple">✓</span>
                    <span>
                      {s.service_name || 'Service'} — {s.quantity} per order
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Link</p>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="Paste the post/profile link"
                    className="pl-10 bg-deep-navy border-[var(--border)]"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Quantity</p>
                <Input
                  type="number"
                  min={1}
                  value={bundleQuantity}
                  onChange={(e) => setBundleQuantity(Number(e.target.value) || 1)}
                  className="bg-deep-navy border-[var(--border)]"
                />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Total: <span className="text-[var(--text-primary)] font-semibold">${totalPrice.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <Button
              className="w-full mt-2 bg-neon-green hover:bg-neon-green/90 text-black font-bold"
              onClick={handlePlaceBundle}
              disabled={submitting}
            >
              {submitting ? 'Placing...' : 'Place Bundle Order'}
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BundlePage;

