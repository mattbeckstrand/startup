import { useEffect, useState} from 'react';
import { useSpotify, searchSongs } from '../spotify';

export function useSongs() {
    const token = useSpotify();
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchSongsWithArtwork = async () => {
        if (!token) return;

        try {
            const response = await fetch('/api/songs/samples');
            const dbSongs = await response.json();
            
            if (!Array.isArray(dbSongs)) {
                console.error('dbSongs is not an array:', dbSongs);
                setLoading(false);
                return;
            }
            
            const songsWithArtwork = await Promise.all(
                dbSongs.map(async (song) => {
                    try{
                    const spotifySongs = await searchSongs(token, `${song.title} ${song.artist}`);
                    return {
                        ...song,
                        artworkUrl: spotifySongs[0]?.album.images[0].url || null
                    };
                    } catch (error) {
                    console.error('error retrieving songs or artwork', error)
                    return { ...song, artworkUrl: null};
                    }
                })
            )
            setSongs(songsWithArtwork);
        } catch (error) {
            console.error('Failed to fetch songs: ', error)
        } finally {
            setLoading(false)
        }
        };
        fetchSongsWithArtwork();
    }, [token]);
    return {songs: songs, loading}; 
}
