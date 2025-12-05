const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Helper to extract @mentions from content
function extractMentions(content) {
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);
  return matches ? matches.map(m => m.slice(1)) : [];
}

// Helper to create notifications for mentions
async function createMentionNotifications(mentionedUsernames, mentioningUserId, contentType, contentId) {
  if (!mentionedUsernames.length) return;

  // Get user IDs for mentioned usernames
  const { data: mentionedUsers } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', mentionedUsernames);

  if (!mentionedUsers?.length) return;

  // Get mentioning user info
  const { data: actor } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', mentioningUserId)
    .single();

  // Create mention records and notifications
  for (const user of mentionedUsers) {
    if (user.id === mentioningUserId) continue; // Don't notify self

    await supabase.from('mentions').insert({
      mentioned_user_id: user.id,
      mentioning_user_id: mentioningUserId,
      content_type: contentType,
      content_id: contentId
    });

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'mention',
      title: `${actor?.display_name || actor?.username} mentioned you`,
      message: 'Tap to view',
      actor_id: mentioningUserId,
      actor_username: actor?.username,
      actor_avatar_url: actor?.avatar_url,
      content_type: contentType,
      content_id: contentId
    });
  }
}

// ============ REVIEW COMMENTS ============

// Get comments for a review (ALL comments, including replies)
router.get('/review/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Step 1: Fetch all comments with author profiles
    const { data: comments, error } = await supabase
      .from('review_comments')
      .select(`
        *,
        profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    if (!comments || comments.length === 0) {
      return res.json([]);
    }

    // Step 2: Fetch mentions for each comment
    const commentsWithMentions = await Promise.all((comments || []).map(async (comment) => {
      // Get mentions for this comment
      const { data: mentions } = await supabase
        .from('mentions')
        .select(`
          *,
          profiles!mentioned_user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('content_type', 'review_comment')
        .eq('content_id', comment.id);

      // Get like count
      const { count: likeCount } = await supabase
        .from('comment_likes')
        .select('id', { count: 'exact' })
        .eq('comment_id', comment.id);

      return {
        ...comment,
        like_count: likeCount || 0,
        mentioned_users: mentions?.map(m => m.profiles).filter(Boolean) || []
      };
    }));

    res.json(commentsWithMentions);
  } catch (error) {
    console.error('Error fetching review comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get comment count for a review
router.get('/review/:reviewId/count', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { count, error } = await supabase
      .from('review_comments')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch comment count' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comment count' });
  }
});

// Add comment to review
router.post('/review/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { content, parent_id } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Content filtering (basic validation)
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    // Extract and validate mentions
    const mentionedUsernames = extractMentions(trimmedContent);
    
    // Validate mentioned users exist
    if (mentionedUsernames.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentionedUsernames);
      
      // Filter out invalid mentions (users that don't exist)
      const validUsernames = mentionedUsers?.map(u => u.username) || [];
      if (mentionedUsernames.length !== validUsernames.length) {
        // Some mentions are invalid, but we'll still create the comment
        // Just log or handle as needed
      }
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from('review_comments')
      .insert({
        review_id: reviewId,
        author_id: userId,
        content: trimmedContent,
        parent_id: parent_id || null
      })
      .select(`
        *,
        profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add comment' });
    }

    // Save mentions
    if (mentionedUsernames.length > 0) {
      await createMentionNotifications(mentionedUsernames, userId, 'review_comment', comment.id);
    }

    // Create notification
    // If parentId is null: notify post author
    // If parentId is not null: notify parent comment author
    if (parent_id) {
      // Notify parent comment author
      const { data: parentComment } = await supabase
        .from('review_comments')
        .select('author_id')
        .eq('id', parent_id)
        .single();

      if (parentComment && parentComment.author_id !== userId) {
        const { data: actor } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', userId)
          .single();

        await supabase.from('notifications').insert({
          user_id: parentComment.author_id,
          type: 'comment',
          title: 'New reply',
          message: `${actor?.display_name || actor?.username} replied to your comment`,
          actor_id: userId,
          actor_username: actor?.username,
          actor_avatar_url: actor?.avatar_url,
          content_type: 'review_comment',
          content_id: comment.id
        });
      }
    } else {
      // Notify review author
      const { data: review } = await supabase
        .from('reviews')
        .select('user_id, title')
        .eq('id', reviewId)
        .single();

      if (review && review.user_id !== userId) {
        const { data: actor } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', userId)
          .single();

        await supabase.from('notifications').insert({
          user_id: review.user_id,
          type: 'comment',
          title: 'New comment',
          message: `${actor?.display_name || actor?.username} commented on your review`,
          actor_id: userId,
          actor_username: actor?.username,
          actor_avatar_url: actor?.avatar_url,
          content_type: 'review',
          content_id: reviewId,
          content_title: review.title
        });
      }
    }

    // Fetch mentions for the response
    const { data: mentions } = await supabase
      .from('mentions')
      .select(`
        *,
        profiles!mentioned_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('content_type', 'review_comment')
      .eq('content_id', comment.id);

    res.status(201).json({
      ...comment,
      mentioned_users: mentions?.map(m => m.profiles).filter(Boolean) || []
    });
  } catch (error) {
    console.error('Error adding review comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============ DISCOVERY COMMENTS ============

// Get comments for a discovery (ALL comments, including replies)
router.get('/discovery/:discoveryId', async (req, res) => {
  try {
    const { discoveryId } = req.params;

    // Step 1: Fetch all comments with author profiles
    const { data: comments, error } = await supabase
      .from('discovery_comments')
      .select(`
        *,
        profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('discovery_id', discoveryId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    if (!comments || comments.length === 0) {
      return res.json([]);
    }

    // Step 2: Fetch mentions for each comment
    const commentsWithMentions = await Promise.all((comments || []).map(async (comment) => {
      // Get mentions for this comment
      const { data: mentions } = await supabase
        .from('mentions')
        .select(`
          *,
          profiles!mentioned_user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('content_type', 'discovery_comment')
        .eq('content_id', comment.id);

      // Get like count
      const { count: likeCount } = await supabase
        .from('comment_likes')
        .select('id', { count: 'exact' })
        .eq('comment_id', comment.id);

      return {
        ...comment,
        like_count: likeCount || 0,
        mentioned_users: mentions?.map(m => m.profiles).filter(Boolean) || []
      };
    }));

    res.json(commentsWithMentions);
  } catch (error) {
    console.error('Error fetching discovery comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get comment count for a discovery
router.get('/discovery/:discoveryId/count', async (req, res) => {
  try {
    const { discoveryId } = req.params;
    const { count, error } = await supabase
      .from('discovery_comments')
      .select('id', { count: 'exact', head: true })
      .eq('discovery_id', discoveryId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch comment count' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comment count' });
  }
});

// Add comment to discovery
router.post('/discovery/:discoveryId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { discoveryId } = req.params;
    const { content, parent_id } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Content filtering (basic validation)
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    // Extract and validate mentions
    const mentionedUsernames = extractMentions(trimmedContent);
    
    // Validate mentioned users exist
    if (mentionedUsernames.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentionedUsernames);
      
      // Filter out invalid mentions (users that don't exist)
      const validUsernames = mentionedUsers?.map(u => u.username) || [];
      if (mentionedUsernames.length !== validUsernames.length) {
        // Some mentions are invalid, but we'll still create the comment
      }
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from('discovery_comments')
      .insert({
        discovery_id: discoveryId,
        author_id: userId,
        content: trimmedContent,
        parent_id: parent_id || null
      })
      .select(`
        *,
        profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add comment' });
    }

    // Save mentions
    if (mentionedUsernames.length > 0) {
      await createMentionNotifications(mentionedUsernames, userId, 'discovery_comment', comment.id);
    }

    // Create notification
    // If parentId is null: notify post author
    // If parentId is not null: notify parent comment author
    if (parent_id) {
      // Notify parent comment author
      const { data: parentComment } = await supabase
        .from('discovery_comments')
        .select('author_id')
        .eq('id', parent_id)
        .single();

      if (parentComment && parentComment.author_id !== userId) {
        const { data: actor } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', userId)
          .single();

        await supabase.from('notifications').insert({
          user_id: parentComment.author_id,
          type: 'comment',
          title: 'New reply',
          message: `${actor?.display_name || actor?.username} replied to your comment`,
          actor_id: userId,
          actor_username: actor?.username,
          actor_avatar_url: actor?.avatar_url,
          content_type: 'discovery_comment',
          content_id: comment.id
        });
      }
    } else {
      // Notify discovery author
      const { data: discovery } = await supabase
        .from('discoveries')
        .select('user_id, title')
        .eq('id', discoveryId)
        .single();

      if (discovery && discovery.user_id !== userId) {
        const { data: actor } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', userId)
          .single();

        await supabase.from('notifications').insert({
          user_id: discovery.user_id,
          type: 'comment',
          title: 'New comment',
          message: `${actor?.display_name || actor?.username} commented on your discovery`,
          actor_id: userId,
          actor_username: actor?.username,
          actor_avatar_url: actor?.avatar_url,
          content_type: 'discovery',
          content_id: discoveryId,
          content_title: discovery.title
        });
      }
    }

    // Fetch mentions for the response
    const { data: mentions } = await supabase
      .from('mentions')
      .select(`
        *,
        profiles!mentioned_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('content_type', 'discovery_comment')
      .eq('content_id', comment.id);

    res.status(201).json({
      ...comment,
      mentioned_users: mentions?.map(m => m.profiles).filter(Boolean) || []
    });
  } catch (error) {
    console.error('Error adding discovery comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============ COMMON COMMENT OPERATIONS ============

// Update comment
router.put('/:commentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    const { content, type } = req.body; // type: 'review' or 'discovery'

    const table = type === 'discovery' ? 'discovery_comments' : 'review_comments';
    const contentType = type === 'discovery' ? 'discovery_comment' : 'review_comment';

    // Verify ownership
    const { data: existing } = await supabase
      .from(table)
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (!existing || existing.author_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Content filtering
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    // Update comment
    const { data: comment, error } = await supabase
      .from(table)
      .update({ 
        content: trimmedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select(`
        *,
        profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update comment' });
    }

    // Reconcile mentions: delete old, save new
    // Delete old mentions
    await supabase
      .from('mentions')
      .delete()
      .eq('content_type', contentType)
      .eq('content_id', commentId);

    // Extract and save new mentions
    const mentionedUsernames = extractMentions(trimmedContent);
    if (mentionedUsernames.length > 0) {
      await createMentionNotifications(mentionedUsernames, userId, contentType, commentId);
    }

    // Fetch updated mentions
    const { data: mentions } = await supabase
      .from('mentions')
      .select(`
        *,
        profiles!mentioned_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('content_type', contentType)
      .eq('content_id', commentId);

    res.json({
      ...comment,
      mentioned_users: mentions?.map(m => m.profiles).filter(Boolean) || []
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment
router.delete('/:commentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    const { type } = req.query; // type: 'review' or 'discovery'

    const table = type === 'discovery' ? 'discovery_comments' : 'review_comments';

    // Verify ownership
    const { data: existing } = await supabase
      .from(table)
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (!existing || existing.author_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', commentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete comment' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Get reply count for a comment
router.get('/:commentId/reply-count', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { type } = req.query;

    const table = type === 'discovery' ? 'discovery_comments' : 'review_comments';

    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', commentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch reply count' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reply count' });
  }
});

// Get comments by user (for profile "Replies" tab)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Get review comments
    const { data: reviewComments } = await supabase
      .from('review_comments')
      .select(`
        *,
        profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        reviews!review_id (
          id,
          title,
          artist,
          album_art_url
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Get discovery comments
    const { data: discoveryComments } = await supabase
      .from('discovery_comments')
      .select(`
        *,
        profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        discoveries!discovery_id (
          id,
          title,
          artist
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Combine and sort
    const allComments = [
      ...(reviewComments || []).map(c => ({ ...c, comment_type: 'review' })),
      ...(discoveryComments || []).map(c => ({ ...c, comment_type: 'discovery' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allComments.slice(0, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user comments' });
  }
});

// Get user's total comment count
router.get('/user/:userId/count', async (req, res) => {
  try {
    const { userId } = req.params;

    const [reviewCount, discoveryCount] = await Promise.all([
      supabase
        .from('review_comments')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId),
      supabase
        .from('discovery_comments')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
    ]);

    const total = (reviewCount.count || 0) + (discoveryCount.count || 0);
    res.json({ count: total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user comment count' });
  }
});

module.exports = router;

