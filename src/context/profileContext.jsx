import React, { createContext, useContext } from 'react';
import { useProfiles } from '../hooks/useProfiles';

const ProfileContext = createContext()

export function ProfileProvider({ children }) {
    const { profile, loading: profileLoading}  = useProfiles();

    const value = {
        profile,
        profileLoading, 
    };

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
}
    export function useProfile() {
        const context = useContext(ProfileContext);

        if (!context) {
            throw new Error('useProfile must be used within a profile provider')
        }
        return context;
    }
