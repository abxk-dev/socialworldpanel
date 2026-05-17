import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import api from '../../lib/axios';

const TYPE_ICON = {
  order_placed: '📦',
  order_completed: '✅',
  order_failed: '❌',
  order_partial: '⚠️',
  low_balance: '💰',
  deposit_received: '💵',
  cashback_earned: '🪙',
  referral_earned: '🔗',
  subscription_expiring: '📅',
  announcement: '📢',
  refill_completed: '🔄',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 3600 * 24) return `${Math.floor(s / 3600)}h ago`;
  if (s < 3600 * 24 * 7) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/notifications');
      setList(res.data?.notifications || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const markRead = async (id) => {
    if (!id) return;
    try {
      await api.post(`/user/notifications/${id}/read`);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/user/notifications/read-all');
      setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  // Ensure newest first even if API changes
  const sorted = [...list].sort((a, b) => {
    const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bd - ad;
  });

  const filtered = sorted.filter((n) => {
    if (typeFilter !== 'all') {
      if (typeFilter === 'payments' && !['deposit_received', 'cashback_earned'].includes(n.type)) return false;
      if (typeFilter === 'orders' && !['order_placed', 'order_completed', 'order_failed', 'order_partial', 'refill_completed'].includes(n.type)) return false;
      if (typeFilter === 'spin' && n.type !== 'spin_reward') return false;
      if (typeFilter === 'other' && ['deposit_received', 'cashback_earned', 'order_placed', 'order_completed', 'order_failed', 'order_partial', 'refill_completed', 'spin_reward'].includes(n.type)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const text = `${n.title || ''} ${n.message || n.content_text || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">All notifications</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Filter by type or search by text.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-deep-navy border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-deep-navy border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-secondary)]"
            >
              <option value="all">All types</option>
              <option value="payments">Payments</option>
              <option value="orders">Orders</option>
              <option value="spin">Spin wheel</option>
              <option value="other">Other</option>
            </select>
            {list.some((n) => !n.is_read) && (
              <Button variant="outline" size="sm" onClick={markAllRead} className="border-[var(--border)]">
                <CheckCheck size={16} className="mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-electric-blue border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">No notifications yet</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((n) => (
                <li key={n.id || n.created_at} className={n.is_read ? '' : 'bg-[var(--bg-card)]'}>
                  <Link
                    to={n.link || '#'}
                    onClick={() => markRead(n.id)}
                    className="flex gap-3 p-4 hover:bg-[var(--bg-card)] block"
                  >
                    <span className="text-2xl shrink-0">{TYPE_ICON[n.type] || '📢'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--text-primary)]">{n.title || 'Notification'}</div>
                      {n.html ? (
                        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-3">
                          <div
                            className="prose prose-invert prose-sm max-w-none text-[var(--text-secondary)] [&_a]:text-electric-blue [&_a]:underline [&_p]:mb-2"
                            dangerouslySetInnerHTML={{ __html: n.html }}
                          />
                        </div>
                      ) : (n.message || n.content_text) && (
                        <div className="text-[var(--text-secondary)] text-sm mt-1 whitespace-pre-wrap break-words">
                          {n.message || n.content_text}
                        </div>
                      )}
                      <div className="text-[var(--text-muted)] text-xs mt-2">{timeAgo(n.created_at)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
