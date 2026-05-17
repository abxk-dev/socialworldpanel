import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Loader2, PenLine } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useReseller } from '../../context/ResellerContext';
import ReviewFormModal from '../../components/ReviewFormModal';
import StarRating from '../../components/StarRating';
import api from '../../lib/axios';
import { toast } from 'sonner';

export default function MyReviewsPage() {
  const { token } = useDashboardAuth();
  const { isReseller } = useReseller();
  const [tab, setTab] = useState('my');
  const [myReviews, setMyReviews] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, serviceId: null, serviceName: null, existing: null });

  useEffect(() => {
    if (isReseller || !token) return;
    setLoading(true);
    Promise.all([
      api.get('/reviews/my', { withCredentials: true }),
      api.get('/reviews/eligible', { withCredentials: true }),
    ])
      .then(([myRes, eligRes]) => {
        setMyReviews(myRes.data?.reviews || []);
        setEligible(eligRes.data?.eligible || []);
      })
      .catch(() => {
        setMyReviews([]);
        setEligible([]);
      })
      .finally(() => setLoading(false));
  }, [token, isReseller]);

  const refresh = () => {
    if (!token) return;
    Promise.all([
      api.get('/reviews/my', { withCredentials: true }),
      api.get('/reviews/eligible', { withCredentials: true }),
    ]).then(([myRes, eligRes]) => {
      setMyReviews(myRes.data?.reviews || []);
      setEligible(eligRes.data?.eligible || []);
    }).catch(() => {});
  };

  const openEdit = (review) => {
    setModal({
      open: true,
      serviceId: review.service_id,
      serviceName: review.service_name,
      existing: review,
    });
  };

  const openNew = (item) => {
    setModal({
      open: true,
      serviceId: item.service_id,
      serviceName: item.service_name,
      existing: null,
    });
  };

  if (isReseller) {
    return (
      <DashboardLayout title="My Reviews">
        <Card className="glass p-6">
          <p className="text-[var(--text-muted)]">Reviews are not available for reseller accounts.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Reviews">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-2 border-b border-[var(--border)] pb-2">
          <button
            type="button"
            onClick={() => setTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'my' ? 'bg-cyber-purple text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            My Reviews ({myReviews.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              tab === 'pending' ? 'bg-cyber-purple text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Pending Reviews
            {eligible.length > 0 && (
              <span className="bg-neon-green text-black text-xs font-bold px-1.5 py-0.5 rounded">
                {eligible.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-cyber-purple" />
          </div>
        ) : tab === 'my' ? (
          <Card className="glass overflow-hidden">
            {myReviews.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                You haven&apos;t left any reviews yet. Complete orders and wait 7 days to leave a review.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {myReviews.map((r) => (
                  <div
                    key={`${r.service_id}-${r.updated_at}`}
                    className="flex flex-wrap items-center gap-4 p-4 hover:bg-[var(--bg-card)]"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/reviews/${r.service_id}`}
                        className="font-medium text-[var(--text-primary)] hover:underline truncate block"
                      >
                        {r.service_name || r.service_id}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
                        <StarRating rating={r.rating} size="sm" />
                        <span>⚡ {r.speed_rating}/5</span>
                        <span className={r.would_recommend ? 'text-neon-green' : 'text-[var(--error)]'}>
                          {r.would_recommend ? 'Recommends' : 'Does not recommend'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[var(--text-muted)] text-sm">
                      {r.updated_at
                        ? new Date(r.updated_at).toLocaleDateString()
                        : r.created_at
                          ? new Date(r.created_at).toLocaleDateString()
                          : '—'}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyber-purple/50 text-cyber-purple"
                      onClick={() => openEdit(r)}
                    >
                      <PenLine size={14} className="mr-1" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="glass overflow-hidden">
            {eligible.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                No pending reviews. Complete an order and wait 7 days to unlock reviews.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {eligible.map((item) => (
                  <div
                    key={item.service_id}
                    className="flex flex-wrap items-center gap-4 p-4 hover:bg-[var(--bg-card)]"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/reviews/${item.service_id}`}
                        className="font-medium text-[var(--text-primary)] hover:underline truncate block"
                      >
                        {item.service_name || item.service_id}
                      </Link>
                      <div className="text-sm text-[var(--text-muted)] mt-1">
                        {item.order_count} order(s) completed
                        {item.last_completed_at && (
                          <> · Last: {new Date(item.last_completed_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-cyber-purple hover:bg-cyber-purple/90"
                      onClick={() => openNew(item)}
                    >
                      <Star size={14} className="mr-1" />
                      Write Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {modal.open && (
        <ReviewFormModal
          serviceId={modal.serviceId}
          serviceName={modal.serviceName}
          existingReview={modal.existing}
          onClose={() => setModal({ open: false, serviceId: null, serviceName: null, existing: null })}
          onSubmit={() => {
            refresh();
          }}
        />
      )}
    </DashboardLayout>
  );
}
