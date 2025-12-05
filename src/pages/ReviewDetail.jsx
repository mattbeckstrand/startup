import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { StarRatingDisplay } from '../components/StarRating';
import { CommentCard } from '../components/CommentCard';
import { FullPageLoader } from '../components/LoadingSpinner';
import { ReviewArtwork } from '../components/ArtworkImage';
import { reviewCommentService } from '../services/commentsService';

export function ReviewDetail() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, handleUnauthorized } = useAuth();
  
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditedModal, setShowEditedModal] = useState(false);

  // Combine all data fetching into parallel requests
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Check cache first
        const cachedComments = reviewCommentService.cachedComments(reviewId);
        
        // Fetch all data in parallel
        const [reviewRes, commentsTask, likeRes, repostRes] = await Promise.allSettled([
          fetch(`/api/reviews/${reviewId}`),
          cachedComments ? Promise.resolve(cachedComments) : reviewCommentService.fetchComments(reviewId),
          isAuthenticated ? fetch(`/api/likes/review/${reviewId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }) : Promise.resolve(null),
          isAuthenticated ? fetch(`/api/reposts/check/review/${reviewId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }) : Promise.resolve(null),
        ]);

        // Process review
        if (reviewRes.status === 'fulfilled' && reviewRes.value.ok) {
          const data = await reviewRes.value.json();
          setReview(data);
          setLikeCount(data.like_count || 0);
          setRepostCount(data.repost_count || 0);
          setCommentCount(data.comment_count || 0);
        } else {
          navigate('/');
          return;
        }

        // Process comments - filter to root comments only (parentId == null)
        if (commentsTask.status === 'fulfilled') {
          const allComments = commentsTask.value || [];
          const rootComments = allComments.filter(c => !c.parent_id);
          setComments(rootComments);
          setCommentCount(allComments.length); // Total count includes replies
        }

        // Process like status
        if (likeRes.status === 'fulfilled' && likeRes.value) {
          if (likeRes.value.status === 401) {
            handleUnauthorized();
          } else if (likeRes.value.ok) {
            const data = await likeRes.value.json();
            setLiked(data.liked);
          }
        }

        // Process repost status
        if (repostRes.status === 'fulfilled' && repostRes.value) {
          if (repostRes.value.status === 401) {
            handleUnauthorized();
          } else if (repostRes.value.ok) {
            const data = await repostRes.value.json();
            setReposted(data.reposted);
          }
        }
      } catch (error) {
        console.error('Load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [reviewId, isAuthenticated, token, navigate, handleUnauthorized]);

  // Force refresh comments (clear cache and fetch fresh)
  const forceRefreshComments = async () => {
    try {
      const allComments = await reviewCommentService.forceRefreshComments(reviewId);
      const rootComments = allComments.filter(c => !c.parent_id);
      setComments(rootComments);
      setCommentCount(allComments.length);
    } catch (error) {
      console.error('Force refresh comments error:', error);
    }
  };

  // Fetch comments (uses cache if available)
  const fetchComments = async () => {
    try {
      const allComments = await reviewCommentService.fetchComments(reviewId);
      const rootComments = allComments.filter(c => !c.parent_id);
      setComments(rootComments);
      setCommentCount(allComments.length);
    } catch (error) {
      console.error('Fetch comments error:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    
    const previousLiked = liked;
    const previousCount = likeCount;
    
    // Optimistic update
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    
    try {
      const method = liked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/likes/review/${reviewId}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        handleUnauthorized();
        setLiked(previousLiked);
        setLikeCount(previousCount);
      } else if (!response.ok) {
        // Revert on error
        setLiked(previousLiked);
        setLikeCount(previousCount);
      }
    } catch (error) {
      console.error('Like error:', error);
      // Revert on error
      setLiked(previousLiked);
      setLikeCount(previousCount);
    }
  };

  const handleRepost = async () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    
    const previousReposted = reposted;
    const previousCount = repostCount;
    
    // Optimistic update
    setReposted(!reposted);
    setRepostCount(prev => reposted ? prev - 1 : prev + 1);
    
    try {
      if (reposted) {
        const response = await fetch(`/api/reposts/review/${reviewId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
          handleUnauthorized();
          setReposted(previousReposted);
          setRepostCount(previousCount);
        } else if (!response.ok) {
          setReposted(previousReposted);
          setRepostCount(previousCount);
        }
      } else {
        const response = await fetch('/api/reposts', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content_type: 'review', content_id: reviewId })
        });
        if (response.status === 401) {
          handleUnauthorized();
          setReposted(previousReposted);
          setRepostCount(previousCount);
        } else if (!response.ok) {
          setReposted(previousReposted);
          setRepostCount(previousCount);
        }
      }
    } catch (error) {
      console.error('Repost error:', error);
      setReposted(previousReposted);
      setRepostCount(previousCount);
    }
  };

  const handleComment = () => {
    // Scroll to comment input and focus
    document.getElementById('comment-input')?.focus();
    document.getElementById('comment-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${review.title} by ${review.artist}`,
          text: review.review || `Check out this review on Snare`,
          url: `${window.location.origin}/review/${reviewId}`
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/review/${reviewId}`);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return;
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    
    setIsSubmitting(true);
    const parentId = replyingTo?.id || null;
    const contentToSubmit = commentText.trim();
    
    // Optimistic update: add comment to UI immediately
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: contentToSubmit,
      author_id: user.id,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        username: user.user_metadata?.username || 'user',
        display_name: user.user_metadata?.display_name || user.user_metadata?.username || 'User',
        avatar_url: user.user_metadata?.avatar_url || '/Images/ProfilePlaceholder.jpg'
      },
      mentioned_users: []
    };
    
    // Add optimistic comment to UI
    if (parentId) {
      // It's a reply - refresh to get proper structure
      setCommentText('');
      setReplyingTo(null);
    } else {
      // Root comment - add optimistically
      setComments(prev => [...prev, optimisticComment]);
      setCommentCount(prev => prev + 1);
      setCommentText('');
      setReplyingTo(null);
    }
    
    try {
      const newComment = await reviewCommentService.addComment(
        reviewId,
        contentToSubmit,
        parentId,
        token
      );
      
      // Refresh to get the real comment with all data
      await fetchComments();
    } catch (error) {
      console.error('Comment error:', error);
      // Revert optimistic update on error
      await fetchComments();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId, content) => {
    try {
      await reviewCommentService.addComment(reviewId, content, parentId, token);
      await fetchComments();
    } catch (error) {
      console.error('Reply error:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await reviewCommentService.deleteComment(commentId, token);
      await fetchComments();
      // Recalculate count from cache
      const allComments = reviewCommentService.cachedComments(reviewId) || [];
      setCommentCount(allComments.length);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDeleteReview = async () => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        navigate('/profile');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const formatDate = (dateString, isEdited = false) => {
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    
    if (isEdited) {
      const timeOptions = { hour: '2-digit', minute: '2-digit' };
      const timeStr = date.toLocaleTimeString('en-US', timeOptions);
      const dateStr = date.toLocaleDateString('en-US', options);
      return `Last edited ${timeStr} · ${dateStr}`;
    }
    
    return date.toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (!review) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Review not found</p>
      </div>
    );
  }

  const profile = review.profiles || {};
  const isOwner = user?.id === review.user_id;
  const isEdited = review.updated_at && review.updated_at !== review.created_at;

  // Parse item_metadata if it's a string
  let metadata = {};
  try {
    metadata = typeof review.item_metadata === 'string' 
      ? JSON.parse(review.item_metadata) 
      : (review.item_metadata || {});
  } catch (e) {
    metadata = {};
  }

  // Check if this is a discovery (has discovery flag or no rating/review text)
  const isDiscovery = metadata.is_discovery || (!review.rating && !review.review);

  return (
    <div className="min-h-screen bg-[rgb(31,38,42)] pb-32">
      {/* Top Navigation Bar - Custom Back Button */}
      <div className="sticky top-0 z-20 px-4 pt-2 pb-2 bg-[rgb(31,38,42)]/95 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="frosted-icon-btn"
            aria-label="Back"
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1" />
          {isOwner && (
            <button 
              onClick={() => setShowActionSheet(true)}
              className="frosted-icon-btn"
              aria-label="More options"
            >
              <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Action Sheet Modal */}
      {showActionSheet && (
        <div 
          className="fixed inset-0 z-50 bg-black/45 flex items-end"
          onClick={() => setShowActionSheet(false)}
        >
          <div 
            className="bg-[rgb(48,48,52)] w-full rounded-t-2xl p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowActionSheet(false);
                handleDeleteReview();
              }}
              className="w-full text-left py-3 px-4 text-red-500 font-semibold rounded-lg hover:bg-[rgb(58,58,62)] transition-colors"
            >
              Delete Review
            </button>
            <button
              onClick={() => setShowActionSheet(false)}
              className="w-full text-left py-3 px-4 text-white font-semibold rounded-lg hover:bg-[rgb(58,58,62)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edited Modal */}
      {showEditedModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-6"
          onClick={() => setShowEditedModal(false)}
        >
          <div 
            className="bg-[rgb(48,48,52)] rounded-2xl max-w-md w-full max-h-[280px] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[rgba(255,255,255,0.6)]">Edit History</h3>
              <button
                onClick={() => setShowEditedModal(false)}
                className="text-[rgba(255,255,255,0.6)] hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-white">
                Created: {formatDate(review.created_at)}
              </p>
              <p className="text-sm text-white mt-2">
                Last edited: {formatDate(review.updated_at, true)}
              </p>
            </div>
          </div>
        </div>
      )}

      <main 
        className="px-4 pt-2 max-w-6xl mx-auto"
        onScroll={(e) => {
          // Simple pull-to-refresh detection (can be enhanced with a library)
          if (e.target.scrollTop === 0 && e.target.scrollHeight > e.target.clientHeight) {
            // User scrolled to top - could trigger refresh
          }
        }}
      >
        {/* Post Header Section */}
        <div className="flex items-start gap-3 mb-2">
          <Link to={`/profile/${profile.id}`} className="flex-shrink-0">
            <img 
              src={profile.avatar_url || '/Images/ProfilePlaceholder.jpg'}
              alt={profile.display_name || profile.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${profile.id}`} className="block">
                  <span className="text-[17px] font-semibold text-white leading-tight">
                    {profile.display_name || profile.username}
                  </span>
                </Link>
                <Link to={`/profile/${profile.id}`} className="block">
                  <span className="text-[14px] text-[rgba(255,255,255,0.6)]">
                    @{profile.username}
                  </span>
                </Link>
              </div>
              <button 
                onClick={() => setShowActionSheet(true)}
                className="flex-shrink-0 text-[rgba(255,255,255,0.6)] hover:text-white p-1"
                aria-label="More options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Post Body Section - Responsive Layout */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4">
          {/* Artwork Image - Smaller on desktop, full width on mobile */}
          {/* Use smaller resolution for better performance */}
          <div className="w-full md:w-[300px] md:flex-shrink-0 aspect-square md:aspect-square rounded-lg overflow-hidden bg-[rgb(58,58,62)]">
            <ReviewArtwork 
              review={review}
              resolveWidth={400}
              resolveHeight={400}
              className="w-full h-full"
            />
          </div>

          {/* Content Section */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Media Title/Artist/Album Info */}
            <div className="space-y-0.5">
              <h2 className="text-[20px] md:text-[24px] font-bold text-white leading-tight">
                {review.title}
              </h2>
              <p className="text-[14px] md:text-[16px] text-[rgba(255,255,255,0.6)]">
                {review.artist}
              </p>
              {review.album && review.item_type === 'song' && (
                <p className="text-[14px] md:text-[16px] text-[rgba(255,255,255,0.6)]">
                  {review.album}
                </p>
              )}
            </div>

            {/* Rating Stars */}
            {review.rating && (
              <div className="py-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className="text-[18px] md:text-[20px]"
                      style={{ color: star <= review.rating ? '#FFD60A' : 'rgba(255,255,255,0.3)' }}
                    >
                      {star <= review.rating ? '★' : '☆'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discovery Pill */}
            {isDiscovery && (
              <div className="py-1">
                <span className="inline-block px-2 py-1 rounded-full text-[12px] font-bold text-white bg-gradient-to-b from-purple-500 to-indigo-500">
                  DISCOVERY
                </span>
              </div>
            )}

            {/* Review Text */}
            {review.review && (
              <div className="space-y-1">
                {review.review_title && (
                  <h3 className="text-[18px] md:text-[20px] font-bold text-white">
                    {review.review_title}
                  </h3>
                )}
                <p className="text-[16px] md:text-[17px] leading-relaxed text-white whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
                  {review.review}
                </p>
              </div>
            )}

            {/* Attached Songs (if any) */}
            {metadata.attached_songs && metadata.attached_songs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[15px] md:text-[16px] font-semibold text-white">Favorite tracks</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {metadata.attached_songs.map((song, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-[rgb(58,58,62)] flex-shrink-0"
                    >
                      <svg className="w-[10px] h-[10px] text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                      <span className="text-[12px] font-semibold text-white whitespace-nowrap">
                        {song}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Post Metadata Section */}
        <div className="mb-4">
          {isEdited ? (
            <button
              onClick={() => setShowEditedModal(true)}
              className="text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
            >
              {formatDate(review.updated_at, true)}
            </button>
          ) : (
            <p className="text-[14px] text-[rgba(255,255,255,0.6)]">
              {formatDate(review.created_at)}
            </p>
          )}
        </div>

        {/* Social Actions Bar */}
        <div className="flex items-center border-t border-[rgba(255,255,255,0.1)] border-b border-[rgba(255,255,255,0.1)] py-3">
          <button
            onClick={handleComment}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-100 ease-in-out text-[rgba(255,255,255,0.6)] hover:text-white"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {commentCount > 0 && (
              <span className="text-[14px] font-medium">{commentCount}</span>
            )}
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={handleRepost}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-100 ease-in-out"
            style={{ color: reposted ? '#007AFF' : 'rgba(255,255,255,0.6)' }}
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            {repostCount > 0 && (
              <span className="text-[14px] font-medium">{repostCount}</span>
            )}
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={handleLike}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-100 ease-in-out"
            style={{ color: liked ? '#FF3B30' : 'rgba(255,255,255,0.6)' }}
          >
            <svg className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likeCount > 0 && (
              <span className="text-[14px] font-medium">{likeCount}</span>
            )}
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-100 ease-in-out text-[rgba(255,255,255,0.6)] hover:text-white"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* "Liked by" Text */}
        {likeCount > 0 && (
          <p className="text-[11px] text-[rgba(255,255,255,0.6)] pt-0.5 pb-4">
            Liked by <strong>{likeCount}</strong> {likeCount === 1 ? 'person' : 'people'}
          </p>
        )}

        {/* Divider */}
        <div className="border-t border-[rgba(255,255,255,0.1)] my-4" />

          {/* Comments Section */}
        <div className="space-y-0 pb-32 md:max-w-4xl">
          {comments.length > 0 ? (
            comments.map((comment, idx) => {
              // Get replies for this comment from cache
              const allComments = reviewCommentService.cachedComments(reviewId) || [];
              const replies = allComments.filter(c => c.parent_id === comment.id);
              
              return (
                <div key={comment.id} className="py-2">
                  <CommentCard
                    comment={{
                      ...comment,
                      replies: replies
                    }}
                    onReply={(parentId, content) => {
                      // Handle reply through the bottom composer
                      const commentToReply = comments.find(c => c.id === parentId) || comment;
                      setReplyingTo(commentToReply);
                      setCommentText(`@${commentToReply.profiles?.username || commentToReply.author_username || 'user'} `);
                      setTimeout(() => {
                        document.getElementById('comment-input')?.focus();
                        document.getElementById('comment-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 100);
                    }}
                    onDelete={handleDeleteComment}
                    showReplies={true}
                  />
                  {idx < comments.length - 1 && (
                    <div className="border-t border-[rgba(255,255,255,0.1)] mt-2" />
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-[rgba(255,255,255,0.6)] py-8 text-[14px]">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      </main>

      {/* Reply Composer - Fixed Bottom */}
      {isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 bg-[rgb(31,38,42)] border-t border-[rgba(255,255,255,0.1)] pb-safe">
          <div className="max-w-6xl mx-auto">
            {/* Reply Target Indicator */}
            {replyingTo && (
              <div className="mx-3 md:mx-4 mt-3 mb-2 px-4 py-1.5 rounded-xl bg-[rgb(58,58,62)] flex items-center justify-between">
                <p className="text-[12px] text-[rgba(255,255,255,0.6)]">
                  Replying to @{replyingTo.profiles?.username || replyingTo.author_username || 'user'}
                </p>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-[12px] text-[#007AFF] hover:text-[#0051D5]"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {/* Input Row */}
            <div className="flex items-center gap-3 px-4 md:px-6 py-2.5">
              <Link to={`/profile/${user?.id}`} className="flex-shrink-0">
                <img 
                  src={user?.user_metadata?.avatar_url || '/Images/ProfilePlaceholder.jpg'}
                  alt="You"
                  className="w-8 h-8 rounded-full object-cover"
                />
              </Link>
              <input
                id="comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                placeholder={replyingTo ? `Reply to @${replyingTo.profiles?.username || replyingTo.author_username || 'user'}...` : "Add a comment..."}
                className="flex-1 bg-[rgb(58,58,62)] rounded-full px-4 py-2 text-[14px] text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
              {commentText.trim() && (
                <button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#007AFF] hover:bg-[#0051D5] disabled:bg-[rgb(58,58,62)] rounded-full text-[15px] font-semibold text-white transition-all duration-200 disabled:opacity-50"
                  style={{ transition: 'opacity 0.2s ease, transform 0.2s ease' }}
                >
                  {isSubmitting ? '...' : 'Post'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
