const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Get Spotify token
async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

// IMPORTANT: Static routes MUST come before parameterized routes

// Search albums via Spotify
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Spotify API error');
    }

    const data = await response.json();
    
    const albums = data.albums?.items?.map(album => ({
      id: album.id,
      spotify_id: album.id,
      title: album.name,
      artist: album.artists.map(a => a.name).join(', '),
      artwork_url: album.images[0]?.url,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      external_urls: { spotify: album.external_urls.spotify }
    })) || [];

    res.json(albums);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search albums' });
  }
});

// Get new releases
router.get('/new-releases', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Spotify API error');
    }

    const data = await response.json();
    
    const albums = data.albums?.items?.map(album => ({
      id: album.id,
      spotify_id: album.id,
      title: album.name,
      artist: album.artists.map(a => a.name).join(', '),
      artwork_url: album.images[0]?.url,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      external_urls: { spotify: album.external_urls.spotify }
    })) || [];

    res.json(albums);
  } catch (error) {
    res.json([]);
  }
});

// Get popular albums (trending reviews)
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get albums with most reviews recently
    const { data: popularReviews } = await supabase
      .from('reviews')
      .select('item_id, title, artist, album_art_url, item_metadata')
      .eq('item_type', 'album')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!popularReviews?.length) {
      return res.json([]);
    }

    // Count reviews per album
    const albumCounts = {};
    popularReviews.forEach(review => {
      const key = review.item_id;
      if (!albumCounts[key]) {
        albumCounts[key] = {
          item_id: review.item_id,
          title: review.title,
          artist: review.artist,
          artwork_url: review.album_art_url || review.item_metadata?.artworkUrl,
          review_count: 0
        };
      }
      albumCounts[key].review_count++;
    });

    // Sort by review count and return top N
    const popular = Object.values(albumCounts)
      .sort((a, b) => b.review_count - a.review_count)
      .slice(0, limit);

    res.json(popular);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch popular albums' });
  }
});

// Get album by Spotify ID
router.get('/spotify/:spotifyId', async (req, res) => {
  try {
    const { spotifyId } = req.params;

    // First check local database
    const { data: existingAlbum } = await supabase
      .from('albums')
      .select('*')
      .eq('spotify_id', spotifyId)
      .single();

    if (existingAlbum) {
      return res.json(existingAlbum);
    }

    // Fetch from Spotify
    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/albums/${spotifyId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const albumData = await response.json();

    const album = {
      spotify_id: albumData.id,
      title: albumData.name,
      artist: albumData.artists.map(a => a.name).join(', '),
      artwork_url: albumData.images[0]?.url,
      release_date: albumData.release_date,
      total_tracks: albumData.total_tracks,
      genres: albumData.genres,
      external_urls: { spotify: albumData.external_urls.spotify }
    };

    // Save to database
    const { data: savedAlbum } = await supabase
      .from('albums')
      .insert(album)
      .select()
      .single();

    res.json(savedAlbum || album);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

// Create or get album
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      artist, 
      artwork_url, 
      spotify_id, 
      apple_music_id,
      release_date,
      total_tracks,
      genres,
      external_urls
    } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    // If spotify_id provided, try to find existing
    if (spotify_id) {
      const { data: existing } = await supabase
        .from('albums')
        .select('*')
        .eq('spotify_id', spotify_id)
        .single();

      if (existing) {
        return res.json(existing);
      }
    }

    // Create new album
    const { data: album, error } = await supabase
      .from('albums')
      .insert({
        title,
        artist,
        artwork_url,
        spotify_id,
        apple_music_id,
        release_date,
        total_tracks,
        genres,
        external_urls: external_urls || {}
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' && spotify_id) {
        const { data: existing } = await supabase
          .from('albums')
          .select('*')
          .eq('spotify_id', spotify_id)
          .single();
        
        if (existing) {
          return res.json(existing);
        }
      }
      return res.status(500).json({ error: 'Failed to create album' });
    }

    res.status(201).json(album);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create album' });
  }
});

// Get album by ID - MUST be last because it catches all patterns
router.get('/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;

    const { data: album, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', albumId)
      .single();

    if (error || !album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json(album);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

module.exports = router;
