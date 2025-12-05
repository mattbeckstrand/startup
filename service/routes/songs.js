const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Get Spotify token for API calls
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

// Search songs via Spotify
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`,
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
    
    const songs = data.tracks?.items?.map(track => ({
      id: track.id,
      spotify_id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      album_art_url: track.album.images[0]?.url,
      duration: track.duration_ms / 1000,
      preview_url: track.preview_url,
      is_explicit: track.explicit,
      external_urls: { spotify: track.external_urls.spotify },
      release_date: track.album.release_date
    })) || [];

    res.json(songs);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search songs' });
  }
});

// Get new releases from Spotify
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
    res.json(data.albums?.items || []);
  } catch (error) {
    // Return empty array if Spotify not configured
    res.json([]);
  }
});

// Create or upsert song (returns canonical ID)
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      artist, 
      album, 
      album_art_url, 
      duration, 
      spotify_id, 
      apple_music_id,
      preview_url,
      external_urls,
      is_explicit,
      release_date
    } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    // If spotify_id provided, try to find existing
    if (spotify_id) {
      const { data: existing } = await supabase
        .from('songs')
        .select('*')
        .eq('spotify_id', spotify_id)
        .single();

      if (existing) {
        return res.json(existing);
      }
    }

    // Create new song
    const { data: song, error } = await supabase
      .from('songs')
      .insert({
        title,
        artist,
        album,
        album_art_url,
        duration,
        spotify_id,
        apple_music_id,
        preview_url,
        external_urls: external_urls || {},
        is_explicit: is_explicit || false,
        release_date
      })
      .select()
      .single();

    if (error) {
      // Might be duplicate spotify_id race condition
      if (error.code === '23505' && spotify_id) {
        const { data: existing } = await supabase
          .from('songs')
          .select('*')
          .eq('spotify_id', spotify_id)
          .single();
        
        if (existing) {
          return res.json(existing);
        }
      }
      return res.status(500).json({ error: 'Failed to create song' });
    }

    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create song' });
  }
});

// Get song by Spotify ID
router.get('/spotify/:spotifyId', async (req, res) => {
  try {
    const { spotifyId } = req.params;

    // First check local database
    const { data: existingSong } = await supabase
      .from('songs')
      .select('*')
      .eq('spotify_id', spotifyId)
      .single();

    if (existingSong) {
      return res.json(existingSong);
    }

    // Fetch from Spotify
    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${spotifyId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const track = await response.json();

    const song = {
      spotify_id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      album_art_url: track.album.images[0]?.url,
      duration: track.duration_ms / 1000,
      preview_url: track.preview_url,
      is_explicit: track.explicit,
      external_urls: { spotify: track.external_urls.spotify },
      release_date: track.album.release_date
    };

    // Save to database
    const { data: savedSong } = await supabase
      .from('songs')
      .insert(song)
      .select()
      .single();

    res.json(savedSong || song);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

// Get song by ID - MUST be last because it catches all patterns
router.get('/:songId', async (req, res) => {
  try {
    const { songId } = req.params;

    const { data: song, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (error || !song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

module.exports = router;
