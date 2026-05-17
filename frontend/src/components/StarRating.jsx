import React, { useState } from 'react';

const sizes = { sm: 14, md: 20, lg: 28, xl: 36 };

export default function StarRating({
  rating,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
}) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? rating;
  const px = sizes[size] || sizes.md;

  return (
    <div
      className="flex gap-0.5 items-center"
      style={{ cursor: interactive ? 'pointer' : 'default' }}
      role={interactive ? 'slider' : 'img'}
      aria-label={interactive ? `Rating ${display} of ${max}` : `Rating ${rating} of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: px,
            color: i < display ? '#fbbf24' : '#374151',
            transition: 'color 0.1s',
          }}
          onMouseEnter={() => interactive && setHovered(i + 1)}
          onMouseLeave={() => interactive && setHovered(null)}
          onClick={() => interactive && onChange && onChange(i + 1)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
