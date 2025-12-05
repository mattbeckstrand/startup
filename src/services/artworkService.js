/**
 * Artwork Resolution Service
 * 
 * Multi-source fallback strategy with caching:
 * 1. Use existing URL from database if valid
 * 2. iTunes Search: artist + album
 * 3. iTunes Search: album/title only (fallback)
 * 
 * Caching is done by content key (artist + album/title), not URL.
 */

// In-memory cache with content-based keys
const artworkCache = new Map();

// Request deduplication - prevent multiple simultaneous requests for same artwork
const pendingRequests = new Map();

// Placeholder colors for fallback generation
const PLACEHOLDER_COLORS = [
  '#4F45E6', '#7D3BEE', '#DC2878', '#DC2626',
  '#EA5A0D', '#059669', '#0991B3', '#1C4FD8',
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E'
];

/**
 * Normalize artist name for matching
 */
function normalizeArtistName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Create cache key from content
 */
function makeCacheKey(type, artist, albumOrTitle) {
  const normalized = [artist || '', albumOrTitle || '']
    .map(s => s.trim().toLowerCase())
    .join('|');
  return `artwork:${type}:${normalized}`;
}

/**
 * Normalize existing artwork URL from database
 * Handles Apple Music {w}/{h} placeholders and size patterns
 */
function normalizeArtworkUrl(existingUrl, width = 300, height = 300) {
  if (!existingUrl || typeof existingUrl !== 'string') return null;
  if (!existingUrl.startsWith('http')) return null;
  
  let url = existingUrl;
  
  // Apple Music uses {w} and {h} placeholders
  if (url.includes('{w}') || url.includes('{h}')) {
    url = url
      .replace('{w}', width.toString())
      .replace('{h}', height.toString());
  }
  
  // Replace any existing dimension pattern like "300x300" or "100x100"
  url = url.replace(/\b\d{2,4}x\d{2,4}\b/, `${width}x${height}`);
  
  return url;
}

/**
 * Search iTunes API for artwork with request deduplication
 */
async function iTunesLookup(term, entity, expectedArtist, size = { width: 300, height: 300 }) {
  // Create a unique key for this request
  const requestKey = `${term}|${entity}|${expectedArtist || ''}`;
  
  // If there's already a pending request for this, wait for it
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  // Create the request promise
  const requestPromise = (async () => {
    try {
      const encodedTerm = encodeURIComponent(term.trim());
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodedTerm}&entity=${entity}&limit=10`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.results?.length) return null;
      
      // Find matching artist or use first result
      let result = data.results[0];
      
      if (expectedArtist) {
        const target = normalizeArtistName(expectedArtist);
        const matched = data.results.find(r => 
          normalizeArtistName(r.artistName) === target
        );
        if (matched) result = matched;
      }
      
      const artworkUrl = result.artworkUrl100;
      if (!artworkUrl) return null;
      
      // Upgrade to requested size
      return artworkUrl.replace('100x100', `${size.width}x${size.height}`);
    } catch (error) {
      console.warn('iTunes lookup failed:', error);
      return null;
    } finally {
      // Remove from pending requests after completion
      pendingRequests.delete(requestKey);
    }
  })();
  
  // Store the promise for deduplication
  pendingRequests.set(requestKey, requestPromise);
  
  return requestPromise;
}

/**
 * Generate a color-based placeholder as data URL
 */
export function generatePlaceholder(text, width = 300, height = 300) {
  const initials = (text || '??').substring(0, 2).toUpperCase();
  const colorIndex = Math.abs(hashString(text || '')) % PLACEHOLDER_COLORS.length;
  const backgroundColor = PLACEHOLDER_COLORS[colorIndex];
  
  // Create SVG placeholder - compact format for better encoding
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${backgroundColor}"/><text x="50%" y="50%" font-family="system-ui,-apple-system,sans-serif" font-size="${width * 0.35}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Simple string hash for consistent color selection
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Main artwork resolution function
 * 
 * @param {Object} item - The item to resolve artwork for
 * @param {string} item.type - 'album' or 'song'
 * @param {string} item.artist - Artist name
 * @param {string} item.album - Album name (for albums or songs)
 * @param {string} item.title - Title (for songs)
 * @param {string} item.artworkUrl - Existing artwork URL from database
 * @param {string} item.albumArtUrl - Alternative field for artwork URL
 * @param {Object} size - Desired size { width, height }
 * @returns {Promise<string>} Resolved artwork URL or placeholder
 */
export async function resolveArtworkUrl(item, size = { width: 300, height: 300 }) {
  const type = item.type || (item.album && !item.title ? 'album' : 'song');
  const artist = item.artist || '';
  const albumOrTitle = item.album || item.title || '';
  
  // Check cache first
  const cacheKey = makeCacheKey(type, artist, albumOrTitle);
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;
  
  // 1. Try direct URL from database
  const existingUrl = item.artworkUrl || item.albumArtUrl || item.artwork_url || item.album_art_url;
  const directUrl = normalizeArtworkUrl(existingUrl, size.width, size.height);
  if (directUrl) {
    artworkCache.set(cacheKey, directUrl);
    return directUrl;
  }
  
  // 2. iTunes lookup: artist + album
  if (artist && albumOrTitle) {
    const url = await iTunesLookup(
      `${artist} ${albumOrTitle}`,
      'album',
      artist,
      size
    );
    if (url) {
      artworkCache.set(cacheKey, url);
      return url;
    }
  }
  
  // 3. iTunes lookup: album/title only (fallback)
  if (albumOrTitle) {
    const entity = type === 'song' ? 'song' : 'album';
    const url = await iTunesLookup(albumOrTitle, entity, artist, size);
    if (url) {
      artworkCache.set(cacheKey, url);
      return url;
    }
  }
  
  // 4. Generate placeholder as final fallback
  const placeholder = generatePlaceholder(albumOrTitle || artist, size.width, size.height);
  // Don't cache placeholders - they're cheap to generate and we may find real artwork later
  return placeholder;
}

/**
 * Resolve artwork for an album specifically
 */
export async function resolveAlbumArtwork(album, size = { width: 300, height: 300 }) {
  return resolveArtworkUrl({
    type: 'album',
    artist: album.artist || album.artists?.map(a => a.name).join(', '),
    album: album.title || album.name,
    artworkUrl: album.artwork_url || album.images?.[0]?.url
  }, size);
}

/**
 * Resolve artwork for a song specifically
 */
export async function resolveSongArtwork(song, size = { width: 300, height: 300 }) {
  return resolveArtworkUrl({
    type: 'song',
    artist: song.artist,
    album: song.album,
    title: song.title || song.name,
    albumArtUrl: song.album_art_url || song.albumArtUrl
  }, size);
}

/**
 * Resolve artwork for a review
 */
export async function resolveReviewArtwork(review, size = { width: 300, height: 300 }) {
  // Parse item_metadata if it's a string
  let metadata = {};
  try {
    if (typeof review.item_metadata === 'string' && review.item_metadata) {
      metadata = JSON.parse(review.item_metadata);
    } else if (review.item_metadata && typeof review.item_metadata === 'object') {
      metadata = review.item_metadata;
    }
  } catch (e) {
    metadata = {};
  }
  
  return resolveArtworkUrl({
    type: review.item_type || 'album',
    artist: review.artist,
    album: review.item_type === 'song' ? review.album : review.title,
    title: review.item_type === 'song' ? review.title : null,
    artworkUrl: review.album_art_url || metadata.artworkUrl || metadata.albumArtUrl
  }, size);
}

/**
 * Pre-fetch artwork for multiple items (batch resolution)
 * Useful for lists to resolve in parallel
 */
export async function prefetchArtwork(items, size = { width: 300, height: 300 }) {
  const promises = items.map(item => resolveArtworkUrl(item, size).catch(() => null));
  return Promise.all(promises);
}

/**
 * Clear the artwork cache
 */
export function clearArtworkCache() {
  artworkCache.clear();
}

/**
 * Get cache statistics
 */
export function getArtworkCacheStats() {
  return {
    size: artworkCache.size,
    keys: Array.from(artworkCache.keys())
  };
}

export default {
  resolveArtworkUrl,
  resolveAlbumArtwork,
  resolveSongArtwork,
  resolveReviewArtwork,
  prefetchArtwork,
  clearArtworkCache,
  getArtworkCacheStats,
  generatePlaceholder
};

