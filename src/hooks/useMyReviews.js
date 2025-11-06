import { useEffect, useState } from "react";
import { useSpotify, searchAlbums } from "../spotify";
import { useAuth } from "../context/authContext";

export function useMyReviews() {
    const spotifyToken = useSpotify();
    const { token: authToken } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchReviewsWithArtwork = async () => {
        if (!spotifyToken || !authToken) return;

        try {
            const response = await fetch('/api/songs/reviews/my', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const dbReviews = await response.json();
            
            if (!Array.isArray(dbReviews)) {
                console.error('dbSongs is not an array:', dbReviews);
                setLoading(false);
                return;
            }
            
            const reviewsWithArtwork = await Promise.all(
                dbReviews.map(async (review) => {
                    try{
                    const spotifyAlbums = await searchAlbums(spotifyToken, `${review.title} ${review.artist}`);
                    return {
                        ...review,
                        artworkUrl: spotifyAlbums[0]?.images[0].url || null
                    };
                    } catch (error) {
                    console.error('error retrieving songs or artwork', error)
                    return { ...review, artworkUrl: null};
                    }
                })
            )
            setReviews(reviewsWithArtwork);
        } catch (error) {
            console.error('Failed to fetch songs: ', error)
        } finally {
            setLoading(false)
        }
        };
        fetchReviewsWithArtwork();
    }, [spotifyToken, authToken]);
    return {reviews: reviews, loading}; 
}
