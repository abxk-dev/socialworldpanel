import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../App';

export default function AdminHealthScores() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => {
    api
      .get('/admin/health-scores', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => setData(r.data))
      .catch(() => setData(null));
  }, [token]);
  return (
    <AdminLayout title="Health scores">
      <Card className="glass p-4 border-[var(--border)] max-h-[70vh] overflow-auto">
        <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </Card>
    </AdminLayout>
  );
}
