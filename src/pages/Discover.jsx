import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlbumCard } from '../components/AlbumCard';
import { UserCard } from '../components/UserCard';
import { SkeletonAlbumCard, FullPageLoader } from '../components/LoadingSpinner';
import { AlbumArtwork } from '../components/ArtworkImage';

export function Discover() {
  const [newReleases, setNewReleases] = useState([]);
  const [popularAlbums, setPopularAlbums] = useState([]);
  const [tastemakers, setTastemakers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscoverData();
  }, []);

  const fetchDiscoverData = async () => {
    try {
      const [releasesRes, popularRes] = await Promise.all([
        fetch('/api/albums/new-releases?limit=20'),
        fetch('/api/albums/popular?limit=10')
      ]);

      if (releasesRes.ok) {
        const data = await releasesRes.json();
        setNewReleases(data);
      }

      if (popularRes.ok) {
        const data = await popularRes.json();
        setPopularAlbums(data);
      }

      // For now, tastemakers is empty - could be featured users from backend
      setTastemakers([]);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur-lg z-10 p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Discover</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-10">
        {/* New Releases */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">New Releases</h2>
            <Link to="/search?tab=albums" className="text-purple-400 text-sm hover:underline">
              See all
            </Link>
          </div>
          
          {newReleases.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              {newReleases.map(album => (
                <AlbumCard 
                  key={album.id || album.spotify_id} 
                  album={album}
                  showYear
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <SkeletonAlbumCard key={i} />
              ))}
            </div>
          )}
        </section>

        {/* Popular This Week */}
        {popularAlbums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Popular This Week</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {popularAlbums.slice(0, 10).map((album, index) => (
                <Link 
                  key={album.item_id || index}
                  to={`/album/${album.item_id}`}
                  className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors group"
                >
                  <div className="relative mb-3">
                    <AlbumArtwork 
                      album={album}
                      resolveWidth={300}
                      resolveHeight={300}
                      className="w-full aspect-square rounded-lg group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="font-medium truncate">{album.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {album.review_count} {album.review_count === 1 ? 'review' : 'reviews'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Browse by Genre */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Browse by Genre</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Pop', 'Hip Hop', 'R&B', 'Rock', 'Electronic', 'Country', 'Latin', 'Indie'].map(genre => (
              <Link
                key={genre}
                to={`/search?q=${encodeURIComponent(genre)}&tab=albums`}
                className="relative h-24 rounded-xl overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, 
                    hsl(${Math.random() * 360}, 70%, 40%), 
                    hsl(${Math.random() * 360}, 70%, 30%))`
                }}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                <span className="absolute bottom-3 left-3 font-bold text-lg">{genre}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Tastemakers */}
        {tastemakers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Tastemakers</h2>
              <span className="text-gray-500 text-sm">Featured reviewers</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-3">
              {tastemakers.map(user => (
                <UserCard key={user.id} user={user} showBio />
              ))}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-2">Ready to share your taste?</h2>
          <p className="text-gray-300 mb-4">
            Review your favorite songs and albums, and discover what your friends are listening to.
          </p>
          <Link 
            to="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Write a Review
          </Link>
        </section>
      </main>
    </div>
  );
}

