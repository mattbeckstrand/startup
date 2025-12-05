import React, { useState, useEffect, memo } from 'react';
import { 
  resolveArtworkUrl, 
  resolveAlbumArtwork, 
  resolveSongArtwork, 
  resolveReviewArtwork,
  generatePlaceholder 
} from '../services/artworkService';

/**
 * ArtworkImage Component
 * 
 * Automatically resolves artwork URLs with fallback to iTunes API.
 * Shows a placeholder while loading and handles image load errors gracefully.
 * 
 * Usage:
 * 
 * For albums:
 * <ArtworkImage type="album" item={album} className="w-32 h-32 rounded-xl" />
 * 
 * For songs:
 * <ArtworkImage type="song" item={song} className="w-16 h-16 rounded-lg" />
 * 
 * For reviews:
 * <ArtworkImage type="review" item={review} className="w-[120px] h-[120px] rounded-xl" />
 * 
 * Or with explicit fields:
 * <ArtworkImage 
 *   artist="Taylor Swift" 
 *   album="Midnights" 
 *   existingUrl={someUrl}
 *   className="w-32 h-32"
 * />
 */
const ArtworkImage = memo(function ArtworkImage({
  // Item-based props
  type = 'album',
  item,
  
  // Or explicit field props
  artist,
  album,
  title,
  existingUrl,
  
  // Size for resolution (higher = better quality, but more bandwidth)
  resolveWidth = 300,
  resolveHeight = 300,
  
  // Standard img props
  className = '',
  alt,
  style,
  
  // Loading state
  showLoadingState = false,
  loadingClassName = 'animate-pulse bg-gray-700',
  
  // Error fallback
  fallbackSrc = '/Images/ProfilePlaceholder.jpg',
  
  // Callbacks
  onLoad,
  onError,
  
  ...imgProps
}) {
  // Derive data from item or explicit props
  const derivedArtist = artist || item?.artist || item?.artists?.map(a => a.name).join(', ') || '';
  const derivedAlbum = album || item?.album || item?.title || item?.name || '';
  const derivedTitle = title || item?.title || item?.name || '';
  const derivedExistingUrl = existingUrl || 
    item?.artwork_url || 
    item?.album_art_url || 
    item?.albumArtUrl || 
    item?.artworkUrl ||
    item?.images?.[0]?.url || '';
  
  // Generate placeholder - fallback image
  const placeholderText = derivedAlbum || derivedTitle || derivedArtist || '??';
  
  // Compute initial src  
  const getInitialSrc = () => {
    if (derivedExistingUrl && derivedExistingUrl.startsWith('http')) {
      return derivedExistingUrl;
    }
    return generatePlaceholder(placeholderText, resolveWidth, resolveHeight);
  };
  
  const [src, setSrc] = useState(getInitialSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  
  // Ensure src is never empty
  const safeSrc = src || generatePlaceholder(placeholderText, resolveWidth, resolveHeight);
  
  // Resolve artwork URL with debouncing and request deduplication
  useEffect(() => {
    let cancelled = false;
    
    // Skip resolution if we already have a valid URL
    if (derivedExistingUrl && derivedExistingUrl.startsWith('http') && !isResolved) {
      const normalizedUrl = derivedExistingUrl
        .replace('{w}', resolveWidth.toString())
        .replace('{h}', resolveHeight.toString())
        .replace(/\b\d{2,4}x\d{2,4}\b/, `${resolveWidth}x${resolveHeight}`);
      
      if (!cancelled) {
        setSrc(normalizedUrl);
        setIsResolved(true);
        setIsLoading(false);
      }
      return;
    }
    
    const resolve = async () => {
      try {
        let url;
        
        if (item) {
          // Use type-specific resolver
          switch (type) {
            case 'album':
              url = await resolveAlbumArtwork(item, { width: resolveWidth, height: resolveHeight });
              break;
            case 'song':
              url = await resolveSongArtwork(item, { width: resolveWidth, height: resolveHeight });
              break;
            case 'review':
              url = await resolveReviewArtwork(item, { width: resolveWidth, height: resolveHeight });
              break;
            default:
              url = await resolveArtworkUrl(item, { width: resolveWidth, height: resolveHeight });
          }
        } else {
          // Use explicit props
          url = await resolveArtworkUrl({
            type,
            artist: derivedArtist,
            album: derivedAlbum,
            title: derivedTitle,
            artworkUrl: derivedExistingUrl
          }, { width: resolveWidth, height: resolveHeight });
        }
        
        if (!cancelled && url) {
          setSrc(url);
          setIsResolved(true);
        }
      } catch (err) {
        console.warn('Artwork resolution failed:', err);
      }
    };
    
    // Only resolve if we don't have a direct URL
    if (!derivedExistingUrl || !derivedExistingUrl.startsWith('http')) {
      resolve();
    }
    
    return () => {
      cancelled = true;
    };
  }, [
    type,
    item,
    derivedArtist,
    derivedAlbum,
    derivedTitle,
    derivedExistingUrl,
    resolveWidth,
    resolveHeight,
    isResolved
  ]);
  
  const handleLoad = (e) => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(e);
  };
  
  const handleError = (e) => {
    setIsLoading(false);
    setHasError(true);
    
    // If the resolved URL failed, try the original or fallback to placeholder
    const placeholder = generatePlaceholder(placeholderText, resolveWidth, resolveHeight);
    if (isResolved && derivedExistingUrl && src !== derivedExistingUrl) {
      setSrc(derivedExistingUrl);
    } else if (src !== fallbackSrc && src !== placeholder) {
      setSrc(placeholder);
    }
    
    onError?.(e);
  };
  
  const computedAlt = alt || `${derivedAlbum || derivedTitle || 'Album'} artwork`;
  
  return (
    <div className={`relative ${className}`} style={style}>
      <img
        src={safeSrc}
        alt={computedAlt}
        className={`w-full h-full object-cover ${hasError ? 'opacity-90' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        fetchpriority={showLoadingState ? 'high' : 'low'}
        {...imgProps}
      />
      {showLoadingState && isLoading && !hasError && (
        <div 
          className={`absolute inset-0 ${loadingClassName}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

/**
 * Convenience wrapper for album artwork
 */
export const AlbumArtwork = memo(function AlbumArtwork({ album, ...props }) {
  return <ArtworkImage type="album" item={album} {...props} />;
});

/**
 * Convenience wrapper for song artwork
 */
export const SongArtwork = memo(function SongArtwork({ song, ...props }) {
  return <ArtworkImage type="song" item={song} {...props} />;
});

/**
 * Convenience wrapper for review artwork
 */
export const ReviewArtwork = memo(function ReviewArtwork({ review, ...props }) {
  return <ArtworkImage type="review" item={review} {...props} />;
});

export default ArtworkImage;

