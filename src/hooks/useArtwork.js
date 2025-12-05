import { useState, useEffect, useCallback } from 'react';
import { 
  resolveArtworkUrl, 
  resolveAlbumArtwork, 
  resolveSongArtwork, 
  resolveReviewArtwork,
  generatePlaceholder 
} from '../services/artworkService';

/**
 * Hook to resolve artwork URLs with fallback to iTunes API
 * 
 * @param {Object} item - The item to resolve artwork for
 * @param {Object} options - Options { width, height, enabled }
 * @returns {{ artworkUrl: string, isLoading: boolean, error: Error | null }}
 */
export function useArtwork(item, options = {}) {
  const { width = 300, height = 300, enabled = true } = options;
  
  const [artworkUrl, setArtworkUrl] = useState(() => {
    // Start with existing URL or a quick placeholder
    const existingUrl = item?.artworkUrl || item?.artwork_url || item?.album_art_url || item?.albumArtUrl;
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    return generatePlaceholder(item?.title || item?.album || item?.artist || '??', width, height);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!enabled || !item) return;
    
    let cancelled = false;
    
    const resolve = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = await resolveArtworkUrl(item, { width, height });
        if (!cancelled) {
          setArtworkUrl(url);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    
    resolve();
    
    return () => {
      cancelled = true;
    };
  }, [
    item?.artist, 
    item?.album, 
    item?.title, 
    item?.artworkUrl, 
    item?.artwork_url, 
    item?.album_art_url,
    item?.albumArtUrl,
    width, 
    height, 
    enabled
  ]);
  
  return { artworkUrl, isLoading, error };
}

/**
 * Hook specifically for album artwork
 */
export function useAlbumArtwork(album, options = {}) {
  const { width = 300, height = 300, enabled = true } = options;
  
  const [artworkUrl, setArtworkUrl] = useState(() => {
    const existingUrl = album?.artwork_url || album?.images?.[0]?.url;
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    return generatePlaceholder(album?.title || album?.name || '??', width, height);
  });
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!enabled || !album) return;
    
    let cancelled = false;
    
    const resolve = async () => {
      setIsLoading(true);
      try {
        const url = await resolveAlbumArtwork(album, { width, height });
        if (!cancelled) {
          setArtworkUrl(url);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    
    resolve();
    
    return () => {
      cancelled = true;
    };
  }, [
    album?.artist, 
    album?.title, 
    album?.name,
    album?.artwork_url, 
    album?.images,
    width, 
    height, 
    enabled
  ]);
  
  return { artworkUrl, isLoading };
}

/**
 * Hook specifically for song artwork
 */
export function useSongArtwork(song, options = {}) {
  const { width = 300, height = 300, enabled = true } = options;
  
  const [artworkUrl, setArtworkUrl] = useState(() => {
    const existingUrl = song?.album_art_url || song?.albumArtUrl;
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    return generatePlaceholder(song?.title || song?.name || '??', width, height);
  });
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!enabled || !song) return;
    
    let cancelled = false;
    
    const resolve = async () => {
      setIsLoading(true);
      try {
        const url = await resolveSongArtwork(song, { width, height });
        if (!cancelled) {
          setArtworkUrl(url);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    
    resolve();
    
    return () => {
      cancelled = true;
    };
  }, [
    song?.artist, 
    song?.album, 
    song?.title, 
    song?.name,
    song?.album_art_url, 
    song?.albumArtUrl,
    width, 
    height, 
    enabled
  ]);
  
  return { artworkUrl, isLoading };
}

/**
 * Hook specifically for review artwork
 */
export function useReviewArtwork(review, options = {}) {
  const { width = 300, height = 300, enabled = true } = options;
  
  const [artworkUrl, setArtworkUrl] = useState(() => {
    const existingUrl = review?.album_art_url;
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    return generatePlaceholder(review?.title || '??', width, height);
  });
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!enabled || !review) return;
    
    let cancelled = false;
    
    const resolve = async () => {
      setIsLoading(true);
      try {
        const url = await resolveReviewArtwork(review, { width, height });
        if (!cancelled) {
          setArtworkUrl(url);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    
    resolve();
    
    return () => {
      cancelled = true;
    };
  }, [
    review?.artist, 
    review?.title, 
    review?.album,
    review?.album_art_url, 
    review?.item_metadata,
    review?.item_type,
    width, 
    height, 
    enabled
  ]);
  
  return { artworkUrl, isLoading };
}

/**
 * Batch prefetch hook - useful for lists
 * Resolves all items in parallel for better performance
 */
export function usePrefetchArtwork(items, options = {}) {
  const { width = 300, height = 300, enabled = true } = options;
  
  const [resolvedUrls, setResolvedUrls] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!enabled || !items?.length) return;
    
    let cancelled = false;
    
    const prefetch = async () => {
      setIsLoading(true);
      
      const promises = items.map(async (item, index) => {
        try {
          const url = await resolveArtworkUrl(item, { width, height });
          return { index, url };
        } catch {
          return { index, url: generatePlaceholder(item?.title || item?.album || '??', width, height) };
        }
      });
      
      const results = await Promise.all(promises);
      
      if (!cancelled) {
        const urlMap = new Map();
        results.forEach(({ index, url }) => {
          urlMap.set(index, url);
        });
        setResolvedUrls(urlMap);
        setIsLoading(false);
      }
    };
    
    prefetch();
    
    return () => {
      cancelled = true;
    };
  }, [items, width, height, enabled]);
  
  const getArtworkUrl = useCallback((index) => {
    return resolvedUrls.get(index) || generatePlaceholder('??', width, height);
  }, [resolvedUrls, width, height]);
  
  return { getArtworkUrl, isLoading, resolvedUrls };
}

export default useArtwork;

