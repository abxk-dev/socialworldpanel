import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../App';

export default function AdminGamification() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [lb, setLb] = useState(null);
  const [uid, setUid] = useState('');
  const [amt, setAmt] = useState('100');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const load = () => {
    api.get('/admin/gamification', { headers }).then((r) => setData(r.data));
    api.get('/admin/gamification/leaderboard', { headers }).then((r) => setLb(r.data));
  };
  useEffect(() => {
    load();
  }, [token]);
  return (
    <AdminLayout title="Gamification">
      <div className="space-y-4 max-w-3xl">
        <Card className="glass p-4 border-[var(--border)] space-y-2">
          <div className="text-sm text-[var(--text-primary)] font-medium">Award XP</div>
          <Input placeholder="user_id" value={uid} onChange={(e) => setUid(e.target.value)} className="bg-deep-navy" />
          <Input placeholder="amount" value={amt} onChange={(e) => setAmt(e.target.value)} className="bg-deep-navy" />
          <Button
            onClick={() =>
              api
                .post('/admin/gamification/award-xp', { user_id: uid, amount: Number(amt), reason: 'admin' }, { headers })
                .then(load)
            }
          >
            Award
          </Button>
        </Card>
        <Card className="glass p-4 border-[var(--border)] max-h-[50vh] overflow-auto">
          <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify({ config: data, leaderboard: lb }, null, 2)}</pre>
        </Card>
      </div>
    </AdminLayout>
  );
}
