import React, { useEffect, useState} from 'react';
import { useAlbums } from '../hooks/useAlbums';
import { useReviews } from '../hooks/useReviews';

export function Home() {
  const { albums, loading: albumsLoading } = useAlbums();
  const { reviews, loading: reviewsLoading} = useReviews();
  
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
        <div className="p-4">

          {reviewsLoading? (
            <p>Loading Reviews... </p>
          ): (reviews.map((review) => {
            return(
              <div key={review.id}>
              <div className="flex items-center space-x-2">
              <img src="/Images/ProfileIcon.webp" alt="Profile" className="w-10 h-10 rounded-full"/>
              <span>{review.username}</span>
            </div>
            <div className="mt-4 inline-block ">
                <img src={review.artworkUrl} alt={review.title + ' - ' + review.artist} className="w-60 rounded-lg"/>
                <p>{review.title + ' - ' + review.artist}</p>
              </div>
            <div>
            <p className="mt-2">{renderStars(review.rating)}</p>
            <p>{review.text}</p>
            </div>
            </div>
            )
          }))}
          </div>
        </main>
  );
}



   