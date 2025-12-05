import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export function CommentCard({ 
  comment, 
  onReply, 
  onLike,
  onDelete,
  showReplies = true,
  depth = 0 
}) {
  const { user, token, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(comment.is_liked || false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const profile = comment.profiles || {};
  const replies = comment.replies || [];
  const isOwner = user?.id === comment.author_id;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  // Parse @mentions, song links, and album links in content
  const renderContent = (content) => {
    // Match @mentions, song links, and album links
    const patterns = [
      /(@\w+)/g, // Mentions
      /\[song:([^\]]+)\]/g, // Song links [song:title]
      /\[album:([^\]]+)\]/g // Album links [album:title]
    ];
    
    let parts = [content];
    let offset = 0;
    
    // Process mentions
    const mentionMatches = [...content.matchAll(/(@\w+)/g)];
    mentionMatches.forEach(match => {
      const index = match.index;
      const username = match[1].slice(1);
      parts = parts.flatMap(part => {
        if (typeof part === 'string') {
          const partIndex = content.indexOf(part, offset);
          if (partIndex <= index && index < partIndex + part.length) {
            const before = part.slice(0, index - partIndex);
            const mention = match[1];
            const after = part.slice(index - partIndex + mention.length);
            return [
              before,
              <Link 
                key={`mention-${index}`}
                to={`/profile/username/${username}`}
                className="text-[#007AFF] hover:underline"
              >
                {mention}
              </Link>,
              after
            ];
          }
        }
        return part;
      });
    });
    
    // Simple fallback: if no complex parsing needed, just handle mentions
    if (mentionMatches.length === 0) {
      return content;
    }
    
    // Flatten and filter empty strings
    return parts.filter(p => p !== '').map((part, i) => {
      if (typeof part === 'string') {
        // Check if this string contains mentions
        const mentionRegex = /(@\w+)/g;
        const matches = [...part.matchAll(mentionRegex)];
        if (matches.length === 0) {
          return part;
        }
        
        const result = [];
        let lastIndex = 0;
        matches.forEach(match => {
          if (match.index > lastIndex) {
            result.push(part.slice(lastIndex, match.index));
          }
          const username = match[1].slice(1);
          result.push(
            <Link 
              key={`mention-${i}-${match.index}`}
              to={`/profile/username/${username}`}
              className="text-[#007AFF] hover:underline"
            >
              {match[1]}
            </Link>
          );
          lastIndex = match.index + match[1].length;
        });
        if (lastIndex < part.length) {
          result.push(part.slice(lastIndex));
        }
        return result;
      }
      return part;
    });
  };

  const handleLike = async () => {
    if (!isAuthenticated) return;
    
    try {
      const method = liked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/likes/comment/${comment.id}`, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: comment.comment_type || 'review' })
      });
      
      if (response.ok) {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        onLike?.(comment.id, !liked);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onReply?.(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    } catch (error) {
      console.error('Reply error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    onDelete?.(comment.id);
  };

  const maxDepth = 3;
  const visibleReplies = showAllReplies ? replies : replies.slice(0, 2);

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-[rgba(255,255,255,0.1)] pl-4' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar - 32px default */}
        <Link to={`/profile/${profile.id}`} className="flex-shrink-0">
          <img 
            src={profile.avatar_url || '/Images/ProfilePlaceholder.jpg'}
            alt={profile.display_name || profile.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center gap-1 flex-wrap">
            <Link 
              to={`/profile/${profile.id}`} 
              className="text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white hover:underline"
            >
              {profile.display_name || profile.username}
            </Link>
            <span className="text-[14px] text-[rgba(255,255,255,0.6)]">
              · {formatDate(comment.created_at)}
            </span>
            {isEdited && (
              <span className="text-[14px] text-[rgba(255,255,255,0.6)]">
                · (edited)
              </span>
            )}
          </div>

          {/* Comment Content */}
          <p className="text-[14px] text-[rgba(255,255,255,0.6)] mt-0.5 whitespace-pre-wrap leading-relaxed">
            {renderContent(comment.content)}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center mt-2">
            {/* Comment Button - Triggers reply in parent if onReply is provided */}
            <button 
              onClick={() => {
                if (onReply && typeof onReply === 'function') {
                  // If onReply expects (parentId, content), trigger it
                  // Otherwise, show inline reply input
                  if (onReply.length === 2) {
                    onReply(comment.id, '');
                  } else {
                    setShowReplyInput(!showReplyInput);
                  }
                } else {
                  setShowReplyInput(!showReplyInput);
                }
              }}
              className="flex items-center gap-1 pl-0 pr-3.5 py-1 text-[rgba(255,255,255,0.6)] hover:text-white transition-all duration-100 ease-in-out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            {/* Repost Button */}
            <button 
              className="flex items-center gap-1 px-3.5 py-1 text-[rgba(255,255,255,0.6)] hover:text-white transition-all duration-100 ease-in-out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>

            {/* Like Button */}
            <button 
              onClick={handleLike}
              className="flex items-center gap-1 px-3.5 py-1 transition-all duration-100 ease-in-out"
              style={{ color: liked ? '#FF3B30' : 'rgba(255,255,255,0.6)' }}
            >
              <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likeCount > 0 && (
                <span className="text-[14px] font-medium">{likeCount}</span>
              )}
            </button>

            {/* Delete Button (Owner only) */}
            {isOwner && (
              <button 
                onClick={handleDelete}
                className="ml-auto px-3.5 py-1 text-[rgba(255,255,255,0.6)] hover:text-red-500 text-[14px] transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input - Hidden in detail view, handled by bottom composer */}
          {showReplyInput && depth < maxDepth && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                placeholder={`Reply to @${profile.username}...`}
                className="flex-1 bg-[rgb(58,58,62)] rounded-full px-4 py-2 text-[14px] text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || isSubmitting}
                className="px-4 py-2 bg-[#007AFF] hover:bg-[#0051D5] disabled:bg-[rgb(58,58,62)] rounded-full text-[14px] font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '...' : 'Reply'}
              </button>
            </div>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-3">
              {visibleReplies.map(reply => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onLike={onLike}
                  onDelete={onDelete}
                  depth={depth + 1}
                />
              ))}
              
              {replies.length > 2 && !showAllReplies && (
                <button 
                  onClick={() => setShowAllReplies(true)}
                  className="text-blue-400 text-sm hover:underline mt-2"
                >
                  Show {replies.length - 2} more {replies.length - 2 === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

