import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth } from '../../App';
import { useCurrency } from '../../context/CurrencyContext';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { FileText, Download, Loader2 } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BillingPage() {
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [receiptFor, setReceiptFor] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/deposits?page=${page}&limit=20`, { headers, withCredentials: true });
      setDeposits(res.data?.deposits || []);
      setTotalPages(res.data?.pages || 1);
    } catch {
      toast.error('Failed to load billing history');
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [page, token]);

  const handlePrintReceipt = (deposit) => {
    setReceiptFor(deposit);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const getStatusClass = (status) => {
    const map = { completed: 'status-completed', pending: 'status-pending', failed: 'status-cancelled' };
    return map[status] || 'status-pending';
  };

  return (
    <DashboardLayout title="Billing">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-electric-blue" />
          Invoices & Billing
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          Payment receipts for your deposits. Use <strong className="text-[var(--text-secondary)]">Print</strong> to save as PDF.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : deposits.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)]">
            No invoices yet. Add funds to see payment receipts here.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="bg-[var(--bg-card)]">
                  <tr>
                    <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Date</th>
                    <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Invoice #</th>
                    <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Description</th>
                    <th className="text-left p-3 text-[var(--text-muted)] font-medium text-sm">Status</th>
                    <th className="text-right p-3 text-[var(--text-muted)] font-medium text-sm">Amount</th>
                    <th className="text-right p-3 text-[var(--text-muted)] font-medium text-sm w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.deposit_id || d._id || `${d.created_at}-${d.payment_type}`} className="border-t border-[var(--border)] hover:bg-[var(--bg-card)]">
                      <td className="p-3 text-[var(--text-muted)] text-sm">{formatDate(d.created_at)}</td>
                      <td className="p-3 font-mono text-sm text-[var(--text-primary)]">{d.deposit_id || d._id || '—'}</td>
                      <td className="p-3 text-[var(--text-primary)] capitalize">{d.method ? `Deposit · ${d.method}` : 'Deposit'}</td>
                      <td className="p-3">
                        <Badge className={`${getStatusClass(d.status)} capitalize text-xs`}>{d.status}</Badge>
                      </td>
                      <td className="p-3 text-right text-neon-green font-semibold">+{formatPrice(d.amount ?? 0)}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[var(--border)] text-xs"
                          onClick={() => handlePrintReceipt(d)}
                        >
                          <Download size={14} className="mr-1" />
                          Print / PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-sm">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="border-[var(--border)]">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="border-[var(--border)]">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Printable receipt — only visible when printing or when receiptFor is set */}
      {receiptFor && (
        <div className="hidden print:block fixed inset-0 z-[100] bg-[var(--bg-primary)] text-[var(--text-primary)] p-8" id="receipt-print">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold border-b border-[var(--border)] pb-2 mb-4">Payment Receipt</h1>
            <div className="space-y-2 text-sm">
              <p><span className="text-[var(--text-muted)]">Invoice #</span> {receiptFor.deposit_id}</p>
              <p><span className="text-[var(--text-muted)]">Date</span> {formatDate(receiptFor.created_at)}</p>
              <p><span className="text-[var(--text-muted)]">Description</span> Deposit · {(receiptFor.method || 'N/A')}</p>
              <p><span className="text-[var(--text-muted)]">Status</span> {receiptFor.status}</p>
              <p><span className="text-[var(--text-muted)]">Amount</span> <strong>{formatPrice(receiptFor.amount ?? 0)}</strong></p>
            </div>
            <p className="mt-8 text-[var(--text-muted)] text-xs">Thank you for your payment.</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </DashboardLayout>
  );
}
