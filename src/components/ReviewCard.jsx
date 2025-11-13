import React from 'react';
import { useState } from 'react';

export function ReviewCard({ review }) {
  
  function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const unFilled = '☆'.repeat(5 - rating);
    return filled + unFilled;
  }
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="review-card p-4 space-y-2">
        <div className="reviewInformation flex items-start gap-4">
            <div>
                <img 
                    src={review.artworkUrl} 
                    alt={review.title + ' - ' + review.artist} 
                    className="w-40 h-40 rounded-lg object-cover flex-shrink-0"
                />
            </div>
            <div className="space-y-2 flex-1">
                <p className="font-bold">{review.title + ' - ' + review.artist}</p>
                <div className="flex gap-3">
                    <img 
                        src={review.profiles.avatar_url} 
                        alt="Profile" 
                        className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>{review.profiles.username}</span>
                </div>
                <p className="">{renderStars(review.rating)}</p>
                <div>
                    <p className={isExpanded ? '' : 'line-clamp-3'}>
                        {review.review}
                    </p>
                    {review.review && review.review.length > 150 && (
                        <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-blue-400 text-sm"
                        >
                        {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                    )}
                </div>
            </div>
        </div>

        
    </div>
  );
}
