import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../App';

export default function AdminCollabListings() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const load = () => api.get('/admin/collab-listings', { headers }).then((r) => setData(r.data));
  useEffect(() => {
    load().catch(() => setData(null));
  }, [token]);
  return (
    <AdminLayout title="Collab listings">
      <Card className="glass p-4 border-[var(--border)] space-y-2 max-h-[70vh] overflow-auto">
        {(data?.listings || []).slice(0, 30).map((L) => (
          <div key={L.listing_id} className="flex flex-wrap gap-2 text-sm border-b border-[var(--border)] pb-2">
            <span className="text-[var(--text-primary)]">{L.title}</span>
            <Button size="sm" variant="outline" onClick={() => api.put(`/admin/collab-listings/${L.listing_id}/approve`, {}, { headers }).then(load)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => api.put(`/admin/collab-listings/${L.listing_id}/remove`, {}, { headers }).then(load)}>
              Remove
            </Button>
          </div>
        ))}
        <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </Card>
    </AdminLayout>
  );
}
