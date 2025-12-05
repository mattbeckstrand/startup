import React from 'react';
import { Link } from 'react-router-dom';
import { SongArtwork } from './ArtworkImage';

export function SongCard({ 
  song, 
  onClick, 
  showArtist = true,
  showAlbum = false,
  size = 'md',
  showPlayButton = true
}) {
  const sizes = {
    sm: { img: 'w-12 h-12', text: 'text-sm', resolveSize: 150 },
    md: { img: 'w-16 h-16', text: 'text-base', resolveSize: 200 },
    lg: { img: 'w-20 h-20', text: 'text-lg', resolveSize: 250 }
  };

  const handlePlay = (e) => {
    e.stopPropagation();
    if (song.external_urls?.spotify) {
      window.open(song.external_urls.spotify, '_blank');
    } else if (song.preview_url) {
      // Could play preview
      window.open(song.preview_url, '_blank');
    }
  };

  const content = (
    <div 
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Album art */}
      <div className={`${sizes[size].img} relative flex-shrink-0`}>
        <SongArtwork 
          song={song}
          resolveWidth={sizes[size].resolveSize}
          resolveHeight={sizes[size].resolveSize}
          className="w-full h-full rounded-lg"
        />
        {showPlayButton && (song.external_urls?.spotify || song.preview_url) && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium truncate ${sizes[size].text}`}>
          {song.title || song.name}
        </h4>
        {showArtist && (
          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
        )}
        {showAlbum && song.album && (
          <p className="text-gray-500 text-xs truncate">{song.album}</p>
        )}
      </div>

      {/* Explicit badge */}
      {song.is_explicit && (
        <span className="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
          E
        </span>
      )}
    </div>
  );

  // If we have an ID, make it a link
  if (song.id && !onClick) {
    return (
      <Link to={`/song/${song.spotify_id || song.id}`}>
        {content}
      </Link>
    );
  }

  return content;
}

// Compact horizontal song card for lists
export function SongCardCompact({ song, onClick, showRating }) {
  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <SongArtwork 
        song={song}
        resolveWidth={150}
        resolveHeight={150}
        className="w-10 h-10 rounded"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{song.title || song.name}</p>
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
      </div>
      {showRating && song.rating && (
        <span className="text-amber-400 text-sm">★ {song.rating.toFixed(1)}</span>
      )}
    </div>
  );
}

