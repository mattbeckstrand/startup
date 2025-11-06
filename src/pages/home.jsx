import React, { useEffect, useState} from 'react';
import { useSpotify, searchSongs } from '../spotify';

export function Home() {
  const token = useSpotify();
  const [artworkUrl, setArtworkUrl] = useState(null);
  const [newReleases, setNewReleases] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const unFilled = '☆'.repeat(5 - rating);
    return filled + unFilled;
  }


  useEffect(() => {
    const loadSong = async () => {
      if (!token) return;
      try {
        const songs = await searchSongs(token, "Shake it off Taylor Swift");
        
        if (songs && songs.length > 0) {
          setArtworkUrl(songs[0].album.images[0].url); 
        }
      } catch (error) {
        console.error('Failed to load song:', error);
      }
    };
    loadSong();
  }, [token])
  
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
      {artworkUrl ? (
              <img src={artworkUrl} alt="Album artwork" className="w-64" />
            ) : (
              <p>Loading...</p>
            )}
        <section>
        <h2 className="px-2">New Releases</h2>
        <div className="flex space-x-6 px-4"> 
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
        <div className="p-4">
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



   