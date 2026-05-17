import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import HtmlEditor from '../../components/admin/HtmlEditor';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import api from '../../lib/axios';
import { useAuth } from '../../App';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { Loader2, Edit, Trash2, Send, History } from 'lucide-react';

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const formatDate = (d) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date.toISOString ? date.toISOString().slice(0, 16).replace('T', ' ') : String(date);
  }
};

const AdminNotifications = () => {
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isHtmlMode, setIsHtmlMode] = useState(true);
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/admin/notifications?page=${page}&limit=20`, { headers, withCredentials: true });
      setHistory(res.data?.notifications || []);
      setTotalPages(res.data?.pages ?? 1);
      setTotal(res.data?.total ?? 0);
    } catch (e) {
      toast.error('Failed to load notification history');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [page, token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const sendNotif = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    setSending(true);
    try {
      const content_text = isHtmlMode ? stripHtml(content) : content;
      const content_html = isHtmlMode ? content : '';
      await api.post('/admin/notifications', { title, content_text, content_html }, { headers, withCredentials: true, timeout: 30000 });
      toast.success('Notification sent');
      setTitle('');
      setContent('');
      fetchHistory();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.detail || err.message;
      if (status === 504 || msg?.toLowerCase?.().includes('timeout')) {
        toast.error('Request timed out. The server may be slow. Please try again.');
      } else {
        toast.error(msg || 'Failed to send notification');
      }
    } finally {
      setSending(false);
    }
  };

  const openEdit = async (n) => {
    const id = n.id || n._id;
    if (!id) return;
    setEditId(id);
    setEditTitle(n.title || '');
    setEditContent(n.content_html || n.content_text || n.message || '');
    setEditSaving(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setEditSaving(true);
    try {
      await api.put(`/admin/notifications/${editId}`, {
        title: editTitle,
        content_html: editContent,
        content_text: stripHtml(editContent),
      }, { headers, withCredentials: true });
      toast.success('Notification updated');
      setEditId(null);
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteNotif = async (n) => {
    const id = n.id || n._id;
    if (!id || !confirm('Delete this notification? This cannot be undone.')) return;
    setActioningId(id);
    try {
      await api.delete(`/admin/notifications/${id}`, { headers, withCredentials: true });
      toast.success('Notification deleted');
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete');
    } finally {
      setActioningId(null);
    }
  };

  const resendNotif = async (n) => {
    const id = n.id || n._id;
    if (!id || !confirm('Resend this notification? A new copy will be created and shown to users again.')) return;
    setActioningId(id);
    try {
      await api.post(`/admin/notifications/${id}/resend`, {}, { headers, withCredentials: true });
      toast.success('Notification resent');
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to resend');
    } finally {
      setActioningId(null);
    }
  };

  const getNotifSummary = (n) => {
    const text = n.content_text || n.message || (n.content_html ? stripHtml(n.content_html) : '');
    return (text || n.title || '').slice(0, 60) + (text && text.length > 60 ? '…' : '');
  };

  const getNotifType = (n) => {
    if (n.audience) return `Broadcast (${n.audience})`;
    if (n.user_id) return 'User';
    return n.type || '—';
  };

  return (
    <AdminLayout title="Notifications">
      <Toaster position="top-right" theme="dark" />
      <Card className="glass p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Send new notification</h3>
        <div className="mb-4">
          <Label className="text-gray-400">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="mt-2 bg-deep-navy border-white/10 text-white"
          />
        </div>
        <div>
          <Label className="text-gray-400">Message / Description</Label>
          <HtmlEditor
            value={content}
            onChange={setContent}
            placeholder="Enter your notification message..."
          />
        </div>
        <Button onClick={sendNotif} disabled={sending} className="mt-4 bg-electric-blue text-black">
          {sending ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {sending ? 'Sending...' : 'Send Notification'}
        </Button>
      </Card>

      <Card className="glass p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <History size={20} />
          Notification history
        </h3>
        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-gray-500 py-8">No notifications yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Title</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Preview</TableHead>
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400 w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((n) => {
                    const id = n.id || (n._id && String(n._id));
                    const isActioning = actioningId === id;
                    return (
                      <TableRow key={id} className="border-white/10">
                        <TableCell className="text-white font-medium">{n.title || '—'}</TableCell>
                        <TableCell className="text-gray-400">{getNotifType(n)}</TableCell>
                        <TableCell className="text-gray-500 text-sm max-w-[200px] truncate">{getNotifSummary(n)}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{formatDate(n.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(n)} title="Edit">
                              <Edit className="h-4 w-4 text-cyan-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => resendNotif(n)} disabled={isActioning} title="Resend">
                              {isActioning ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Send className="h-4 w-4 text-amber-400" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteNotif(n)} disabled={isActioning} title="Delete">
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-gray-500 text-sm">Total: {total} · Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-white/10">Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="border-white/10">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent className="glass border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-400">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-2 bg-deep-navy border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Message</Label>
              <HtmlEditor value={editContent} onChange={setEditContent} placeholder="Content" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)} className="border-white/10">Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving} className="bg-electric-blue text-black">
              {editSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminNotifications;
