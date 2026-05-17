import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../App';

export default function AdminPlatformInvoices() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  useEffect(() => {
    api
      .get('/admin/platform-invoices', { headers })
      .then((r) => setData(r.data))
      .catch(() => setData(null));
  }, [token]);
  return (
    <AdminLayout title="Platform invoices">
      <Card className="glass p-4 border-[var(--border)] space-y-2 max-h-[70vh] overflow-auto">
        <div className="text-[var(--text-muted)] text-sm">Revenue total: {data?.revenue_total}</div>
        {(data?.invoices || []).slice(0, 40).map((inv) => (
          <div key={inv.invoice_id} className="flex justify-between text-sm border-b border-[var(--border)] py-1">
            <span>{inv.invoice_number}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const r = await api.get(`/admin/platform-invoices/${encodeURIComponent(inv.invoice_id)}/download`, {
                    responseType: 'blob',
                    headers,
                  });
                  const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${inv.invoice_number || inv.invoice_id}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  // ignore
                }
              }}
            >
              PDF
            </Button>
          </div>
        ))}
        <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </Card>
    </AdminLayout>
  );
}
