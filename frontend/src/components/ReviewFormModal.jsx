import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import StarRating from './StarRating';
import api from '../lib/axios';
import { toast } from 'sonner';

const SPEED_LABELS = {
  1: 'Very Slow',
  2: 'Slow',
  3: 'Average',
  4: 'Fast',
  5: 'Lightning Fast',
};

export default function ReviewFormModal({
  serviceId,
  serviceName,
  existingReview,
  onClose,
  onSubmit,
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [speedRating, setSpeedRating] = useState(existingReview?.speed_rating ?? 0);
  const [wouldRecommend, setWouldRecommend] = useState(
    existingReview?.would_recommend ?? true
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRating(existingReview?.rating ?? 0);
    setSpeedRating(existingReview?.speed_rating ?? 0);
    setWouldRecommend(existingReview?.would_recommend ?? true);
  }, [existingReview, serviceId]);

  const isEdit = !!existingReview;
  const canSubmit = rating >= 1 && rating <= 5 && speedRating >= 1 && speedRating <= 5;

  const handleSubmit = async () => {
    if (!canSubmit || !serviceId) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/reviews/${serviceId}`, {
          rating,
          speed_rating: speedRating,
          would_recommend: wouldRecommend,
        }, { withCredentials: true });
        toast.success('Review updated successfully!');
      } else {
        await api.post('/reviews', {
          service_id: serviceId,
          rating,
          speed_rating: speedRating,
          would_recommend: wouldRecommend,
        }, { withCredentials: true });
        toast.success('Review submitted successfully!');
      }
      onSubmit?.();
      onClose?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save review';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="glass border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEdit ? 'Update Review' : 'Leave a Review'} — {serviceName || serviceId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <Label className="text-white font-medium block mb-2">Rate the service: select 1 to 5 stars</Label>
            <p className="text-xs text-gray-400 mb-3">Click a star to choose your rating (1 = poor, 5 = excellent).</p>
            <StarRating
              rating={rating}
              size="xl"
              interactive
              onChange={setRating}
            />
            <p className="text-sm text-amber-400/90 mt-2 font-medium">
              {rating ? `${rating} star${rating === 1 ? '' : 's'} selected` : 'Click a star above to rate'}
            </p>
          </div>
          <div>
            <Label className="text-gray-400 block mb-2">How fast was the delivery?</Label>
            <StarRating
              rating={speedRating}
              size="lg"
              interactive
              onChange={setSpeedRating}
            />
            <p className="text-xs text-gray-500 mt-1">
              {SPEED_LABELS[speedRating] || '1=Very Slow, 5=Lightning Fast'}
            </p>
          </div>
          <div>
            <Label className="text-gray-400 block mb-2">Would you recommend this service?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={wouldRecommend ? 'default' : 'outline'}
                size="sm"
                className={wouldRecommend ? 'bg-neon-green text-black hover:bg-neon-green/90' : 'border-white/20'}
                onClick={() => setWouldRecommend(true)}
              >
                👍 Yes, Recommend
              </Button>
              <Button
                type="button"
                variant={!wouldRecommend ? 'default' : 'outline'}
                size="sm"
                className={!wouldRecommend ? 'bg-red-500/80 text-white' : 'border-white/20'}
                onClick={() => setWouldRecommend(false)}
              >
                👎 No
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="border-white/10">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="bg-cyber-purple hover:bg-cyber-purple/90"
          >
            {submitting ? 'Saving...' : isEdit ? 'Update Review' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
