import React from 'react';
import { Link } from 'react-router-dom';

export default function ReviewSummaryBar({ service, linkTo }) {
  if (!service) return null;
  const count = service.rating_count ?? 0;
  if (count === 0) {
    return <span className="text-gray-500 text-xs">No reviews yet</span>;
  }

  const avg = service.rating_avg ?? 0;
  const speed = service.speed_avg ?? 0;
  const pct = service.recommend_pct ?? 0;

  const content = (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      <span className="text-amber-400">★</span>
      <span className="text-gray-200 font-medium">{Number(avg).toFixed(1)}</span>
      <span className="text-gray-500">({count})</span>
      <span className="text-gray-600">·</span>
      <span className="text-gray-500">⚡ {Number(speed).toFixed(1)}</span>
      <span className="text-gray-600">·</span>
      <span className="text-neon-green">{pct}% recommend</span>
    </div>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-flex items-center gap-3 text-xs hover:opacity-90"
      >
        {content}
        <span className="text-electric-blue text-xs">View reviews →</span>
      </Link>
    );
  }
  return content;
}
