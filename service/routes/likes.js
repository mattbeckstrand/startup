const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Helper to create like notification
async function createLikeNotification(contentOwnerId, actorId, contentType, contentId, contentTitle) {
  if (contentOwnerId === actorId) return; // Don't notify self

  const { data: actor } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', actorId)
    .single();

  await supabase.from('notifications').insert({
    user_id: contentOwnerId,
    type: 'like',
    title: 'New like',
    message: `${actor?.display_name || actor?.username} liked your ${contentType}`,
    actor_id: actorId,
    actor_username: actor?.username,
    actor_avatar_url: actor?.avatar_url,
    content_type: contentType,
    content_id: contentId,
    content_title: contentTitle
  });
}

// ============ REVIEW LIKES ============

// Like a review
router.post('/review/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    // Check if already liked
    const { data: existing } = await supabase
      .from('review_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('review_id', reviewId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already liked' });
    }

    const { error } = await supabase
      .from('review_likes')
      .insert({ user_id: userId, review_id: reviewId });

    if (error) {
      return res.status(500).json({ error: 'Failed to like review' });
    }

    // Get review owner for notification
    const { data: review } = await supabase
      .from('reviews')
      .select('user_id, title')
      .eq('id', reviewId)
      .single();

    if (review) {
      await createLikeNotification(review.user_id, userId, 'review', reviewId, review.title);
    }

    // Return updated count
    const { count } = await supabase
      .from('review_likes')
      .select('id', { count: 'exact' })
      .eq('review_id', reviewId);

    res.json({ liked: true, like_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like review' });
  }
});

// Unlike a review
router.delete('/review/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('user_id', userId)
      .eq('review_id', reviewId);

    if (error) {
      return res.status(500).json({ error: 'Failed to unlike review' });
    }

    // Return updated count
    const { count } = await supabase
      .from('review_likes')
      .select('id', { count: 'exact' })
      .eq('review_id', reviewId);

    res.json({ liked: false, like_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlike review' });
  }
});

// Check if review is liked + get count
router.get('/review/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const [likeCheck, countResult] = await Promise.all([
      supabase.from('review_likes').select('id').eq('user_id', userId).eq('review_id', reviewId).single(),
      supabase.from('review_likes').select('id', { count: 'exact' }).eq('review_id', reviewId)
    ]);

    res.json({
      liked: !!likeCheck.data,
      like_count: countResult.count || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check like status' });
  }
});

// ============ DISCOVERY LIKES ============

// Like a discovery
router.post('/discovery/:discoveryId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { discoveryId } = req.params;

    const { data: existing } = await supabase
      .from('discovery_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('discovery_id', discoveryId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already liked' });
    }

    const { error } = await supabase
      .from('discovery_likes')
      .insert({ user_id: userId, discovery_id: discoveryId });

    if (error) {
      return res.status(500).json({ error: 'Failed to like discovery' });
    }

    // Get discovery owner for notification
    const { data: discovery } = await supabase
      .from('discoveries')
      .select('user_id, title')
      .eq('id', discoveryId)
      .single();

    if (discovery) {
      await createLikeNotification(discovery.user_id, userId, 'discovery', discoveryId, discovery.title);
    }

    const { count } = await supabase
      .from('discovery_likes')
      .select('id', { count: 'exact' })
      .eq('discovery_id', discoveryId);

    res.json({ liked: true, like_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like discovery' });
  }
});

// Unlike a discovery
router.delete('/discovery/:discoveryId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { discoveryId } = req.params;

    const { error } = await supabase
      .from('discovery_likes')
      .delete()
      .eq('user_id', userId)
      .eq('discovery_id', discoveryId);

    if (error) {
      return res.status(500).json({ error: 'Failed to unlike discovery' });
    }

    const { count } = await supabase
      .from('discovery_likes')
      .select('id', { count: 'exact' })
      .eq('discovery_id', discoveryId);

    res.json({ liked: false, like_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlike discovery' });
  }
});

// ============ COMMENT LIKES ============

// Like a comment
router.post('/comment/:commentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    const { type } = req.body; // 'review' or 'discovery'

    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already liked' });
    }

    const { error } = await supabase
      .from('comment_likes')
      .insert({ 
        user_id: userId, 
        comment_id: commentId,
        comment_type: type || 'review'
      });

    if (error) {
      return res.status(500).json({ error: 'Failed to like comment' });
    }

    const { count } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact' })
      .eq('comment_id', commentId);

    res.json({ liked: true, like_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// Unlike a comment
router.delete('/comment/:commentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;

    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to unlike comment' });
    }

    const { count } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact' })
      .eq('comment_id', commentId);

    res.json({ liked: false, like_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
});

module.exports = router;

