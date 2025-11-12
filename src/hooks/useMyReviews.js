import { useEffect, useState } from "react";
import { useSpotify } from "../spotify";
import { useAuth } from "../context/authContext";
import { fetchMyReviews } from "../services/reviewsService";

export function useMyReviews() {
    const spotifyToken = useSpotify();
    const { token: authToken } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!authToken || !spotifyToken) return;
        
        fetchMyReviews(authToken, spotifyToken)
            .then(setReviews)
            .catch(error => console.error('get my reviews failed: ', error))
            .finally(() => setLoading(false))        

    }, [spotifyToken, authToken]);
    return { reviews, loading }; 
}
