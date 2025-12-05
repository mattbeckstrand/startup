import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';

// Star Rating Display Component
function StarRatingDisplay({ rating }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="text-[14px] text-[#FFD60A]">★</span>
      ))}
      {hasHalfStar && (
        <span className="text-[14px] relative">
          <span className="text-[rgba(128,128,128,0.3)]">☆</span>
          <span className="absolute inset-0 overflow-hidden text-[#FFD60A]" style={{ width: '50%' }}>★</span>
        </span>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-[14px] text-[rgba(128,128,128,0.3)]">☆</span>
      ))}
    </div>
  );
}

export function ReviewCard({ 
  review, 
  onLike, 
  onComment, 
  onRepost,
  showFullReview = false,
  isRepost = false,
  repostedBy = null
}) {
  const { token, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(review.is_liked || false);
  const [likeCount, setLikeCount] = useState(review.like_count || 0);
  const [reposted, setReposted] = useState(review.is_reposted || false);
  const [repostCount, setRepostCount] = useState(review.repost_count || 0);
  const [imageError, setImageError] = useState(false);

  const profile = review.profiles || {};
  const reviewText = review.review || '';
  const truncatedReview = reviewText.length > 200 && !showFullReview 
    ? reviewText.substring(0, 200) + '...' 
    : reviewText;

  // Parse item_metadata if it's a string
  let metadata = {};
  const rawMetadata = review.item_metadata;
  
  try {
    if (typeof rawMetadata === 'string' && rawMetadata) {
      metadata = JSON.parse(rawMetadata);
    } else if (rawMetadata && typeof rawMetadata === 'object') {
      metadata = rawMetadata;
    }
  } catch (e) {
    metadata = {};
  }
  
  // Get artwork URL from various possible locations with multiple fallbacks
  const getArtworkUrl = () => {
    // Try direct album_art_url first
    if (review.album_art_url && review.album_art_url.startsWith('http')) {
      return review.album_art_url;
    }
    // Try metadata artworkUrl
    if (metadata.artworkUrl && metadata.artworkUrl.startsWith('http')) {
      return metadata.artworkUrl;
    }
    // Try metadata albumArtUrl
    if (metadata.albumArtUrl && metadata.albumArtUrl.startsWith('http')) {
      return metadata.albumArtUrl;
    }
    // Try metadata images array
    if (metadata.images && metadata.images[0]?.url) {
      return metadata.images[0].url;
    }
    // Fallback to placeholder
    return '/Images/ProfilePlaceholder.jpg';
  };
  
  const artworkUrl = imageError ? '/Images/ProfilePlaceholder.jpg' : getArtworkUrl();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return diffMins + 'm';
    if (diffHours < 24) return diffHours + 'h';
    if (diffDays < 7) return diffDays + 'd';
    return date.toLocaleDateString();
  };

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    
    try {
      const method = liked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/likes/review/${review.id}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        onLike?.(review.id, !liked);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleRepost = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    
    try {
      if (reposted) {
        const response = await fetch(`/api/reposts/review/${review.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          setReposted(false);
          setRepostCount(prev => prev - 1);
        }
      } else {
        const response = await fetch('/api/reposts', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content_type: 'review', content_id: review.id })
        });
        if (response.ok) {
          setReposted(true);
          setRepostCount(prev => prev + 1);
        }
      }
      onRepost?.(review.id, !reposted);
    } catch (error) {
      console.error('Repost error:', error);
    }
  };

  return (
    <div className="bg-[rgb(48,48,52)] rounded-2xl p-2 px-3 mx-2 mb-1 shadow-md">
      {/* Repost Header */}
      {isRepost && repostedBy && (
        <div className="flex items-center gap-1.5 pb-1 text-[12px] text-[rgba(255,255,255,0.6)]">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
          </svg>
          <Link 
            to={`/profile/${repostedBy.id}`} 
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {repostedBy.display_name || repostedBy.username} reposted
          </Link>
        </div>
      )}

      {/* User Header Row */}
      <div className="flex items-center gap-1.5">
        <Link 
          to={`/profile/${profile.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={profile.avatar_url || '/Images/ProfilePlaceholder.jpg'} 
            alt={profile.display_name}
            className="w-6 h-6 rounded-full object-cover bg-[rgb(174,174,178)]"
          />
        </Link>
        <Link 
          to={`/profile/${profile.id}`} 
          className="text-[14px] flex-1 truncate hover:underline text-[rgba(255,255,255,0.6)]"
          onClick={(e) => e.stopPropagation()}
        >
          {profile.display_name || profile.username}
        </Link>
        <span className="text-[12px] text-[rgba(255,255,255,0.6)]">
          {formatDate(review.created_at)}
        </span>
      </div>

      {/* Main Content Row */}
      <Link to={`/review/${review.id}`} className="block mt-3">
        <div className="flex gap-3">
          {/* Album Artwork */}
          <div className="w-[120px] h-[120px] rounded-xl overflow-hidden flex-shrink-0 bg-[rgb(58,58,62)]">
            <img 
              src={artworkUrl}
              alt={review.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>

          {/* Music Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Title with Explicit Badge */}
            <div className="flex items-start gap-1.5">
              <h3 className="text-[20px] font-bold leading-tight line-clamp-2 text-white">
                {review.title}
              </h3>
              {metadata.isExplicit && (
                <span className="text-[10px] font-bold text-white bg-[rgba(128,128,128,0.7)] px-1 py-0.5 rounded mt-1">E</span>
              )}
            </div>

            {/* Artist */}
            <p className="text-[16px] truncate text-[rgba(255,255,255,0.6)]">
              {review.artist}
            </p>

            {/* Type Badge */}
            <span className="text-[11px] font-medium capitalize text-[#007AFF]">
              {review.item_type}
            </span>

            {/* Star Rating */}
            {review.rating && <StarRatingDisplay rating={review.rating} />}
          </div>
        </div>

        {/* Review Text */}
        {reviewText && (
          <div className="mt-2">
            {review.review_title && (
              <h4 className="text-[16px] font-bold mb-1 text-white">
                {review.review_title}
              </h4>
            )}
            <p className="text-[16px] leading-relaxed whitespace-pre-wrap text-white">
              {truncatedReview}
            </p>
            {reviewText.length > 200 && !showFullReview && (
              <span className="text-[12px] text-[#007AFF]">
                Show more
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Social Action Bar */}
      <div className="flex justify-between items-center mt-2">
        {/* Like Button */}
        <button 
          onClick={handleLike}
          className="flex items-center gap-1 p-1 text-[rgba(255,255,255,0.6)] active:scale-95 transition-transform"
        >
          <svg 
            className="w-[14px] h-[14px]" 
            fill={liked ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: liked ? '#FF3B30' : 'inherit' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likeCount > 0 && (
            <span className="text-[12px] font-medium">{likeCount}</span>
          )}
        </button>

        {/* Comment Button */}
        <Link 
          to={`/review/${review.id}`}
          className="flex items-center gap-1 p-1 text-[rgba(255,255,255,0.6)]"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {review.comment_count > 0 && (
            <span className="text-[12px] font-medium">{review.comment_count}</span>
          )}
        </Link>

        {/* Repost Button */}
        <button 
          onClick={handleRepost}
          className="flex items-center gap-1 p-1 active:scale-95 transition-transform"
          style={{ color: reposted ? '#007AFF' : 'rgba(255,255,255,0.6)' }}
        >
          <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {repostCount > 0 && (
            <span className="text-[12px] font-medium">{repostCount}</span>
          )}
        </button>

        {/* Share Button */}
        <button 
          className="flex items-center gap-1 p-1 text-[rgba(255,255,255,0.6)] ml-auto active:scale-95 transition-transform"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({
                title: `${review.title} by ${review.artist}`,
                text: `Check out this review on Snare`,
                url: `${window.location.origin}/review/${review.id}`
              });
            }
          }}
        >
          <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
