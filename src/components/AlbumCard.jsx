import React from 'react';
import { Link } from 'react-router-dom';
import { AlbumArtwork } from './ArtworkImage';

export function AlbumCard({ 
  album, 
  onClick,
  size = 'md',
  showArtist = true,
  showYear = false
}) {
  const sizes = {
    sm: { container: 'w-[112px]', img: 'w-[112px] h-[112px]', resolveSize: 200 },
    md: { container: 'w-32', img: 'w-32 h-32', resolveSize: 300 },
    lg: { container: 'w-40', img: 'w-40 h-40', resolveSize: 400 },
    xl: { container: 'w-48', img: 'w-48 h-48', resolveSize: 500 }
  };

  const getYear = () => {
    if (!album.release_date) return null;
    return new Date(album.release_date).getFullYear();
  };

  const content = (
    <div 
      className={`${sizes[size].container} flex-shrink-0 cursor-pointer group`}
      onClick={onClick}
    >
      {/* Album art */}
      <div 
        className={`${sizes[size].img} relative rounded-xl overflow-hidden`}
        style={{ boxShadow: 'inset 0 0 0 0.5px rgba(128, 128, 128, 0.1)' }}
      >
        <AlbumArtwork 
          album={album}
          resolveWidth={sizes[size].resolveSize}
          resolveHeight={sizes[size].resolveSize}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        <div>Album Art</div>
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'var(--accent-green)' }}
          >
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-2">
        <h4 
          className="font-medium text-[14px] truncate group-hover:text-white transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {album.title || album.name}
        </h4>
        {showArtist && (
          <p 
            className="text-[12px] truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {album.artist || album.artists?.map(a => a.name).join(', ')}
          </p>
        )}
        {showYear && getYear() && (
          <p 
            className="text-[11px]"
            style={{ color: 'var(--text-caption)' }}
          >
            {getYear()}
          </p>
        )}
      </div>
    </div>
  );

  // If we have an ID and no custom onClick, make it a link
  if ((album.id || album.spotify_id) && !onClick) {
    return (
      <Link to={`/album/${album.spotify_id || album.id}`}>
        {content}
      </Link>
    );
  }

  return content;
}

// Horizontal album card for lists
export function AlbumCardHorizontal({ album, onClick }) {
  return (
    <div 
      className="flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer"
      style={{ background: 'transparent' }}
      onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <AlbumArtwork 
        album={album}
        resolveWidth={200}
        resolveHeight={200}
        className="w-14 h-14 rounded-xl"
      />
      <div className="flex-1 min-w-0">
        <h4 
          className="font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {album.title || album.name}
        </h4>
        <p 
          className="text-[14px] truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {album.artist || album.artists?.map(a => a.name).join(', ')}
        </p>
        {album.total_tracks && (
          <p 
            className="text-[12px]"
            style={{ color: 'var(--text-caption)' }}
          >
            {album.total_tracks} tracks
          </p>
        )}
      </div>
    </div>
  );
}
