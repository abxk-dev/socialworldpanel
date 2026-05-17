import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RefreshCw, Loader2 } from 'lucide-react';
import api from '../lib/axios';
import { toast } from 'sonner';
import { useCurrency } from '../context/CurrencyContext';

export default function ReorderModal({ orderId, onClose, onSuccess }) {
  const { formatPrice } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    api
      .get(`/orders/${orderId}/reorder-data`, { withCredentials: true })
      .then((res) => {
        const d = res.data;
        setData(d);
        setLink(d.prefill?.link ?? '');
        setQuantity(d.prefill?.quantity ?? 0);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to load order');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const service = data?.service;
  const minOrder = service?.min_order ?? 0;
  const maxOrder = service?.max_order ?? 1000000;
  const rate = service?.price_per_1000 ?? 0;
  const safeQty = Math.min(maxOrder, Math.max(minOrder, parseInt(quantity, 10) || minOrder));
  const newCharge = rate > 0 ? parseFloat(((rate * safeQty) / 1000).toFixed(4)) : 0;
  const balance = data?.user_balance ?? 0;
  const afterBalance = balance - newCharge;
  const hasSufficientBalance = data?.has_sufficient_balance !== false && afterBalance >= 0;
  const canPlace = data?.service_available && hasSufficientBalance && (link || '').trim().length > 0;

  const handleConfirm = async () => {
    if (!canPlace || !orderId) return;
    setSubmitting(true);
    try {
      const res = await api.post(
        `/orders/${orderId}/reorder`,
        { link: link.trim(), quantity: safeQty },
        { withCredentials: true }
      );
      toast.success(res.data?.message || `Order placed! #${res.data?.new_order_id}`);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="glass border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <RefreshCw size={20} />
            Reorder
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-cyber-purple" />
          </div>
        ) : !data ? (
          <p className="text-gray-400">Could not load order data.</p>
        ) : (
          <div className="space-y-4 pt-2">
            {!data.service_available && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                This service is no longer available.
              </div>
            )}
            {data.service_available && !hasSufficientBalance && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                Insufficient balance — <Link to="/dashboard/add-funds" className="underline">Add Funds</Link>
              </div>
            )}
            {data.price_changed && data.service_available && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  data.price_direction === 'up'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-neon-green/10 border border-neon-green/30 text-neon-green'
                }`}
              >
                {data.price_direction === 'up'
                  ? '⚠️ Price increased since your last order'
                  : '✅ Price dropped since your last order!'}
              </div>
            )}

            <div>
              <Label className="text-gray-400">Service</Label>
              <p className="text-white font-medium mt-1">{data.prefill?.service_name ?? '—'}</p>
            </div>
            <div>
              <Label className="text-gray-400">Link</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="mt-1 bg-deep-navy border-white/10"
                disabled={!data.service_available}
              />
            </div>
            <div>
              <Label className="text-gray-400">Quantity</Label>
              <Input
                type="number"
                min={minOrder}
                max={maxOrder}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 bg-deep-navy border-white/10"
                disabled={!data.service_available}
              />
              <p className="text-xs text-gray-500 mt-1">Min: {minOrder} · Max: {maxOrder.toLocaleString()}</p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Original</span>
                <span className="text-gray-400">{formatPrice(data.original_charge ?? 0)}</span>
              </div>
              {data.price_changed && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Now</span>
                  <span className="text-electric-blue">{formatPrice(newCharge)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span className="text-white">Total</span>
                <span className="text-electric-blue">{formatPrice(newCharge)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Balance</span>
                <span className="text-white">{formatPrice(balance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">After order</span>
                <span className={afterBalance >= 0 ? 'text-neon-green' : 'text-red-400'}>
                  {formatPrice(afterBalance)}
                </span>
              </div>
            </div>
          </div>
        )}

        {data && (
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="border-white/10">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canPlace || submitting}
              className="bg-cyber-purple hover:bg-cyber-purple/90"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <RefreshCw size={16} className="mr-2" />
              )}
              Place Order {newCharge > 0 ? formatPrice(newCharge) : ''}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
