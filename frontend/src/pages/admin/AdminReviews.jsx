import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../lib/axios';
import { toast } from 'sonner';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterServiceId, setFilterServiceId] = useState('');
  const [filterVisible, setFilterVisible] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [hideModal, setHideModal] = useState({ open: false, review: null, reason: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, review: null });
  const [actioning, setActioning] = useState(false);

  const fetchReviews = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (filterServiceId.trim()) params.append('service_id', filterServiceId.trim());
    if (filterVisible === 'true') params.append('is_visible', 'true');
    if (filterVisible === 'false') params.append('is_visible', 'false');
    if (filterRating && [1, 2, 3, 4, 5].includes(parseInt(filterRating, 10))) params.append('rating', filterRating);

    api
      .get(`/admin/reviews?${params}`, { withCredentials: true })
      .then((res) => {
        setReviews(res.data.reviews || []);
        setTotal(res.data.total ?? 0);
        setPages(res.data.pages ?? 1);
        setStats(res.data.stats || null);
      })
      .catch(() => {
        setReviews([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [page, filterServiceId, filterVisible, filterRating]);

  const handleHide = async () => {
    const review = hideModal.review;
    if (!review) return;
    setActioning(true);
    try {
      await api.put(`/admin/reviews/${review._id}/hide`, { reason: hideModal.reason }, { withCredentials: true });
      toast.success('Review hidden');
      setHideModal({ open: false, review: null, reason: '' });
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to hide');
    } finally {
      setActioning(false);
    }
  };

  const handleShow = async (review) => {
    setActioning(true);
    try {
      await api.put(`/admin/reviews/${review._id}/show`, {}, { withCredentials: true });
      toast.success('Review visible again');
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to show');
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async () => {
    const review = deleteModal.review;
    if (!review) return;
    setActioning(true);
    try {
      await api.delete(`/admin/reviews/${review._id}`, { withCredentials: true });
      toast.success('Review deleted');
      setDeleteModal({ open: false, review: null });
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setActioning(false);
    }
  };

  return (
    <AdminLayout title="Reviews">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {stats && (
          <Card className="glass p-4 mb-6 border-cyber-purple/20">
            <div className="flex flex-wrap gap-6">
              <div>
                <span className="text-gray-500 text-sm">Total reviews</span>
                <p className="text-xl font-bold text-white">{stats.total_reviews}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Avg rating</span>
                <p className="text-xl font-bold text-amber-400">★ {stats.avg_rating}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Hidden</span>
                <p className="text-xl font-bold text-red-400">{stats.hidden_count}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">This week</span>
                <p className="text-xl font-bold text-neon-green">{stats.this_week_count}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="glass overflow-hidden border-cyber-purple/20">
          <div className="p-4 border-b border-white/10 flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-gray-400 text-xs">Service ID</Label>
              <Input
                placeholder="Filter by service_id"
                value={filterServiceId}
                onChange={(e) => setFilterServiceId(e.target.value)}
                className="mt-1 w-40 bg-deep-navy border-white/10 h-9"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Visible</Label>
              <select
                value={filterVisible}
                onChange={(e) => setFilterVisible(e.target.value)}
                className="mt-1 h-9 rounded bg-deep-navy border border-white/10 text-white text-sm px-2"
              >
                <option value="">All</option>
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Rating</Label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="mt-1 h-9 rounded bg-deep-navy border border-white/10 text-white text-sm px-2"
              >
                <option value="">All</option>
                <option value="5">5★</option>
                <option value="4">4★</option>
                <option value="3">3★</option>
                <option value="2">2★</option>
                <option value="1">1★</option>
              </select>
            </div>
            <Button size="sm" variant="outline" onClick={fetchReviews} className="border-white/10">
              Apply
            </Button>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 size={32} className="animate-spin text-cyber-purple" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No reviews match the filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cyber-purple/10">
                  <tr>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Service</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">User (email)</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">★</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">⚡ Speed</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Recommend</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Visible</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-sm">Date</th>
                    <th className="text-right p-3 text-gray-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr
                      key={r._id}
                      className={`border-t border-white/5 ${!r.is_visible ? 'bg-red-500/5 opacity-80' : ''}`}
                    >
                      <td className="p-3 text-white text-sm">{r.service_name || r.service_id}</td>
                      <td className="p-3 text-gray-300 text-sm font-mono">{r.user_email || '—'}</td>
                      <td className="p-3 text-amber-400">{r.rating}/5</td>
                      <td className="p-3 text-gray-400">{r.speed_rating}/5</td>
                      <td className="p-3">
                        <span className={r.would_recommend ? 'text-neon-green' : 'text-red-400'}>
                          {r.would_recommend ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={r.is_visible ? 'text-neon-green' : 'text-red-400'}>
                          {r.is_visible ? 'Yes' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          {r.is_visible ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500/50 text-amber-400"
                              onClick={() => setHideModal({ open: true, review: r, reason: '' })}
                              title="Hide review"
                            >
                              <EyeOff size={14} />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-neon-green/50 text-neon-green"
                              onClick={() => handleShow(r)}
                              disabled={actioning}
                              title="Show review"
                            >
                              <Eye size={14} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400"
                            onClick={() => setDeleteModal({ open: true, review: r })}
                            title="Delete review"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="p-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-gray-500 text-sm">Page {page} of {pages} ({total} total)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <Dialog open={hideModal.open} onOpenChange={(open) => !open && setHideModal({ open: false, review: null, reason: '' })}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Hide review</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400 text-sm mb-2">This review will no longer count toward the service rating.</p>
          <Label className="text-gray-400 text-xs">Reason (optional)</Label>
          <Input
            value={hideModal.reason}
            onChange={(e) => setHideModal((m) => ({ ...m, reason: e.target.value }))}
            placeholder="Admin note"
            className="mt-1 bg-deep-navy border-white/10"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideModal({ open: false, review: null, reason: '' })}>Cancel</Button>
            <Button onClick={handleHide} disabled={actioning} className="bg-amber-600 hover:bg-amber-700">
              Hide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, review: null })}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete review</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400 text-sm">This cannot be undone. The review will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, review: null })}>Cancel</Button>
            <Button onClick={handleDelete} disabled={actioning} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
