import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UserCard } from '../components/UserCard';
import { SongCard } from '../components/SongCard';
import { AlbumCard } from '../components/AlbumCard';
import { ReviewCard } from '../components/ReviewCard';
import { LoadingSpinner, SkeletonCard } from '../components/LoadingSpinner';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [isSearching, setIsSearching] = useState(false);
  
  const [results, setResults] = useState({
    users: [],
    songs: [],
    albums: [],
    reviews: []
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'users', label: 'Users' },
    { id: 'songs', label: 'Songs' },
    { id: 'albums', label: 'Albums' }
  ];

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ users: [], songs: [], albums: [], reviews: [] });
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  const performSearch = async () => {
    setIsSearching(true);
    
    try {
      const promises = [];

      // Search users
      if (activeTab === 'all' || activeTab === 'users') {
        promises.push(
          fetch(`/api/profiles/search/users?q=${encodeURIComponent(query)}&limit=10`)
            .then(r => r.ok ? r.json() : [])
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      // Search songs
      if (activeTab === 'all' || activeTab === 'songs') {
        promises.push(
          fetch(`/api/songs/search?q=${encodeURIComponent(query)}&limit=10`)
            .then(r => r.ok ? r.json() : [])
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      // Search albums
      if (activeTab === 'all' || activeTab === 'albums') {
        promises.push(
          fetch(`/api/albums/search?q=${encodeURIComponent(query)}&limit=10`)
            .then(r => r.ok ? r.json() : [])
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [users, songs, albums] = await Promise.all(promises);
      
      setResults({ users, songs, albums, reviews: [] });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ q: query, tab });
  };

  const handleSongClick = (song) => {
    navigate(`/create?type=song`, { state: { song } });
  };

  const handleAlbumClick = (album) => {
    navigate(`/create?type=album`, { state: { album } });
  };

  const hasResults = results.users.length > 0 || results.songs.length > 0 || results.albums.length > 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Search header */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur-lg z-10 p-4">
        <div className="relative max-w-2xl mx-auto">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, songs, albums..."
            className="w-full pl-12 pr-4 py-3 bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 max-w-2xl mx-auto overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {/* Loading state */}
        {isSearching && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* No query */}
        {!query && !isSearching && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-400">Search Snare</h2>
            <p className="text-gray-500 mt-2">Find users, songs, and albums</p>
          </div>
        )}

        {/* No results */}
        {query && !isSearching && !hasResults && (
          <div className="text-center py-20">
            <p className="text-gray-400">No results found for "{query}"</p>
          </div>
        )}

        {/* Results */}
        {!isSearching && hasResults && (
          <div className="space-y-8">
            {/* Users */}
            {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <h2 className="text-lg font-semibold mb-3">Users</h2>
                )}
                <div className="space-y-2">
                  {results.users.map(user => (
                    <UserCard key={user.id} user={user} showBio />
                  ))}
                </div>
              </section>
            )}

            {/* Songs */}
            {(activeTab === 'all' || activeTab === 'songs') && results.songs.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <h2 className="text-lg font-semibold mb-3">Songs</h2>
                )}
                <div className="space-y-1">
                  {results.songs.map(song => (
                    <SongCard 
                      key={song.id || song.spotify_id} 
                      song={song} 
                      showAlbum
                      onClick={() => handleSongClick(song)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Albums */}
            {(activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <h2 className="text-lg font-semibold mb-3">Albums</h2>
                )}
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {results.albums.map(album => (
                    <AlbumCard 
                      key={album.id || album.spotify_id} 
                      album={album}
                      onClick={() => handleAlbumClick(album)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

