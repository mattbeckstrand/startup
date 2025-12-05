const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Get current user's reviews (protected)
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch user reviews', details: error.message });
    }

    // Add interaction counts
    const reviewsWithCounts = await Promise.all(reviews.map(async (review) => {
      const [likesResult, commentsResult, repostsResult] = await Promise.all([
        supabase.from('review_likes').select('id', { count: 'exact' }).eq('review_id', review.id),
        supabase.from('review_comments').select('id', { count: 'exact' }).eq('review_id', review.id),
        supabase.from('reposts').select('id', { count: 'exact' }).eq('content_type', 'review').eq('content_id', review.id)
      ]);
      return {
        ...review,
        like_count: likesResult.count || 0,
        comment_count: commentsResult.count || 0,
        repost_count: repostsResult.count || 0
      };
    }));

    res.json(reviewsWithCounts);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

// Get all reviews (public feed - "For You")
router.get('/', async (req, res) => {
  try {
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
          avatar_url,
          privacy_settings
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
    }

    // Filter out private accounts for public feed
    const publicReviews = reviews.filter(r => 
      !r.profiles?.privacy_settings?.is_private_account
    );

    // Add interaction counts
    const reviewsWithCounts = await Promise.all(publicReviews.map(async (review) => {
      const [likesResult, commentsResult, repostsResult] = await Promise.all([
        supabase.from('review_likes').select('id', { count: 'exact' }).eq('review_id', review.id),
        supabase.from('review_comments').select('id', { count: 'exact' }).eq('review_id', review.id),
        supabase.from('reposts').select('id', { count: 'exact' }).eq('content_type', 'review').eq('content_id', review.id)
      ]);
      return {
        ...review,
        like_count: likesResult.count || 0,
        comment_count: commentsResult.count || 0,
        repost_count: repostsResult.count || 0
      };
    }));

    res.json(reviewsWithCounts);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get "Following" feed - reviews from people the user follows
router.get('/following', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Get list of users the current user follows
    const { data: following } = await supabase
      .from('user_relationships')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'following');

    const followingIds = following?.map(f => f.following_id) || [];

    if (followingIds.length === 0) {
      return res.json([]);
    }

    // Get reviews from followed users
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
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch following feed' });
    }

    // Also get reposts from followed users
    const { data: reposts } = await supabase
      .from('reposts')
      .select(`
        *,
        profiles!user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .in('user_id', followingIds)
      .eq('content_type', 'review')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Fetch full review data for reposts
    const repostReviewIds = reposts?.map(r => r.content_id) || [];
    let repostedReviews = [];
    if (repostReviewIds.length > 0) {
      const { data } = await supabase
        .from('reviews')
        .select(`*, profiles!user_id (id, username, display_name, avatar_url)`)
        .in('id', repostReviewIds);
      repostedReviews = data || [];
    }

    // Add counts to reviews
    const reviewsWithCounts = await Promise.all(reviews.map(async (review) => {
      const [likesResult, commentsResult, repostsResult] = await Promise.all([
        supabase.from('review_likes').select('id', { count: 'exact' }).eq('review_id', review.id),
        supabase.from('review_comments').select('id', { count: 'exact' }).eq('review_id', review.id),
        supabase.from('reposts').select('id', { count: 'exact' }).eq('content_type', 'review').eq('content_id', review.id)
      ]);
      return {
        ...review,
        like_count: likesResult.count || 0,
        comment_count: commentsResult.count || 0,
        repost_count: repostsResult.count || 0,
        is_repost: false
      };
    }));

    // Merge and sort
    const repostsWithData = reposts?.map(repost => {
      const originalReview = repostedReviews.find(r => r.id === repost.content_id);
      return originalReview ? {
        ...originalReview,
        is_repost: true,
        reposted_by: repost.profiles,
        repost_created_at: repost.created_at
      } : null;
    }).filter(Boolean) || [];

    const combined = [...reviewsWithCounts, ...repostsWithData]
      .sort((a, b) => new Date(b.repost_created_at || b.created_at) - new Date(a.repost_created_at || a.created_at))
      .slice(0, limit);

    res.json(combined);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to fetch following feed' });
  }
});

// Get single review
router.get('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    const { data: review, error } = await supabase
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
      .eq('id', reviewId)
      .single();

    if (error || !review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Get counts
    const [likesResult, commentsResult, repostsResult] = await Promise.all([
      supabase.from('review_likes').select('id', { count: 'exact' }).eq('review_id', reviewId),
      supabase.from('review_comments').select('id', { count: 'exact' }).eq('review_id', reviewId),
      supabase.from('reposts').select('id', { count: 'exact' }).eq('content_type', 'review').eq('content_id', reviewId)
    ]);

    res.json({
      ...review,
      like_count: likesResult.count || 0,
      comment_count: commentsResult.count || 0,
      repost_count: repostsResult.count || 0
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Create or update review (upsert)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id, title, artist, album, album_art_url, review, rating, item_metadata } = req.body;

    if (!item_type || !item_id) {
      return res.status(400).json({ error: 'item_type and item_id are required' });
    }

    if (rating && (rating < 0.5 || rating > 5.0)) {
      return res.status(400).json({ error: 'Rating must be between 0.5 and 5.0' });
    }

    // Round rating to nearest 0.5
    const normalizedRating = rating ? Math.round(rating * 2) / 2 : null;

    const reviewData = {
      user_id: userId,
      item_type,
      item_id,
      title,
      artist,
      album,
      album_art_url,
      review,
      rating: normalizedRating,
      item_metadata: item_metadata || {},
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('reviews')
      .upsert(reviewData, { 
        onConflict: 'user_id,item_type,item_id',
        ignoreDuplicates: false 
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
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save review', details: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// Update review
router.put('/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { title, artist, album, album_art_url, review, rating, item_metadata } = req.body;

    // Verify ownership
    const { data: existing } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single();

    if (!existing || existing.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this review' });
    }

    const normalizedRating = rating ? Math.round(rating * 2) / 2 : null;

    const { data, error } = await supabase
      .from('reviews')
      .update({
        title,
        artist,
        album,
        album_art_url,
        review,
        rating: normalizedRating,
        item_metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update review' });
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
router.delete('/:reviewId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    // Verify ownership
    const { data: existing } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single();

    if (!existing || existing.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete review' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Get reviews for a specific song
router.get('/song/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
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
      .eq('item_type', 'song')
      .eq('item_id', songId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch song reviews' });
    }

    res.json(reviews || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch song reviews' });
  }
});

// Get reviews for a specific album
router.get('/album/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
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
      .eq('item_type', 'album')
      .eq('item_id', albumId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch album reviews' });
    }

    res.json(reviews || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch album reviews' });
  }
});

// Get reviews for a specific artist
router.get('/artist/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;
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
      .eq('item_type', 'artist')
      .eq('item_id', artistName)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch artist reviews' });
    }

    res.json(reviews || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch artist reviews' });
  }
});

// Get reviews by user ID
router.get('/user/:userId', async (req, res) => {
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
      return res.status(500).json({ error: 'Failed to fetch user reviews' });
    }

    // Add counts
    const reviewsWithCounts = await Promise.all((reviews || []).map(async (review) => {
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from('review_likes').select('id', { count: 'exact' }).eq('review_id', review.id),
        supabase.from('review_comments').select('id', { count: 'exact' }).eq('review_id', review.id)
      ]);
      return {
        ...review,
        like_count: likesResult.count || 0,
        comment_count: commentsResult.count || 0
      };
    }));

    res.json(reviewsWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

module.exports = router;
