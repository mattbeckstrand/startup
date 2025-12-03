const express = require('express');
const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

router.get('/token', async (req, res) => {
  // Check if Spotify credentials are configured
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return res.status(503).json({ 
      error: 'Spotify credentials not configured',
      message: 'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env file'
    });
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    console.error('Spotify token error:', error);
    res.status(500).json({ error: 'Failed to get Spotify token' });
  }
});

module.exports = router;