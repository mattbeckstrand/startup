import { useEffect, useState } from 'react';

export function useSpotify() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Get token from your backend
    fetch('http://localhost:4000/api/spotify/token')
      .then(res => res.json())
      .then(data => setToken(data.access_token));
  }, []);

  return token;
}

export async function searchAlbums(token, searchTerm) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=album&limit=10`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  return data.albums.items;
}

export async function searchSongs(token, searchTerm) {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=track&limit=10`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const data = await response.json();
    return data.tracks.items;  // Changed from data.songs to data.tracks
  }