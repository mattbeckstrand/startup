const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Get discoveries feed
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const { data: discoveries, error } = await supabase
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch discoveries' });
    }

    // Add like counts
    const discoveriesWithCounts = await Promise.all((discoveries || []).map(async (discovery) => {
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from('discovery_likes').select('id', { count: 'exact' }).eq('discovery_id', discovery.id),
        supabase.from('discovery_comments').select('id', { count: 'exact' }).eq('discovery_id', discovery.id)
      ]);
      return {
        ...discovery,
        like_count: likesResult.count || 0,
        comment_count: commentsResult.count || 0
      };
    }));

    res.json(discoveriesWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discoveries' });
  }
});

// Get single discovery
router.get('/:discoveryId', async (req, res) => {
  try {
    const { discoveryId } = req.params;

    const { data: discovery, error } = await supabase
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
      .eq('id', discoveryId)
      .single();

    if (error || !discovery) {
      return res.status(404).json({ error: 'Discovery not found' });
    }

    const [likesResult, commentsResult] = await Promise.all([
      supabase.from('discovery_likes').select('id', { count: 'exact' }).eq('discovery_id', discoveryId),
      supabase.from('discovery_comments').select('id', { count: 'exact' }).eq('discovery_id', discoveryId)
    ]);

    res.json({
      ...discovery,
      like_count: likesResult.count || 0,
      comment_count: commentsResult.count || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discovery' });
  }
});

// Create discovery
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id, title, artist, album, message, metadata } = req.body;

    if (!item_type || !item_id) {
      return res.status(400).json({ error: 'item_type and item_id are required' });
    }

    const { data, error } = await supabase
      .from('discoveries')
      .insert({
        user_id: userId,
        item_type,
        item_id,
        title,
        artist,
        album,
        message,
        metadata: metadata || {}
      })
      .select(`
        *,
        profiles!user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create discovery' });
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create discovery' });
  }
});

// Delete discovery
router.delete('/:discoveryId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { discoveryId } = req.params;

    // Verify ownership
    const { data: existing } = await supabase
      .from('discoveries')
      .select('user_id')
      .eq('id', discoveryId)
      .single();

    if (!existing || existing.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this discovery' });
    }

    const { error } = await supabase
      .from('discoveries')
      .delete()
      .eq('id', discoveryId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete discovery' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete discovery' });
  }
});

// Get discoveries by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const { data: discoveries, error } = await supabase
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch user discoveries' });
    }

    res.json(discoveries || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user discoveries' });
  }
});

module.exports = router;

