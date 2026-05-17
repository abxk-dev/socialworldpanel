import React, { useState } from 'react';
import { HeartPulse, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import api from '../../lib/axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'twitter'];

const bandColor = (c) =>
  ({ red: 'bg-red-500', yellow: 'bg-amber-400', blue: 'bg-sky-500', green: 'bg-emerald-500' }[c] || 'bg-slate-500');

export default function HealthScore() {
  const [platform, setPlatform] = useState('instagram');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const analyze = async () => {
    if (!username.trim()) {
      toast.error('Enter username or URL');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/health-score/analyze', { platform, username: username.trim() });
      setResult(res.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const overall = result?.scores?.overall ?? 0;
  const band = result?.score_bands?.overall;

  return (
    <DashboardLayout title="Social Health Score">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`px-4 py-2 rounded-xl text-sm capitalize border ${
                platform === p ? 'border-electric-blue bg-electric-blue/10 text-electric-blue' : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <Card className="glass p-4 border-[var(--border)] flex flex-col sm:flex-row gap-3">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@handle or profile URL"
            className="bg-deep-navy border-[var(--border)] flex-1"
          />
          <Button onClick={analyze} disabled={loading} className="bg-electric-blue text-black shrink-0">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <HeartPulse size={18} className="mr-2" />}
            Analyze
          </Button>
        </Card>

        {result && (
          <>
            <div className="flex flex-col items-center justify-center py-8">
              <div
                className="relative w-40 h-40 rounded-full flex items-center justify-center text-4xl font-black text-[var(--text-primary)] border-8 border-[var(--border)]"
                style={{
                  background: `conic-gradient(var(--electric-blue, #00d2ff) ${overall * 3.6}deg, var(--bg-hover) 0)`,
                }}
              >
                <div className="absolute inset-3 rounded-full bg-[var(--bg-card)] flex flex-col items-center justify-center">
                  <span>{overall}</span>
                  <span className="text-xs text-[var(--text-muted)]">{band?.label}</span>
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {['engagement', 'growth', 'profile', 'content'].map((key) => {
                const v = result.scores?.[key] ?? 0;
                const b = result.score_bands?.[key];
                return (
                  <Card key={key} className="glass p-4 border-[var(--border)]">
                    <div className="flex justify-between text-sm mb-2 capitalize">
                      <span className="text-[var(--text-primary)] font-medium">{key} score</span>
                      <span className="text-[var(--text-muted)]">{b?.label}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                      <div className={`h-full ${bandColor(b?.color)}`} style={{ width: `${v}%` }} />
                    </div>
                    <div className="text-right text-xs text-[var(--text-muted)] mt-1">{v}/100</div>
                  </Card>
                );
              })}
            </div>
            <Card className="glass p-4 border-[var(--border)]">
              <h3 className="text-[var(--text-primary)] font-semibold mb-3">Recommendations</h3>
              <div className="space-y-2">
                {(result.recommendations || []).map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg-hover)]">
                    <div>
                      <div className="text-sm text-[var(--text-primary)]">{r.service_name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{r.reason}</div>
                    </div>
                    {r.service_id && (
                      <Button size="sm" variant="outline" className="border-neon-green text-neon-green" onClick={() => navigate(`/dashboard/new-order?service_id=${r.service_id}`)}>
                        Order now
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
            {result.history?.length > 0 && (
              <Card className="glass p-4 border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Recent analyses</h3>
                <ul className="text-xs text-[var(--text-muted)] space-y-1">
                  {result.history.map((h, i) => (
                    <li key={i}>
                      {h.platform} · {h.username || '—'} · {h.scores?.overall ?? '—'} — {new Date(h.analyzed_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
