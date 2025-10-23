import React, { useEffect, useState} from 'react';

export function Home() {
  const [newReleases, setNewReleases] = useState([]);
  const [reviews, setReviews] = useState([])

  function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const unFilled = '☆'.repeat(5 - rating);
    return filled + unFilled;
  }

  const releases = [
    {title: 'Play', artist: 'Ed Sheeran', artworkLocation: '/Images/play.webp'},
    {title: 'Swag', artist: 'Justin Bieber', artworkLocation: '/Images/Swag.png'},
    {title: 'Blonde', artist: 'Frank Ocean', artworkLocation: '/Images/blonge.jpeg'},
    {title: 'Beloved', artist: 'GIVĒON', artworkLocation: '/Images/Beloved.jpg'}
  ]


  const hcReviews = [
    {id: 1, username: 'mattbeck', title:'Swag', artist:'Justin Bieber', album: 'Swag', rating: 4, artworkLocation: '/Images/Swag.png', text:"I thought this album was good but I didn't think it was amazing. Justin Bieber had 3 good songs in this."},
    {id: 2, username: 'pwatts', title:'Swag II', artist:'Justin Bieber', album: 'Swag II', rating: 2, artworkLocation: '/Images/Swag.png', text:"Has some good parts but ultimately not as good as Swag I"}
  ]

  useEffect(() => {
    setNewReleases(releases),
    setReviews(hcReviews)
  }, [])
  return (
    <main>
        <section>
        <h2>New Releases</h2>
        <div className="flex space-x-6"> 
            {newReleases.map((release) => {
              return(
              <div className="w-60 text-center">
              <img src={release.artworkLocation} alt={release.title + " - " + release.artist} className="w-full rounded-lg"/>
              <p className="text-sm">{release.title + " - " + release.artist}</p>
            </div>
            )})
          }
        </div>      
    </section>
        <hr/>
        <div class="p-4">
          {reviews.map((review) => {
            return(
              <div>
              <div className="flex items-center space-x-2">
              <img src="/Images/ProfileIcon.webp" alt="Profile" className="w-10 h-10 rounded-full"/>
              <span>{review.username}</span>
            </div>
            <div className="mt-4 inline-block ">
                <img src={review.artworkLocation} alt={review.title + ' - ' + review.artist} className="w-60 rounded-lg"/>
                <p>{review.title + ' - ' + review.artist}</p>
              </div>
            <div>
            <p className="mt-2">{renderStars(review.rating)}</p>
            <p>{review.text}</p>
            </div>
            </div>
            )
          })}

          </div>
        </main>
  );
}



   