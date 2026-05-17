import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      setTemplates(res.data?.templates || []);
    } catch {
      setTemplates([]);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleUse = async (id) => {
    try {
      await api.post(`/templates/${id}/use`);
      fetchTemplates();
    } catch {}
  };

  const mostUsed = templates.length ? Math.max(...templates.map((t) => t.use_count || 0)) : 0;

  return (
    <DashboardLayout title="Templates">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-[var(--text-muted)] text-sm">Load a template on the New Order page to pre-fill the form.</p>
          <Link to="/dashboard/new-order">
            <Button className="bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30">
              <Plus size={18} className="mr-2" />
              New Order
            </Button>
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full" />
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-8 text-center text-[var(--text-muted)]">
            No saved templates. Place an order and choose &quot;Save as Template&quot; to create one.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Card key={t.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{t.name}</h3>
                  {(t.use_count || 0) >= mostUsed && mostUsed > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-neon-green/20 text-neon-green">Most used</span>
                  )}
                </div>
                <div className="text-[var(--text-muted)] text-sm mt-1">Service ID: {t.service_id}</div>
                <div className="text-[var(--text-muted)] text-sm truncate mt-0.5">{t.link}</div>
                <div className="text-electric-blue font-medium mt-1">Qty: {(t.quantity || 0).toLocaleString()}</div>
                <div className="flex gap-2 mt-4">
                  <Link to={`/dashboard/new-order?template=${t.id}`} className="flex-1" onClick={() => handleUse(t.id)}>
                    <Button size="sm" className="w-full bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30">
                      <ShoppingCart size={14} className="mr-2" />
                      Order Now
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(t.id)}
                    className="text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error-bg)]"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
