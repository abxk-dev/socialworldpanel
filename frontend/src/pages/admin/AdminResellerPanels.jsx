import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../App';

export default function AdminResellerPanels() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const load = () => api.get('/admin/reseller-panels', { headers }).then((r) => setData(r.data));
  useEffect(() => {
    load().catch(() => setData(null));
  }, [token]);
  return (
    <AdminLayout title="Reseller panels">
      <Card className="glass p-4 border-[var(--border)] space-y-3 max-h-[70vh] overflow-auto">
        {(data?.resellers || []).map((p) => (
          <div key={p.reseller_id || p.user_id} className="flex flex-wrap gap-2 items-center border-b border-[var(--border)] pb-2 text-sm">
            <span className="text-[var(--text-primary)]">{p.panel_name}</span>
            <Button size="sm" variant="outline" onClick={() => api.put(`/admin/reseller-panels/${p.reseller_id || p.user_id}/approve`, {}, { headers }).then(load)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => api.put(`/admin/reseller-panels/${p.reseller_id || p.user_id}/suspend`, {}, { headers }).then(load)}>
              Suspend
            </Button>
          </div>
        ))}
        <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </Card>
    </AdminLayout>
  );
}
