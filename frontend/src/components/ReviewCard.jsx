import React from 'react';
import StarRating from './StarRating';

export default function ReviewCard({ review }) {
  if (!review) return null;

  return (
    <div className="rounded-xl border border-[#1a2040] p-4 mb-3 bg-[#0f1628]">
      <div className="flex justify-between items-start gap-4">
        <div>
          <StarRating rating={review.rating} size="sm" />
          <div className="text-gray-500 text-xs mt-1 flex items-center gap-2 flex-wrap">
            <span>{review.user_email}</span>
            <span className="text-neon-green text-[11px]">✓ Verified Purchase</span>
            {review.is_edited && (
              <span className="text-gray-500 text-[11px]">Edited</span>
            )}
          </div>
        </div>
        <div className="text-gray-500 text-xs shrink-0">
          {review.created_at
            ? new Date(review.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—'}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-sm">
        <span className="text-gray-500">
          ⚡ Speed: <span className="text-gray-300">{review.speed_rating}/5</span>
        </span>
        <span
          className={
            review.would_recommend ? 'text-neon-green' : 'text-red-400'
          }
        >
          {review.would_recommend ? '✅ Recommends' : '❌ Does not recommend'}
        </span>
      </div>
    </div>
  );
}
