import { useEffect, useState } from "react";
import { useSpotify, searchAlbums } from "../spotify";

export function useReviews() {
    const token = useSpotify();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviewsWithArtwork = async () => {
            if(!token) return;

            try{
                const response = await fetch('/api/songs/reviews');
                const dbReviews = await response.json();

                const reviewsWithArtwork = await Promise.all(
                    dbReviews.map(async (review) => {
                        try{
                            const spotifyAlbums = await searchAlbums(token, `${review.title} ${review.artist}`);
                            return{
                                ...review,
                                artworkUrl: spotifyAlbums[0]?.images[0].url || null
                             };
                        } catch (error) {
                            console.error('error retrieving artwork for reviews')
                            return { ...review, artworkUrl: null};
                        }
                    })
                )
                setReviews(reviewsWithArtwork);
            } catch (error) {
                console.error('Failed to fetch Reviews', error)
            } finally {
                setLoading(false)
            }
        }
        fetchReviewsWithArtwork();
    }, [token])
    return {reviews, loading};
}