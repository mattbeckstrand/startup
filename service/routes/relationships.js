const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Follow a user
router.post('/follow/:userId', requireAuth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followingId } = req.params;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('user_relationships')
      .select('status')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already following or pending', status: existing.status });
    }

    // Check if target user has private account
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('privacy_settings, username, display_name')
      .eq('id', followingId)
      .single();

    const isPrivate = targetProfile?.privacy_settings?.is_private_account;
    const status = isPrivate ? 'pending' : 'following';

    const { error } = await supabase
      .from('user_relationships')
      .insert({
        follower_id: followerId,
        following_id: followingId,
        status
      });

    if (error) {
      return res.status(500).json({ error: 'Failed to follow user' });
    }

    // Create notification
    const { data: actor } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', followerId)
      .single();

    await supabase.from('notifications').insert({
      user_id: followingId,
      type: isPrivate ? 'follow_request' : 'follow',
      title: isPrivate ? 'New follow request' : 'New follower',
      message: `${actor?.display_name || actor?.username} ${isPrivate ? 'wants to follow you' : 'started following you'}`,
      actor_id: followerId,
      actor_username: actor?.username,
      actor_avatar_url: actor?.avatar_url
    });

    res.json({ 
      success: true, 
      status,
      message: isPrivate ? 'Follow request sent' : 'Now following'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/follow/:userId', requireAuth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followingId } = req.params;

    const { error } = await supabase
      .from('user_relationships')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      return res.status(500).json({ error: 'Failed to unfollow user' });
    }

    res.json({ success: true, status: 'not_following' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get relationship status with a user
router.get('/status/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetUserId } = req.params;

    if (currentUserId === targetUserId) {
      return res.json({ status: 'self' });
    }

    // Check if current user follows target
    const { data: following } = await supabase
      .from('user_relationships')
      .select('status')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();

    // Check if target follows current user (for "follows you" badge)
    const { data: followedBy } = await supabase
      .from('user_relationships')
      .select('status')
      .eq('follower_id', targetUserId)
      .eq('following_id', currentUserId)
      .single();

    // Check if target has pending request to current user
    const { data: pendingRequest } = await supabase
      .from('user_relationships')
      .select('status')
      .eq('follower_id', targetUserId)
      .eq('following_id', currentUserId)
      .eq('status', 'pending')
      .single();

    res.json({
      status: following?.status || 'not_following',
      follows_you: followedBy?.status === 'following',
      has_pending_request: !!pendingRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get relationship status' });
  }
});

// Get pending follow requests (for private accounts)
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: requests, error } = await supabase
      .from('user_relationships')
      .select(`
        *,
        profiles!follower_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('following_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch pending requests' });
    }

    res.json(requests || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Accept follow request
router.post('/accept/:followerId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { followerId } = req.params;

    const { error } = await supabase
      .from('user_relationships')
      .update({ status: 'following' })
      .eq('follower_id', followerId)
      .eq('following_id', userId)
      .eq('status', 'pending');

    if (error) {
      return res.status(500).json({ error: 'Failed to accept request' });
    }

    // Notify the follower that their request was accepted
    const { data: actor } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', userId)
      .single();

    await supabase.from('notifications').insert({
      user_id: followerId,
      type: 'follow',
      title: 'Follow request accepted',
      message: `${actor?.display_name || actor?.username} accepted your follow request`,
      actor_id: userId,
      actor_username: actor?.username,
      actor_avatar_url: actor?.avatar_url
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// Decline follow request
router.post('/decline/:followerId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { followerId } = req.params;

    const { error } = await supabase
      .from('user_relationships')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', userId)
      .eq('status', 'pending');

    if (error) {
      return res.status(500).json({ error: 'Failed to decline request' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// Get followers list
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data: followers, error } = await supabase
      .from('user_relationships')
      .select(`
        *,
        profiles!follower_id (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq('following_id', userId)
      .eq('status', 'following')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch followers' });
    }

    res.json(followers?.map(f => f.profiles) || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get following list
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data: following, error } = await supabase
      .from('user_relationships')
      .select(`
        *,
        profiles!following_id (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq('follower_id', userId)
      .eq('status', 'following')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch following' });
    }

    res.json(following?.map(f => f.profiles) || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Remove a follower
router.delete('/followers/:followerId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { followerId } = req.params;

    const { error } = await supabase
      .from('user_relationships')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to remove follower' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove follower' });
  }
});

module.exports = router;

