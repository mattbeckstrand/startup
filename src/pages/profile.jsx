import React, { useState, useEffect } from 'react';
import { useMyReviews } from '../hooks/useMyReviews';
import { useProfile } from '../context/profileContext';


export function Profile() {
  const {reviews, loading: reviewsLoading} = useMyReviews();
  const { profile, profileLoading} = useProfile();

  const [followers, setFollowers] = useState();
  const [following, setFollowing] = useState();

  useEffect(() => {
    setFollowers(10),
    setFollowing(10)
  }, [])

  function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const unFilled = '☆'.repeat(5 - rating);
    return filled + unFilled;
  }

  if (profileLoading) {
    return <p>Loading profile...</p>;
  }

  // Or check if profile is null/falsy
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
          <span>Listening History</span>
        </div>
      </div>
      <hr />
      <div className="mt-4">
        {reviewsLoading? (
          <p>ReviewsLoading</p>
        ) : ( reviews.map((review) =>
          (<div key={review.id}>
            <div className="flex items-center space-x-2 mb-3">
            <img src={review.profiles.avatar_url} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
            <span className="font-semibold">{review.profiles.username}</span>
          </div>
          <img src={review.artworkUrl} alt={review.title + '-'  + review.artist} width="200" className="rounded-lg mb-2" />
          <p className="font-semibold">{review.title}</p>
          <p className="text-yellow-400">{renderStars(review.rating)}</p>
          <p className="text-gray-300">{review.review}</p>
          </div>
          ))
        )}
        </div>
    </main>
  );
}
