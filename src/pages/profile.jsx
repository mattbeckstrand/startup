import React, { useState, useEffect } from 'react';
import { useMyReviews } from '../hooks/useMyReviews';
import { useProfile } from '../context/profileContext'
import { ReviewCard } from '../components/ReviewCard';
import { useAuth } from '../context/authContext';


export function Profile() {
  const {reviews, loading: reviewsLoading} = useMyReviews();
  const { profile, profileLoading} = useProfile();
  const { token } = useAuth();

  const [followers, setFollowers] = useState();
  const [following, setFollowing] = useState();

  useEffect(() => {
    if (!profile?.id || !token) return;
    
    fetch('/api/profiles/follow-counts', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        console.log(res.status)
        return res.json()
      })
      .then(data => {
        setFollowers(data.followers_count || 0);
        setFollowing(data.following_count || 0);
      })
      .catch(error => console.error('Failed to get counts:', error));
      
  }, [profile?.id, token]);

  function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const unFilled = '☆'.repeat(5 - rating);
    return filled + unFilled;
  }

  if (profileLoading) {
    return <p>Loading profile...</p>;
  }

  if (!profile) {
    return <p>No profile found. Please log in.</p>;
  }

  return (
    <main className="p-4">
      <div className="flex items-center space-x-6 mb-6">
        <img src={profile.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
        <div>
          <h2 className="text-2xl font-bold">{profile.display_name}</h2>
          <p className="text-gray-300">{profile.username}</p>
        </div>
        <div className="flex space-x-6 ml-auto">
          <span>{'Followers' + followers}</span>
          <span>{'Following' +  following}</span>
        </div>
      </div>
      <hr />
      <div className="mt-4">
      {reviewsLoading? (
            <p>Loading Reviews... </p>
          ): (reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          )))}
        </div>
    </main>
  );
}
