'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number | null;
  count?: number;
  size?: number;
}

export function StarRating({ rating, count, size = 14 }: StarRatingProps) {
  if (rating === null) {
    return <span className="text-xs text-gray-400">No reviews yet</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={
              star <= Math.round(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-200 fill-gray-200'
            }
          />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  );
}
