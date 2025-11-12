import React, { useEffect, useState} from 'react';
import { useAlbums } from '../hooks/useAlbums';
import { useReviews } from '../hooks/useReviews';
import { useProfile } from '../context/profileContext';
import { ReviewCard } from '../components/ReviewCard';


export function Home() {
  const { albums, loading: albumsLoading } = useAlbums();
  const { reviews, loading: reviewsLoading} = useReviews();
  const { profile, loading: profileLoading} = useProfile();
  
  function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const unFilled = '☆'.repeat(5 - rating);
    return filled + unFilled;
  }
  

  return (
    <main>
        <section>
        <h2 className="px-2">New Releases</h2>
        {albumsLoading ? (
          <p>Loading albums ...</p>
        ): (
          <div className="flex space-x-6 px-4"> 
            {albums.map((release) => {
              return(
              <div key={release.id} className="w-60 text-center">
              <img src={release.artworkUrl} alt={release.title + " - " + release.artist} className="w-full rounded-lg"/>
              <p className="text-sm">{release.title + " - " + release.artist}</p>
            </div>
            )})
          }
        </div>
      )}     
    </section>
        <hr/>
        <p className='px-4'>Popular Reviews</p>
        <div className="p-4 space-y-3 max-w-3xl mx-auto">

          {reviewsLoading? (
            <p>Loading Reviews... </p>
          ): (reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          )))}
          </div>
        </main>
  );
}



   