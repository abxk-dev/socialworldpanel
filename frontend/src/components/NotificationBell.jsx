import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/axios';
import { useSettings } from '../App';

const POPUP_COUNT_KEY = 'sw_notification_popup_count';

function getPopupCounts() {
  try {
    const raw = localStorage.getItem(POPUP_COUNT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setPopupCount(notificationId, count) {
  const key = String(notificationId ?? '');
  if (!key) return;
  const counts = getPopupCounts();
  counts[key] = count;
  try {
    localStorage.setItem(POPUP_COUNT_KEY, JSON.stringify(counts));
  } catch {}
}

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
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationBell() {
  const { settings } = useSettings();
  const [list, setList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reorderAlertCount, setReorderAlertCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const prevUnreadRef = useRef(0);

  const fetchList = async () => {
    try {
      const res = await api.get('/user/notifications');
      setList(res.data?.notifications || []);
    } catch {
      setList([]);
    }
  };

  const fetchUnread = async () => {
    try {
      const res = await api.get('/user/notifications/unread-count');
      const count = res.data?.count ?? 0;
      setUnreadCount(count);
      return count;
    } catch {
      setUnreadCount(0);
      return 0;
    }
  };

  const fetchReorderAlerts = async () => {
    try {
      const res = await api.get('/reorder-alerts/unread-count');
      setReorderAlertCount(Number(res.data?.count) || 0);
    } catch {
      setReorderAlertCount(0);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const count = await fetchUnread();
      await fetchReorderAlerts();
      await fetchList();
      prevUnreadRef.current = count;
    })();
    const t = setInterval(async () => {
      const count = await fetchUnread();
      await fetchReorderAlerts();
      await fetchList();
      if (mounted && count > prevUnreadRef.current) {
        prevUnreadRef.current = count;
        const res = await api.get('/user/notifications');
        const notifications = res.data?.notifications || [];
        const latest = notifications.find((n) => !n.is_read) || notifications[0];
        if (latest) {
          const limit = settings?.notification_popup_limit ?? 1;
          const notifKey = String(latest.id ?? latest.created_at ?? '');
          const counts = getPopupCounts();
          const shown = counts[notifKey] ?? 0;
          if (limit === 0 || shown < limit) {
            toast(latest.title || 'Notification', {
              description: latest.message || '',
            });
            setPopupCount(notifKey, shown + 1);
          }
        }
      } else if (mounted) {
        prevUnreadRef.current = count;
      }
    }, 30000);
    return () => { mounted = false; clearInterval(t); };
  }, [settings]);

  useEffect(() => {
    if (open) fetchList();
  }, [open]);

  const markRead = async (id) => {
    if (!id) return;
    try {
      await api.post(`/user/notifications/${id}/read`);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.post('/user/notifications/read-all');
      setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {(unreadCount + reorderAlertCount) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {(unreadCount + reorderAlertCount) > 99 ? '99+' : (unreadCount + reorderAlertCount)}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-[360px] max-h-[400px] overflow-hidden z-50 rounded-xl glass border border-white/10 shadow-xl flex flex-col">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="font-semibold text-white">Notifications</span>
              {list.some((n) => !n.is_read) && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-xs text-neon-green hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 max-h-[320px]">
              {list.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No notifications</div>
              ) : (
                list.map((n) => (
                  <Link
                    key={n.id || n.created_at}
                    to={n.link || '#'}
                    onClick={() => {
                      if (n.id) markRead(n.id);
                      setOpen(false);
                    }}
                    className={`block p-3 border-b border-white/5 hover:bg-white/5 ${!n.is_read ? 'bg-neon-green/5' : ''}`}
                  >
                    <div className="flex gap-2">
                      <span className="text-lg">{TYPE_ICON[n.type] || '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">{n.title}</div>
                        <div className="text-gray-400 text-xs truncate">{n.message}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="p-2 border-t border-white/10 text-center flex flex-col gap-1">
              <Link
                to="/dashboard/orders"
                state={{ tab: 'alerts' }}
                onClick={() => setOpen(false)}
                className="text-xs text-neon-green hover:underline"
              >
                Smart reorder alerts{reorderAlertCount > 0 ? ` (${reorderAlertCount})` : ''}
              </Link>
              <Link
                to="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-electric-blue hover:underline"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
