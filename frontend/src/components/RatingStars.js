import { Star } from 'lucide-react';

export const RatingStars = ({ rating, size = 'default', onRate = null }) => {
  const sizeClasses = {
    small: 'h-3 w-3',
    default: 'h-5 w-5',
    large: 'h-6 w-6'
  };

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          onClick={() => onRate && onRate(star)}
          className={`${onRate ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          disabled={!onRate}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-amber-500 text-amber-500'
                : 'text-zinc-600'
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
};