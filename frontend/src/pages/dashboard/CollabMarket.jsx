import React, { useState, useEffect } from 'react';
import { Handshake, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import api from '../../lib/axios';
import { toast } from 'sonner';

const NICHES = ['food', 'fitness', 'tech', 'fashion', 'gaming', 'travel', 'music', 'beauty', 'general'];

export default function CollabMarket() {
  const [tab, setTab] = useState('browse');
  const [listings, setListings] = useState([]);
  const [mine, setMine] = useState([]);
  const [apps, setApps] = useState([]);
  const [filters, setFilters] = useState({ platform: '', niche: '', search: '' });
  const [form, setForm] = useState({
    title: '',
    description: '',
    collab_type: 'shoutout_exchange',
    platform: 'instagram',
    niche: 'general',
    my_follower_count: 1000,
    requirement_min_followers: 500,
    slots_available: 3,
    profile_link: '',
    sample_content_url: '',
  });
  const [loading, setLoading] = useState(false);

  const loadBrowse = async () => {
    const r = await api.get('/collab/listings', { params: filters });
    setListings(r.data?.listings || []);
  };

  useEffect(() => {
    if (tab === 'browse') loadBrowse().catch(() => setListings([]));
    if (tab === 'mine')
      api
        .get('/collab/my-listings')
        .then((r) => setMine(r.data?.listings || []))
        .catch(() => setMine([]));
    if (tab === 'applications')
      api
        .get('/collab/my-applications')
        .then((r) => setApps(r.data?.applications || []))
        .catch(() => setApps([]));
  }, [tab, filters.platform, filters.niche, filters.search]);

  const createListing = async () => {
    setLoading(true);
    try {
      await api.post('/collab/listings', form);
      toast.success('Listing created');
      setTab('mine');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Collab Market">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-2">
          {['browse', 'create', 'mine', 'applications'].map((t) => (
            <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className={tab === t ? 'bg-electric-blue text-black capitalize' : 'capitalize'}>
              {t}
            </Button>
          ))}
        </div>

        {tab === 'browse' && (
          <div className="grid lg:grid-cols-4 gap-4">
            <Card className="glass p-3 border-[var(--border)] space-y-2 h-fit">
              <Label className="text-xs">Platform</Label>
              <Input value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value })} placeholder="instagram" className="bg-deep-navy text-sm" />
              <Label className="text-xs">Niche</Label>
              <select
                className="w-full rounded border border-[var(--border)] bg-deep-navy p-2 text-sm"
                value={filters.niche}
                onChange={(e) => setFilters({ ...filters, niche: e.target.value })}
              >
                <option value="">All</option>
                {NICHES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <Label className="text-xs">Search</Label>
              <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="bg-deep-navy text-sm" />
            </Card>
            <div className="lg:col-span-3 space-y-3">
              {listings.map((L) => (
                <Card key={L.listing_id} className="glass p-4 border-[var(--border)]">
                  <div className="flex justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{L.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {L.platform} · {L.niche} · {L.collab_type}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyber-purple text-cyber-purple"
                      onClick={() => api.post(`/collab/listings/${L.listing_id}/apply`, { message: 'Interested!', applicant_follower_count: 0 }).then(() => toast.success('Applied'))}
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-3">{L.description}</p>
                </Card>
              ))}
              {listings.length === 0 && <p className="text-[var(--text-muted)] text-sm">No listings.</p>}
            </div>
          </div>
        )}

        {tab === 'create' && (
          <Card className="glass p-4 border-[var(--border)] space-y-3 max-w-xl">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
              <Handshake size={18} className="text-electric-blue" />
              New listing
            </div>
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-deep-navy" />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-deep-navy" />
            <Button onClick={createListing} disabled={loading} className="bg-electric-blue text-black">
              {loading ? <Loader2 className="animate-spin" /> : 'Publish'}
            </Button>
          </Card>
        )}

        {tab === 'mine' && (
          <div className="space-y-2">
            {mine.map((L) => (
              <Card key={L.listing_id} className="glass p-3 border-[var(--border)] text-sm text-[var(--text-primary)]">
                {L.title} — {L.applications_count || 0} applications
              </Card>
            ))}
          </div>
        )}

        {tab === 'applications' && (
          <div className="space-y-2">
            {apps.map((a) => (
              <Card key={a.application_id} className="glass p-3 border-[var(--border)] text-sm">
                <span className="text-[var(--text-primary)]">{a.listing_id}</span>
                <span className="text-[var(--text-muted)] ml-2">{a.status}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
