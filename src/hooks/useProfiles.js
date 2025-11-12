import { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { fetchMyProfile } from "../services/profilesService";

export function useProfiles() {
    const { token: authToken } = useAuth();
    const [profile, setProfile] = useState([]);
    const [loading, setLoading] = useState();
    
    useEffect(() => {
        if (!authToken) {
            setProfile(null)
            setLoading(false);
            return;
        }
        
        setLoading(true);
        fetchMyProfile(authToken)
            .then(setProfile)
            .catch(error => console.error('get my reviews failed: ', error))
            .finally(() => setLoading(false))        

    }, [authToken]);
    return { profile, loading }; 
}
