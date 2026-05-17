import React, { useState, useEffect } from 'react';
import { Receipt, Download, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import api from '../../lib/axios';
import { toast } from 'sonner';
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/invoices');
      setInvoices(r.data?.invoices || []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (id) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };

  const downloadOne = async (invoiceId) => {
    try {
      const r = await api.get(`/invoices/${encodeURIComponent(invoiceId)}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const bulkZip = async () => {
    if (selected.size === 0) {
      toast.error('Select invoices');
      return;
    }
    try {
      const r = await api.post(
        '/invoices/bulk-download',
        { invoice_ids: Array.from(selected) },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoices.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Bulk download failed');
    }
  };

  return (
    <DashboardLayout title="Invoices">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="glass p-4 border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
            <Receipt className="text-electric-blue" />
            Your invoices
          </div>
          <Button size="sm" onClick={bulkZip} className="bg-neon-green/20 text-neon-green border border-neon-green/30" disabled={selected.size === 0}>
            Download selected (ZIP)
          </Button>
        </Card>
        {loading ? (
          <Loader2 className="animate-spin mx-auto text-electric-blue" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)] text-[var(--text-muted)]">
                <tr>
                  <th className="p-2 w-10" />
                  <th className="p-2 text-left">Invoice</th>
                  <th className="p-2 text-left">Order</th>
                  <th className="p-2 text-left">Service</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.invoice_id} className="border-t border-[var(--border)]">
                    <td className="p-2">
                      <Checkbox checked={selected.has(inv.invoice_id)} onCheckedChange={() => toggle(inv.invoice_id)} />
                    </td>
                    <td className="p-2 text-[var(--text-primary)] font-mono text-xs">{inv.invoice_number}</td>
                    <td className="p-2 text-[var(--text-muted)]">{inv.order_id}</td>
                    <td className="p-2 text-[var(--text-secondary)] truncate max-w-[180px]">{inv.service_name}</td>
                    <td className="p-2 text-right text-electric-blue">{Number(inv.total_amount).toFixed(2)}</td>
                    <td className="p-2 text-[var(--text-muted)] text-xs">{(inv.issued_date || '').slice(0, 10)}</td>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={() => downloadOne(inv.invoice_id)}>
                        <Download size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
