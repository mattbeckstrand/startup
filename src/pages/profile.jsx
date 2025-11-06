import React, { useState, useEffect } from 'react';


export function Profile() {

  const [profile, setProfile] = useState({});
  const [reviews, setReviews] = useState([]);
  const [followers, setFollowers] = useState();
  const [following, setFollowing] = useState();


  useEffect(() => {
    setProfile({id: 'xyz', username: 'mattbeckstrand', displayName: 'Matt Beckstrand', avatarLocation:'/Images/IMG_2769.jpg', bio:'Nothing better than finding a new song'})
    setReviews(
      [
        {id: 1, title:'Swag', artist:'Justin Bieber', album: 'Swag', rating: 4, artworkLocation: '/Images/Swag.png', text:"I thought this album was good but I didn't think it was amazing. Justin Bieber had 3 good songs in this."},
      {id: 2, title:'Swag II', artist:'Justin Bieber', album: 'Swag II', rating: 2, artworkLocation: '/Images/Swag.png', text:"Has some good parts but ultimately not as good as Swag I"}
    ]
    ),
    setFollowers(10),
    setFollowing(10)
  }, [])

  function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const unFilled = '☆'.repeat(5 - rating);
    return filled + unFilled;
  }

  return (
    <main className="p-4">
      <div className="flex items-center space-x-6 mb-6">
        <img src={profile.avatarLocation} alt="Profile" className="w-20 h-20 rounded-full" />
        <div>
          <h2 className="text-2xl font-bold">{profile.displayName}</h2>
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
        {reviews.map((review) =>
          (<div key={review.id}>
            <div className="flex items-center space-x-2 mb-3">
            <img src="/Images/ProfileIcon.webp" alt="Profile" width="26" height="26" className="rounded-full" />
            <span className="font-semibold">{review.username}</span>
          </div>
          <img src={review.artworkLocation} alt={review.title + '-'  + review.artist} width="200" className="rounded-lg mb-2" />
          <p className="font-semibold">{review.title}</p>
          <p className="text-yellow-400">{renderStars(review.rating)}</p>
          <p className="text-gray-300">{review.text}</p>
          </div>
          ))
        }
        </div>
    </main>
  );
}

