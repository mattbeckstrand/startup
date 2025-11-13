import { useEffect, useState} from 'react';
import { getNewReleases, useSpotify } from '../spotify';

export function useNewReleases() {
    const [newReleases, setNewReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = useSpotify();
    
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        const fetchNewReleases = async () => {
            try {
                const albums = await getNewReleases(token);
                console.log(albums.items)
                setNewReleases(albums.items)
                setLoading(false);

            } catch (error) {
                console.error('error in new releases:', error);
                setLoading(false);
            }  
        }
        fetchNewReleases();

    }, [token]);

    return {newReleases, loading}; 
}
