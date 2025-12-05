const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Get current user's profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update current user's profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      username, 
      display_name, 
      first_name, 
      last_name, 
      avatar_url, 
      bio,
      website_links,
      theme_preference,
      notification_settings,
      privacy_settings,
      primary_music_platform
    } = req.body;

    // If username is being changed, check if it's available
    if (username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', userId)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username.toLowerCase();
    if (display_name !== undefined) updateData.display_name = display_name;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (bio !== undefined) updateData.bio = bio;
    if (website_links !== undefined) updateData.website_links = website_links;
    if (theme_preference !== undefined) updateData.theme_preference = theme_preference;
    if (notification_settings !== undefined) updateData.notification_settings = notification_settings;
    if (privacy_settings !== undefined) updateData.privacy_settings = privacy_settings;
    if (primary_music_platform !== undefined) updateData.primary_music_platform = primary_music_platform;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get follow counts
    const [followersResult, followingResult] = await Promise.all([
      supabase.from('user_relationships').select('id', { count: 'exact' }).eq('following_id', userId).eq('status', 'following'),
      supabase.from('user_relationships').select('id', { count: 'exact' }).eq('follower_id', userId).eq('status', 'following')
    ]);

    // Get review count
    const { count: reviewCount } = await supabase
      .from('reviews')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    res.json({
      ...profile,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0,
      review_count: reviewCount || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get profile by username
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get follow counts
    const [followersResult, followingResult] = await Promise.all([
      supabase.from('user_relationships').select('id', { count: 'exact' }).eq('following_id', profile.id).eq('status', 'following'),
      supabase.from('user_relationships').select('id', { count: 'exact' }).eq('follower_id', profile.id).eq('status', 'following')
    ]);

    res.json({
      ...profile,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Search users
router.get('/search/users', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchTerm = q.toLowerCase();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({ error: 'Search failed' });
    }

    res.json(profiles || []);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user's reviews
router.get('/:userId/reviews', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const { data: reviews, error } = await supabase
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }

    res.json(reviews || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get user's followers
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data: followers, error } = await supabase
      .from('user_relationships')
      .select(`
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
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch followers' });
    }

    res.json(followers?.map(f => f.profiles) || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get who user follows
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data: following, error } = await supabase
      .from('user_relationships')
      .select(`
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
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch following' });
    }

    res.json(following?.map(f => f.profiles) || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Get follow counts (using RPC for efficiency)
router.get('/follow-counts', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization.split(' ')[1];
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data, error } = await supabaseClient
      .rpc('get_follow_counts', { p_user_id: userId });

    if (error) {
      // Fallback to direct query if RPC doesn't exist
      const [followersResult, followingResult] = await Promise.all([
        supabase.from('user_relationships').select('id', { count: 'exact' }).eq('following_id', userId).eq('status', 'following'),
        supabase.from('user_relationships').select('id', { count: 'exact' }).eq('follower_id', userId).eq('status', 'following')
      ]);
      
      return res.json({
        followers_count: followersResult.count || 0,
        following_count: followingResult.count || 0
      });
    }

    res.json(data[0] || { followers_count: 0, following_count: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get follow counts' });
  }
});

// Legacy route for backwards compatibility
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
