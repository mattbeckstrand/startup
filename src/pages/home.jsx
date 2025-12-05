import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { ReviewCard } from '../components/ReviewCard';
import { SkeletonCard, SkeletonAlbumCard } from '../components/LoadingSpinner';
import { useFeedReviews, useNewReleases } from '../hooks/useQueries';
import { AlbumArtwork } from '../components/ArtworkImage';

export function Home() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('forYou');

  // Cached queries - data loads instantly if already fetched!
  const { data: newReleases = [], isLoading: releasesLoading } = useNewReleases(15);
  
  const {
    data: reviewPages,
    isLoading: reviewsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFeedReviews(activeTab);

  // Flatten paginated reviews
  const reviews = reviewPages?.pages?.flat() ?? [];

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="w-full pb-20">
      {/* New Releases Section */}
      <section className="py-1.5">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-[20px] font-semibold text-white">New Releases</h2>
          <Link 
            to="/discover" 
            className="text-[14px] hover:underline text-[#007AFF]"
          >
            See more
          </Link>
        </div>
        
        {!releasesLoading && newReleases.length > 0 ? (
          <div className="flex gap-3 px-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
            {newReleases.map((album, index) => (
              <Link
                key={album.id || album.spotify_id || `album-${index}`}
                to={`/album/${album.spotify_id || album.id}`}
                className="flex-shrink-0 w-[112px] h-[112px] rounded-xl overflow-hidden"
                style={{ scrollSnapAlign: 'start', boxShadow: 'inset 0 0 0 0.5px rgba(128, 128, 128, 0.1)' }}
              >
                <AlbumArtwork 
                  album={album}
                  resolveWidth={200}
                  resolveHeight={200}
                  className="w-full h-full"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 px-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div 
                key={`skeleton-${i}`} 
                className="flex-shrink-0 w-[112px] h-[112px] rounded-xl skeleton"
              />
            ))}
          </div>
        )}
      </section>

      {/* Feed Selector - iOS Style */}
      <div className="flex items-center gap-1.5 px-2 py-1">
        <button
          onClick={() => setActiveTab('forYou')}
          className={`text-[14px] font-semibold py-1 transition-colors ${
            activeTab === 'forYou' ? 'text-[#007AFF]' : 'text-[rgba(255,255,255,0.6)]'
          }`}
        >
          For You
        </button>
        <span className="text-[rgba(255,255,255,0.6)] font-semibold">/</span>
        <button
          onClick={() => setActiveTab('following')}
          className={`text-[14px] font-semibold py-1 transition-colors ${
            activeTab === 'following' ? 'text-[#007AFF]' : 'text-[rgba(255,255,255,0.6)]'
          }`}
        >
          Following
        </button>
      </div>

      {/* Feed */}
      <div className="py-1">
        {reviewsLoading ? (
          <div className="space-y-1">
            {[1, 2, 3].map(i => (
              <SkeletonCard key={`loading-${i}`} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 px-4">
            {activeTab === 'following' && !isAuthenticated ? (
              <>
                <p className="text-[rgba(255,255,255,0.6)] mb-4">
                  Sign in to see reviews from people you follow
                </p>
                <Link 
                  to="/signin"
                  className="inline-block px-6 py-2 rounded-full font-medium transition-opacity hover:opacity-90 bg-[#007AFF] text-white"
                >
                  Sign In
                </Link>
              </>
            ) : activeTab === 'following' ? (
              <>
                <p className="text-[rgba(255,255,255,0.6)] mb-2">
                  No reviews from people you follow yet
                </p>
                <p className="text-[rgba(255,255,255,0.5)] text-sm">
                  Follow people to see their reviews here
                </p>
                <Link 
                  to="/search?tab=users"
                  className="inline-block mt-4 px-6 py-2 rounded-full font-medium transition-opacity hover:opacity-90 bg-[rgb(48,48,52)] text-white"
                >
                  Find People
                </Link>
              </>
            ) : (
              <>
                <p className="text-[rgba(255,255,255,0.6)] mb-2">
                  No reviews yet
                </p>
                <p className="text-[rgba(255,255,255,0.5)] text-sm">
                  Be the first to share your thoughts!
                </p>
                <Link 
                  to="/create"
                  className="inline-block mt-4 px-6 py-2 rounded-full font-medium transition-opacity hover:opacity-90 bg-[#007AFF] text-white"
                >
                  Write a Review
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {reviews.map((review, index) => (
              <ReviewCard
                key={`${review.id}-${index}`}
                review={review}
                isRepost={review.is_repost}
                repostedBy={review.reposted_by}
              />
            ))}
            
            {isFetchingNextPage && (
              <div className="space-y-1 mt-1">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}
            
            {!hasNextPage && reviews.length > 0 && (
              <p className="text-center py-8 text-[rgba(255,255,255,0.5)]">
                You've reached the end
              </p>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button - iOS Style */}
      {isAuthenticated && (
        <Link
          to="/create"
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  );
}
