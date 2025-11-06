import { useEffect, useState} from 'react';
import { useSpotify, searchAlbums } from '../spotify';

export function useAlbums() {
    const token = useSpotify();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchAlbumsWithArtwork = async () => {
        if (!token) return;

        try {
            const response = await fetch('http://localhost:4000/api/songs/newReleases');
            const dbAlbums = await response.json();
            
            if (!Array.isArray(dbAlbums)) {
                console.error('dbAlbums is not an array:', dbAlbums);
                setLoading(false);
                return;
            }
            
            const albumsWithArtwork = await Promise.all(
                dbAlbums.map(async (album) => {
                    try{
                    const spotifyAlbums = await searchAlbums(token, `${album.title} ${album.artist}`);
                    return {
                        ...album,
                        artworkUrl: spotifyAlbums[0]?.images[0].url || null
                    };
                    } catch (error) {
                    console.log('error retrieving songs or artwork')
                    return { ...album, artworkUrl: null};
                    }
                })
            )
            setAlbums(albumsWithArtwork);
        } catch (error) {
            console.error('Failed to fetch songs: ', error)
        } finally {
            setLoading(false)
        }
        };
        fetchAlbumsWithArtwork();
    }, [token]);
    return {albums, loading}; 
}
