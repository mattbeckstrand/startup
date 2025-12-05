import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { StarRating } from '../components/StarRating';
import { SongCard } from '../components/SongCard';
import { AlbumCardHorizontal } from '../components/AlbumCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ArtworkImage from '../components/ArtworkImage';

export function CreateReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState('type'); // 'type', 'search', 'review'
  const [itemType, setItemType] = useState(searchParams.get('type') || 'song');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
    }
  }, [isAuthenticated, navigate]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let endpoint = '/api/songs/search';
        if (itemType === 'album') {
          endpoint = '/api/albums/search';
        }
        
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, itemType]);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setStep('review');
  };

  const handleSubmit = async () => {
    if (!selectedItem || rating === 0) return;
    
    setIsSubmitting(true);
    try {
      const reviewData = {
        item_type: itemType,
        item_id: selectedItem.spotify_id || selectedItem.id,
        title: selectedItem.title || selectedItem.name,
        artist: selectedItem.artist || selectedItem.artists?.map(a => a.name).join(', '),
        album: itemType === 'song' ? selectedItem.album : null,
        album_art_url: selectedItem.album_art_url || selectedItem.artwork_url || selectedItem.images?.[0]?.url,
        rating,
        review: reviewText.trim() || null,
        item_metadata: {
          spotifyId: selectedItem.spotify_id || selectedItem.id,
          previewUrl: selectedItem.preview_url,
          externalUrls: selectedItem.external_urls
        }
      };

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        const savedReview = await response.json();
        navigate(`/review/${savedReview.id}`);
      } else {
        throw new Error('Failed to save review');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to save review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('search');
      setSelectedItem(null);
    } else if (step === 'search') {
      setStep('type');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur-lg z-10 border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <button onClick={handleBack} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">
            {step === 'type' && 'What are you reviewing?'}
            {step === 'search' && `Find a ${itemType}`}
            {step === 'review' && 'Write your review'}
          </h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {/* Step 1: Select type */}
        {step === 'type' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-center mb-6">
              Choose what you want to review
            </p>
            
            {['song', 'album', 'artist'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setItemType(type);
                  setStep('search');
                }}
                className="w-full p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {type === 'song' && (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  )}
                  {type === 'album' && (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                    </svg>
                  )}
                  {type === 'artist' && (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold capitalize">{type}</h3>
                  <p className="text-sm text-gray-400">
                    {type === 'song' && 'Review a specific track'}
                    {type === 'album' && 'Review an entire album'}
                    {type === 'artist' && 'Review an artist overall'}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Search */}
        {step === 'search' && (
          <div>
            {/* Search input */}
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search for a ${itemType}...`}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>

            {/* Results */}
            {isSearching && (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((item) => (
                  <div 
                    key={item.id || item.spotify_id}
                    onClick={() => handleSelectItem(item)}
                    className="cursor-pointer"
                  >
                    {itemType === 'song' && (
                      <SongCard song={item} showAlbum />
                    )}
                    {itemType === 'album' && (
                      <AlbumCardHorizontal album={item} />
                    )}
                    {itemType === 'artist' && (
                      <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl hover:bg-gray-700">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No results found for "{searchQuery}"
              </p>
            )}

            {!searchQuery && (
              <p className="text-center text-gray-500 py-8">
                Start typing to search
              </p>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && selectedItem && (
          <div className="space-y-6">
            {/* Selected item preview */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex gap-4">
                <ArtworkImage 
                  type={itemType}
                  item={selectedItem}
                  resolveWidth={200}
                  resolveHeight={200}
                  className="w-20 h-20 rounded-lg"
                />
                <div>
                  <p className="text-xs text-purple-400 uppercase tracking-wider mb-1">{itemType}</p>
                  <h2 className="font-bold text-lg">{selectedItem.title || selectedItem.name}</h2>
                  <p className="text-gray-400">
                    {selectedItem.artist || selectedItem.artists?.map(a => a.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="bg-gray-800 rounded-xl p-4">
              <label className="block text-sm text-gray-400 mb-3">Your Rating</label>
              <div className="flex justify-center">
                <StarRating 
                  value={rating} 
                  onChange={setRating} 
                  size="xl"
                  showValue
                />
              </div>
            </div>

            {/* Review text */}
            <div className="bg-gray-800 rounded-xl p-4">
              <label className="block text-sm text-gray-400 mb-3">
                Your Review <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What did you think?"
                className="w-full h-32 bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <p className="text-right text-xs text-gray-500 mt-1">
                {reviewText.length} characters
              </p>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Posting...
                </span>
              ) : (
                'Post Review'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

