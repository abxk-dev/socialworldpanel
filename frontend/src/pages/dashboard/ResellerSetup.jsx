import React, { useState, useEffect } from 'react';
import { Store, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import api from '../../lib/axios';
import { toast } from 'sonner';

export default function ResellerSetup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState({
    panel_name: '',
    panel_subdomain: '',
    primary_color: '#00d2ff',
    secondary_color: '#7b2cbf',
    default_markup_percent: 30,
    welcome_message: '',
    support_email: '',
  });

  useEffect(() => {
    api
      .get('/reseller/panel-settings')
      .then((r) => {
        if (r.data?.panel) {
          setPanel(r.data.panel);
          setForm((f) => ({ ...f, ...r.data.panel }));
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      const r = await api.post('/reseller/setup', form);
      setPanel(r.data.panel);
      toast.success('Saved');
      if (step < 5) setStep(step + 1);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Reseller Panel">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Store className="text-electric-blue" />
          <span className="font-semibold">White-label setup</span>
        </div>
        <div className="flex gap-2 text-xs text-[var(--text-muted)]">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setStep(s)} className={`px-2 py-1 rounded ${step === s ? 'bg-electric-blue/20 text-electric-blue' : ''}`}>
              Step {s}
            </button>
          ))}
        </div>
        <Card className="glass p-4 border-[var(--border)] space-y-4">
          {step === 1 && (
            <>
              <Label>Panel name</Label>
              <Input value={form.panel_name} onChange={(e) => setForm({ ...form, panel_name: e.target.value })} className="bg-deep-navy" />
              <Label>Subdomain (letters, numbers, dash)</Label>
              <Input value={form.panel_subdomain} onChange={(e) => setForm({ ...form, panel_subdomain: e.target.value })} className="bg-deep-navy" />
            </>
          )}
          {step === 2 && (
            <>
              <Label>Primary color</Label>
              <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
              <Label>Secondary color</Label>
              <Input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
            </>
          )}
          {step === 3 && (
            <>
              <Label>Default markup %</Label>
              <Input
                type="number"
                value={form.default_markup_percent}
                onChange={(e) => setForm({ ...form, default_markup_percent: +e.target.value })}
                className="bg-deep-navy"
              />
            </>
          )}
          {step === 4 && (
            <>
              <Label>Welcome message</Label>
              <Input value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} className="bg-deep-navy" />
              <Label>Support email</Label>
              <Input value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} className="bg-deep-navy" />
            </>
          )}
          {step === 5 && (
            <div className="text-sm text-[var(--text-muted)] space-y-2">
              <p>Review your panel configuration and save to launch.</p>
              <pre className="text-xs bg-[var(--bg-hover)] p-3 rounded-lg overflow-auto">{JSON.stringify(form, null, 2)}</pre>
            </div>
          )}
          <Button onClick={save} disabled={loading} className="bg-electric-blue text-black">
            {loading ? <Loader2 className="animate-spin" /> : step === 5 ? 'Save & finish' : 'Save & continue'}
          </Button>
        </Card>
        {panel && (
          <Card className="glass p-4 border-[var(--border)] text-sm text-[var(--text-muted)]">
            <div className="text-[var(--text-primary)] font-medium mb-2">Dashboard</div>
            <p>Clients: {panel.total_clients ?? 0}</p>
            <p>Revenue tracked: {panel.total_revenue ?? 0}</p>
            <p className="mt-2">Share: {form.panel_subdomain ? `https://${form.panel_subdomain}.yourdomain.com` : 'Set subdomain first'}</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
