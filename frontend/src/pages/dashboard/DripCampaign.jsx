import React, { useState, useEffect, useMemo } from 'react';
import { Timer, Loader2, Pause, Play, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import api from '../../lib/axios';
import { toast } from 'sonner';

export default function DripCampaign() {
  const [services, setServices] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [link, setLink] = useState('');
  const [totalQty, setTotalQty] = useState(1000);
  const [days, setDays] = useState(7);
  const [hourStart, setHourStart] = useState(9);
  const [hourEnd, setHourEnd] = useState(17);
  const [loading, setLoading] = useState(false);

  const daily = useMemo(() => Math.max(1, Math.ceil(totalQty / days)), [totalQty, days]);

  useEffect(() => {
    api
      .get('/services')
      .then((r) => setServices(r.data?.services || r.data || []))
      .catch(() => setServices([]));
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const r = await api.get('/drip/campaigns');
      setCampaigns(r.data?.campaigns || []);
    } catch {
      setCampaigns([]);
    }
  };

  const create = async () => {
    if (!serviceId || !link) {
      toast.error('Service and link required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/drip/create', {
        service_id: serviceId,
        link,
        total_quantity: totalQty,
        duration_days: days,
        preferred_hour_start: hourStart,
        preferred_hour_end: hourEnd,
      });
      toast.success('Campaign created');
      loadCampaigns();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Drip Campaigns">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="glass p-4 border-[var(--border)] space-y-4">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
            <Timer className="text-electric-blue" size={20} />
            New drip campaign
          </div>
          <div>
            <Label className="text-[var(--text-muted)]">Service</Label>
            <select
              className="w-full mt-1 rounded-lg border border-[var(--border)] bg-deep-navy p-2 text-sm text-[var(--text-primary)]"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Select…</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {s.name || s.service_name} (#{s.service_id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[var(--text-muted)]">Profile / content link</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} className="mt-1 bg-deep-navy border-[var(--border)]" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Total quantity ({totalQty})</Label>
              <input type="range" min={100} max={50000} step={100} value={totalQty} onChange={(e) => setTotalQty(+e.target.value)} className="w-full" />
            </div>
            <div>
              <Label>Duration ({days} days)</Label>
              <input type="range" min={3} max={90} value={days} onChange={(e) => setDays(+e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Delivery window start (UTC hour)</Label>
              <Input type="number" min={0} max={23} value={hourStart} onChange={(e) => setHourStart(+e.target.value)} className="bg-deep-navy" />
            </div>
            <div>
              <Label>Delivery window end (UTC hour)</Label>
              <Input type="number" min={0} max={23} value={hourEnd} onChange={(e) => setHourEnd(+e.target.value)} className="bg-deep-navy" />
            </div>
          </div>
          <Card className="p-3 bg-[var(--bg-hover)] border-[var(--border)] text-sm text-[var(--text-muted)]">
            ~<strong className="text-[var(--text-primary)]">{daily}</strong> units per day on average over {days} days.
          </Card>
          <Button onClick={create} disabled={loading} className="bg-electric-blue text-black">
            {loading ? <Loader2 className="animate-spin" /> : 'Create campaign'}
          </Button>
        </Card>

        <div className="space-y-3">
          <h3 className="text-[var(--text-primary)] font-semibold">Active campaigns</h3>
          {campaigns.length === 0 && <p className="text-[var(--text-muted)] text-sm">No campaigns yet.</p>}
          {campaigns.map((c) => {
            const pct = c.total_quantity ? Math.min(100, (c.delivered_quantity / c.total_quantity) * 100) : 0;
            return (
              <Card key={c.campaign_id} className="glass p-4 border-[var(--border)]">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{c.service_name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{c.status}</div>
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'active' ? (
                      <Button size="sm" variant="outline" onClick={() => api.put(`/drip/campaigns/${c.campaign_id}/pause`).then(loadCampaigns)}>
                        <Pause size={14} />
                      </Button>
                    ) : c.status === 'paused' ? (
                      <Button size="sm" variant="outline" onClick={() => api.put(`/drip/campaigns/${c.campaign_id}/resume`).then(loadCampaigns)}>
                        <Play size={14} />
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" className="text-red-400" onClick={() => api.delete(`/drip/campaigns/${c.campaign_id}`).then(loadCampaigns)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-hover)] mt-3 overflow-hidden">
                  <div className="h-full bg-electric-blue" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {c.delivered_quantity} / {c.total_quantity} · ends {new Date(c.end_date).toLocaleDateString()}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
