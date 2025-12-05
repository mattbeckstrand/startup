import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { ReviewCard } from '../components/ReviewCard';
import { FullPageLoader, SkeletonCard } from '../components/LoadingSpinner';
import { useUserProfile, useUserReviews, useMyReviews, useFollowStatus, useFollowUser } from '../hooks/useQueries';

export function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState('reviews');

  // Determine which profile to show
  const profileId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  // Redirect if not logged in and trying to see own profile
  if (isOwnProfile && !isAuthenticated) {
    navigate('/signin');
  }

  // Cached profile data
  const { data: profile, isLoading: profileLoading } = useUserProfile(profileId);
  
  // Cached reviews - use different hook for own vs other user
  const { data: userReviews = [], isLoading: reviewsLoading } = isOwnProfile 
    ? useMyReviews() 
    : useUserReviews(profileId);

  // Cached follow status
  const { data: followData } = useFollowStatus(!isOwnProfile ? profileId : null);
  const followStatus = followData?.status || 'not_following';

  // Follow mutation
  const followMutation = useFollowUser();

  const handleFollow = () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    
    const action = followStatus === 'following' || followStatus === 'pending' 
      ? 'unfollow' 
      : 'follow';
    
    followMutation.mutate({ userId: profileId, action });
  };

  const tabs = [
    { id: 'reviews', label: 'Reviews' },
    { id: 'reposts', label: 'Reposts' },
    { id: 'favorites', label: 'Favorites' }
  ];

  if (profileLoading) {
    return <FullPageLoader />;
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur-lg z-10 border-b border-gray-800">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-gray-400">{profile.review_count || 0} reviews</p>
          </div>
          {isOwnProfile && (
            <Link to="/settings" className="ml-auto text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Profile info */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            <img 
              src={profile.avatar_url || '/Images/ProfilePlaceholder.jpg'}
              alt={profile.display_name}
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
              <p className="text-gray-400">@{profile.username}</p>
              {profile.bio && (
                <p className="mt-2 text-gray-300">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            <Link to={`/profile/${profileId}/followers`} className="hover:underline">
              <span className="font-semibold">{profile.followers_count || 0}</span>
              <span className="text-gray-400 ml-1">Followers</span>
            </Link>
            <Link to={`/profile/${profileId}/following`} className="hover:underline">
              <span className="font-semibold">{profile.following_count || 0}</span>
              <span className="text-gray-400 ml-1">Following</span>
            </Link>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            {isOwnProfile ? (
              <Link
                to="/settings"
                className="flex-1 py-2 text-center bg-gray-800 hover:bg-gray-700 rounded-full font-medium transition-colors"
              >
                Edit Profile
              </Link>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className={`flex-1 py-2 rounded-full font-medium transition-colors ${
                    followStatus === 'following' 
                      ? 'bg-gray-800 hover:bg-red-600 text-white'
                      : followStatus === 'pending'
                      ? 'bg-gray-800 text-gray-400'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {followMutation.isPending ? '...' : 
                   followStatus === 'following' ? 'Following' :
                   followStatus === 'pending' ? 'Requested' : 'Follow'}
                </button>
                <Link
                  to={`/messages/new?user=${profileId}`}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-full font-medium transition-colors"
                >
                  Message
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-center font-medium relative transition-colors ${
                activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-purple-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === 'reviews' && (
            reviewsLoading ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : userReviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">
                  {isOwnProfile ? "You haven't posted any reviews yet" : "No reviews yet"}
                </p>
                {isOwnProfile && (
                  <Link 
                    to="/create"
                    className="inline-block mt-4 px-6 py-2 bg-purple-600 rounded-full font-medium hover:bg-purple-700 transition-colors"
                  >
                    Write a Review
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {userReviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )
          )}

          {activeTab === 'reposts' && (
            <div className="text-center py-12">
              <p className="text-gray-400">No reposts yet</p>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="text-center py-12">
              <p className="text-gray-400">No favorites yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
