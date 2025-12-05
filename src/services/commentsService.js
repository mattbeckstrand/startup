// Comment Service Classes with Caching
// Implements the same pattern as the Swift/iOS version

class CommentService {
  constructor(tableName, contentType) {
    this.tableName = tableName;
    this.contentType = contentType;
    this.cache = new Map(); // In-memory cache: postId -> [comments]
  }

  // Get cached comments for a post
  cachedComments(postId) {
    return this.cache.get(postId) || null;
  }

  // Clear cache for a specific post
  clearCache(postId) {
    this.cache.delete(postId);
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear();
  }

  // Fetch all comments for a post (including replies)
  async fetchComments(postId) {
    try {
      const response = await fetch(`/api/comments/${this.contentType}/${postId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const comments = await response.json();
      
      // Populate cache
      this.cache.set(postId, comments);
      
      return comments;
    } catch (error) {
      console.error(`Error fetching ${this.contentType} comments:`, error);
      throw error;
    }
  }

  // Get comment count for a post
  async getCommentCount(postId) {
    try {
      const response = await fetch(`/api/comments/${this.contentType}/${postId}/count`);
      if (!response.ok) {
        throw new Error('Failed to fetch comment count');
      }
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error(`Error fetching comment count:`, error);
      return 0;
    }
  }

  // Get reply count for a comment
  async getReplyCount(commentId) {
    try {
      const response = await fetch(`/api/comments/${commentId}/reply-count?type=${this.contentType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reply count');
      }
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error(`Error fetching reply count:`, error);
      return 0;
    }
  }

  // Add a comment
  async addComment(postId, content, parentId = null, token) {
    try {
      const response = await fetch(`/api/comments/${this.contentType}/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: content.trim(),
          parent_id: parentId
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add comment' }));
        throw new Error(error.error || 'Failed to add comment');
      }

      const newComment = await response.json();

      // Update cache - append new comment
      const cached = this.cache.get(postId);
      if (cached) {
        cached.push(newComment);
        this.cache.set(postId, cached);
      } else {
        // If not cached, fetch fresh
        await this.fetchComments(postId);
      }

      return newComment;
    } catch (error) {
      console.error(`Error adding comment:`, error);
      throw error;
    }
  }

  // Update a comment
  async updateComment(commentId, content, token) {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: content.trim(),
          type: this.contentType
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update comment' }));
        throw new Error(error.error || 'Failed to update comment');
      }

      const updatedComment = await response.json();

      // Update cache entry if present
      for (const [postId, comments] of this.cache.entries()) {
        const index = comments.findIndex(c => c.id === commentId);
        if (index !== -1) {
          comments[index] = updatedComment;
          this.cache.set(postId, comments);
          break;
        }
      }

      return updatedComment;
    } catch (error) {
      console.error(`Error updating comment:`, error);
      throw error;
    }
  }

  // Delete a comment
  async deleteComment(commentId, token) {
    try {
      const response = await fetch(`/api/comments/${commentId}?type=${this.contentType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete comment' }));
        throw new Error(error.error || 'Failed to delete comment');
      }

      // Remove from cache
      for (const [postId, comments] of this.cache.entries()) {
        const filtered = comments.filter(c => c.id !== commentId);
        if (filtered.length !== comments.length) {
          this.cache.set(postId, filtered);
          break;
        }
      }

      return true;
    } catch (error) {
      console.error(`Error deleting comment:`, error);
      throw error;
    }
  }

  // Force refresh comments (clear cache and fetch fresh)
  async forceRefreshComments(postId) {
    this.clearCache(postId);
    return await this.fetchComments(postId);
  }

  // Prefetch comments (for performance)
  async prefetchComments(postId) {
    if (!this.cache.has(postId)) {
      return await this.fetchComments(postId);
    }
    return this.cache.get(postId);
  }
}

// Review Comment Service
export const reviewCommentService = new CommentService('review_comments', 'review');

// Discovery Comment Service
export const discoveryCommentService = new CommentService('discovery_comments', 'discovery');

// Helper to get user's total comment count
export async function getUserCommentCount(userId) {
  try {
    const response = await fetch(`/api/comments/user/${userId}/count`);
    if (!response.ok) {
      throw new Error('Failed to fetch user comment count');
    }
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error fetching user comment count:', error);
    return 0;
  }
}

