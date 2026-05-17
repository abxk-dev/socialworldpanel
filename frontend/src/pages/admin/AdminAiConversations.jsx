import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../App';

export default function AdminAiConversations() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => {
    api
      .get('/admin/ai-conversations', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => setData(r.data))
      .catch(() => setData(null));
  }, [token]);
  return (
    <AdminLayout title="AI conversations">
      <Card className="glass p-4 border-[var(--border)] space-y-2 text-sm max-h-[70vh] overflow-auto">
        <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </Card>
    </AdminLayout>
  );
}
