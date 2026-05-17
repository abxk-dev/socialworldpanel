import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ChevronDown, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ReviewCard from '../components/ReviewCard';
import ReviewFormModal from '../components/ReviewFormModal';
import api from '../lib/axios';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { toast } from 'sonner';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest' },
  { value: 'lowest', label: 'Lowest' },
];

export default function ReviewsPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useDashboardAuth();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    setLoading(true);
    api
      .get(`/reviews/summary/${serviceId}`)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [serviceId]);

  const fetchReviews = (pageNum = 1, sortVal = sort) => {
    if (!serviceId) return;
    setLoadingReviews(true);
    api
      .get(`/reviews/service/${serviceId}`, {
        params: { page: pageNum, limit: 10, sort: sortVal },
      })
      .then((res) => {
        setReviews(res.data.reviews || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || 1);
        setPages(res.data.pages || 1);
      })
      .catch(() => {
        setReviews([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => setLoadingReviews(false));
  };

  useEffect(() => {
    if (!serviceId) return;
    fetchReviews(1, sort);
  }, [serviceId, sort]);

  useEffect(() => {
    if (token && serviceId) {
      api.get('/reviews/eligible', { withCredentials: true }).then((res) => {
        const list = res.data?.eligible || [];
        setEligible(list.some((e) => e.service_id === serviceId));
      }).catch(() => setEligible(false));
      api.get('/reviews/my', { withCredentials: true }).then((res) => {
        const list = res.data?.reviews || [];
        setMyReview(list.find((r) => r.service_id === serviceId) || null);
      }).catch(() => setMyReview(null));
    } else {
      setEligible(false);
      setMyReview(null);
    }
  }, [token, serviceId]);

  const handleReviewSubmitted = () => {
    setShowReviewModal(false);
    api.get(`/reviews/summary/${serviceId}`).then((res) => setSummary(res.data)).catch(() => {});
    fetchReviews(1, sort);
    if (token) {
      api.get('/reviews/my', { withCredentials: true }).then((res) => {
        const list = res.data?.reviews || [];
        setMyReview(list.find((r) => r.service_id === serviceId) || null);
      }).catch(() => {});
    }
  };

  if (!serviceId) {
    return (
      <div className="min-h-screen bg-deep-navy">
        <Navbar />
        <div className="pt-navbar">
        <div className="container mx-auto px-4 py-12 text-center text-gray-400">
          <p>Service not specified.</p>
          <Link to="/services" className="text-electric-blue hover:underline mt-2 inline-block">
            Browse services
          </Link>
        </div>
        <Footer />
        </div>
      </div>
    );
  }

  const serviceName = summary?.service_name || serviceId;
  const dist = summary?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const totalCount = summary?.rating_count ?? 0;
  const totalDist = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col">
      <Navbar />
      <div className="pt-navbar flex-1 flex flex-col">
      <main className="container mx-auto px-4 py-8 flex-1 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" className="text-gray-400 mb-4 -ml-2" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-white mb-1">{serviceName} — Reviews</h1>

          {loading ? (
            <div className="h-24 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-4 flex-wrap mt-2 mb-6">
                <span className="text-amber-400 text-xl">★</span>
                <span className="text-white font-bold text-xl">{Number(summary?.rating_avg || 0).toFixed(1)}</span>
                <span className="text-gray-500">({totalCount} verified reviews)</span>
              </div>

              {totalCount > 0 && (
                <>
                  <Card className="glass p-4 mb-6 border-white/10">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Rating breakdown</h3>
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = dist[stars] || 0;
                      const pct = totalDist ? Math.round((count / totalDist) * 100) : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3 mb-2">
                          <span className="text-gray-400 w-8">{stars}★</span>
                          <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyber-purple/70 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-gray-500 text-sm w-12">{count}</span>
                          <span className="text-gray-600 text-sm">({pct}%)</span>
                        </div>
                      );
                    })}
                  </Card>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                    <span>Speed: ⚡ {Number(summary?.speed_avg || 0).toFixed(1)} avg</span>
                    <span>Recommend: {summary?.recommend_pct ?? 0}% ✅</span>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-gray-400 text-sm">Sort:</span>
                {SORT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={sort === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className={sort === opt.value ? 'bg-cyber-purple' : 'border-white/10'}
                    onClick={() => setSort(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {loadingReviews ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-cyber-purple" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-gray-500 py-8">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="space-y-0">
                  {reviews.map((r) => (
                    <ReviewCard key={r._id} review={r} />
                  ))}
                </div>
              )}

              {pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => fetchReviews(page - 1, sort)}
                    className="border-white/10"
                  >
                    Previous
                  </Button>
                  <span className="text-gray-500 text-sm flex items-center px-2">
                    Page {page} of {pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pages}
                    onClick={() => fetchReviews(page + 1, sort)}
                    className="border-white/10"
                  >
                    Next
                  </Button>
                </div>
              )}

              <div className="mt-10 pt-8 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3">Leave a review</h3>
                {!user ? (
                  <p className="text-gray-400">
                    <Link to="/login" className="text-electric-blue hover:underline">
                      Log in
                    </Link>{' '}
                    to leave a review.
                  </p>
                ) : !eligible && !myReview ? (
                  <p className="text-gray-400">Complete an order that has been finished for 7+ days to leave a review.</p>
                ) : myReview ? (
                  <div>
                    <p className="text-gray-400 mb-2">You already reviewed this service.</p>
                    <Button
                      size="sm"
                      className="bg-cyber-purple"
                      onClick={() => setShowReviewModal(true)}
                    >
                      Update my review
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="bg-cyber-purple hover:bg-cyber-purple/90"
                    onClick={() => setShowReviewModal(true)}
                  >
                    Write a review
                  </Button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </main>
      <Footer />

      </div>

      {showReviewModal && (eligible || myReview) && (
        <ReviewFormModal
          serviceId={serviceId}
          serviceName={serviceName}
          existingReview={myReview}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
