import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './authContext';

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const { user, token, isAuthenticated, loading: authLoading, handleUnauthorized } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    // Wait for auth to finish loading first
    if (authLoading) {
      return;
    }

    // If not authenticated, don't try to fetch
    if (!isAuthenticated || !token) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/profiles/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token is invalid/expired - redirect to login
        handleUnauthorized();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [isAuthenticated, token, authLoading, handleUnauthorized]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates) => {
    if (!token) return null;

    try {
      const response = await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        return updatedProfile;
      }
      return null;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return null;
    }
  }, [token, handleUnauthorized]);

  const value = {
    profile,
    profileLoading: authLoading || profileLoading,
    refreshProfile,
    updateProfile
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
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
