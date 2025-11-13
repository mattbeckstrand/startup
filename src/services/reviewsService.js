import { getMyReviews, getReviews } from "../api/reviews";
import { searchAlbums } from "../spotify";


export async function putArtworkWithReview( review, spotifyToken) {
    if (review.artworkUrl) return review;

    try{
        const albums = await searchAlbums(
            spotifyToken,
            `${review.album} ${review.artist}`
        );
        return {
            ...review,
            artworkUrl: albums[0]?.images[0]?.url || null
        };
    } catch (error) {
        console.error('Error fetching artwork: ', error);
        return { ...review, artworkUrl: null}
    }
}

export async function putArtworkWithMultReviews(reviews, spotifyToken) {
    return Promise.all(
        reviews.map(review => putArtworkWithReview(review, spotifyToken))
    );
}

export async function fetchMyReviews(authToken, spotifyToken) {
    const reviews = await getMyReviews(authToken);
    return putArtworkWithMultReviews(reviews, spotifyToken);
}

export async function fetchReviews(spotifyToken) {
    const reviews = await getReviews();
    return putArtworkWithMultReviews(reviews, spotifyToken);
}