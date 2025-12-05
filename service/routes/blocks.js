const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// ============ BLOCK USERS ============

// Block a user
router.post('/user/:userId', requireAuth, async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId: blockedId } = req.params;

    if (blockerId === blockedId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'User already blocked' });
    }

    // Block user
    const { error: blockError } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId
      });

    if (blockError) {
      return res.status(500).json({ error: 'Failed to block user' });
    }

    // Remove any existing follow relationships (both directions)
    await supabase
      .from('user_relationships')
      .delete()
      .or(`and(follower_id.eq.${blockerId},following_id.eq.${blockedId}),and(follower_id.eq.${blockedId},following_id.eq.${blockerId})`);

    res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock a user
router.delete('/user/:userId', requireAuth, async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId: blockedId } = req.params;

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      return res.status(500).json({ error: 'Failed to unblock user' });
    }

    res.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Get blocked users list
router.get('/users', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: blockedUsers, error } = await supabase
      .from('blocked_users')
      .select(`
        *,
        profiles!blocked_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch blocked users' });
    }

    res.json(blockedUsers?.map(b => ({
      ...b.profiles,
      blocked_at: b.created_at
    })) || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// Check if user is blocked
router.get('/user/:userId/check', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetUserId } = req.params;

    // Check if current user blocked target
    const { data: blockedByMe } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetUserId)
      .single();

    // Check if target blocked current user
    const { data: blockedByThem } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', targetUserId)
      .eq('blocked_id', currentUserId)
      .single();

    res.json({
      blocked_by_me: !!blockedByMe,
      blocked_by_them: !!blockedByThem,
      is_blocked: !!blockedByMe || !!blockedByThem
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check block status' });
  }
});

// ============ BLOCK SONGS ============

// Block a song (hide from recommendations)
router.post('/song/:songId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { songId } = req.params;

    const { data: existing } = await supabase
      .from('blocked_songs')
      .select('id')
      .eq('user_id', userId)
      .eq('song_id', songId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Song already blocked' });
    }

    const { error } = await supabase
      .from('blocked_songs')
      .insert({
        user_id: userId,
        song_id: songId
      });

    if (error) {
      return res.status(500).json({ error: 'Failed to block song' });
    }

    res.json({ success: true, message: 'Song blocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block song' });
  }
});

// Unblock a song
router.delete('/song/:songId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { songId } = req.params;

    const { error } = await supabase
      .from('blocked_songs')
      .delete()
      .eq('user_id', userId)
      .eq('song_id', songId);

    if (error) {
      return res.status(500).json({ error: 'Failed to unblock song' });
    }

    res.json({ success: true, message: 'Song unblocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock song' });
  }
});

// Get blocked songs list
router.get('/songs', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: blockedSongs, error } = await supabase
      .from('blocked_songs')
      .select(`
        *,
        songs!song_id (
          id,
          title,
          artist,
          album,
          album_art_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch blocked songs' });
    }

    res.json(blockedSongs?.map(b => ({
      ...b.songs,
      blocked_at: b.created_at
    })) || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked songs' });
  }
});

module.exports = router;

