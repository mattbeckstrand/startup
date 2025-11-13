import React, { useEffect, useState} from 'react';
import { useNewReleases } from '../hooks/useNewReleases';
import { useReviews } from '../hooks/useReviews';
import { useProfile } from '../context/profileContext';
import { ReviewCard } from '../components/ReviewCard';


export function Home() {
  const { newReleases, loading: newReleasesLoading } = useNewReleases();
  const { reviews, loading: reviewsLoading} = useReviews();
  const { profile, loading: profileLoading} = useProfile();
  

  return (
    <main>
        <section>
        <h2 className="px-4 pb-3 pt-2">New Releases</h2>
        {newReleasesLoading ? (
          <p>Loading newReleases ...</p>
        ): (
          <div className="flex gap-6 px-4 overflow-x-auto overflow-y-hidden flex-nowrap pb-4"> 
            {newReleases.map((release) => {
              return(
                <div key={release.id} className="w-30 flex-shrink-0">
                <img 
                  src={release.images?.[0]?.url} 
                  alt={release.name} 
                  className="h-30 w-30 object-cover rounded-lg flex-shrink-0"/>
                <p className="text-sm mt-1 truncate">
                  {release.name} - {release.artists?.[0]?.name}
                </p>
              </div>
            )})
          }
        </div>
      )}     
    </section>
        <hr/>
        <p className='px-4 pt-4'>Popular Reviews</p>
        <div className="">
      {reviewsLoading? (
            <p>Loading Reviews... </p>
          ): (reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          )))}
        </div>
        </main>
  );
}



   