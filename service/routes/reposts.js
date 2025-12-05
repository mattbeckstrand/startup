const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Create repost
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content_type, content_id } = req.body;

    if (!content_type || !content_id) {
      return res.status(400).json({ error: 'content_type and content_id are required' });
    }

    // Check if already reposted
    const { data: existing } = await supabase
      .from('reposts')
      .select('id')
      .eq('user_id', userId)
      .eq('content_type', content_type)
      .eq('content_id', content_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already reposted' });
    }

    const { data: repost, error } = await supabase
      .from('reposts')
      .insert({
        user_id: userId,
        content_type,
        content_id
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create repost' });
    }

    // Create notification for content owner
    let contentOwnerId, contentTitle;
    if (content_type === 'review') {
      const { data: review } = await supabase
        .from('reviews')
        .select('user_id, title')
        .eq('id', content_id)
        .single();
      contentOwnerId = review?.user_id;
      contentTitle = review?.title;
    } else if (content_type === 'discovery') {
      const { data: discovery } = await supabase
        .from('discoveries')
        .select('user_id, title')
        .eq('id', content_id)
        .single();
      contentOwnerId = discovery?.user_id;
      contentTitle = discovery?.title;
    }

    if (contentOwnerId && contentOwnerId !== userId) {
      const { data: actor } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', userId)
        .single();

      await supabase.from('notifications').insert({
        user_id: contentOwnerId,
        type: 'repost',
        title: 'New repost',
        message: `${actor?.display_name || actor?.username} reposted your ${content_type}`,
        actor_id: userId,
        actor_username: actor?.username,
        actor_avatar_url: actor?.avatar_url,
        content_type,
        content_id,
        content_title: contentTitle
      });
    }

    // Get repost count
    const { count } = await supabase
      .from('reposts')
      .select('id', { count: 'exact' })
      .eq('content_type', content_type)
      .eq('content_id', content_id);

    res.status(201).json({ 
      repost,
      reposted: true,
      repost_count: count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create repost' });
  }
});

// Delete repost
router.delete('/:contentType/:contentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentType, contentId } = req.params;

    const { error } = await supabase
      .from('reposts')
      .delete()
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete repost' });
    }

    // Get updated count
    const { count } = await supabase
      .from('reposts')
      .select('id', { count: 'exact' })
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    res.json({ 
      reposted: false,
      repost_count: count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete repost' });
  }
});

// Check if reposted
router.get('/check/:contentType/:contentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentType, contentId } = req.params;

    const { data: repost } = await supabase
      .from('reposts')
      .select('id')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .single();

    const { count } = await supabase
      .from('reposts')
      .select('id', { count: 'exact' })
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    res.json({
      reposted: !!repost,
      repost_count: count || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check repost status' });
  }
});

// Get repost count
router.get('/count/:contentType/:contentId', async (req, res) => {
  try {
    const { contentType, contentId } = req.params;

    const { count } = await supabase
      .from('reposts')
      .select('id', { count: 'exact' })
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    res.json({ repost_count: count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get repost count' });
  }
});

// Get user's reposts
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const { data: reposts, error } = await supabase
      .from('reposts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch reposts' });
    }

    // Fetch full content for each repost
    const repostsWithContent = await Promise.all((reposts || []).map(async (repost) => {
      if (repost.content_type === 'review') {
        const { data: review } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles!user_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('id', repost.content_id)
          .single();
        return { ...repost, content: review };
      } else if (repost.content_type === 'discovery') {
        const { data: discovery } = await supabase
          .from('discoveries')
          .select(`
            *,
            profiles!user_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('id', repost.content_id)
          .single();
        return { ...repost, content: discovery };
      }
      return repost;
    }));

    res.json(repostsWithContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reposts' });
  }
});

module.exports = router;

