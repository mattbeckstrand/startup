// TanStack Query hooks for cached data fetching
// These hooks automatically cache responses, dedupe requests, and handle loading states

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../context/authContext';

const API_BASE = '/api';

// Helper to create fetch function with auth
function useFetcher() {
  const { token, isAuthenticated, handleUnauthorized } = useAuth();
  
  return async (endpoint) => {
    const headers = isAuthenticated && token 
      ? { 'Authorization': `Bearer ${token}` } 
      : {};
    
    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    
    if (response.status === 401) {
      // Token expired or invalid - handle unauthorized
      handleUnauthorized();
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response.json();
  };
}

// ============================================
// REVIEWS QUERIES
// ============================================

// Feed reviews with infinite scroll
export function useFeedReviews(type = 'forYou') {
  const { token, isAuthenticated, handleUnauthorized } = useAuth();
  
  return useInfiniteQuery({
    queryKey: ['reviews', 'feed', type, isAuthenticated],
    queryFn: async ({ pageParam = 0 }) => {
      const endpoint = type === 'following' && isAuthenticated 
        ? '/api/reviews/following' 
        : '/api/reviews';
      
      const headers = isAuthenticated && token 
        ? { 'Authorization': `Bearer ${token}` } 
        : {};
      
      const response = await fetch(
        `${endpoint}?limit=20&offset=${pageParam}`,
        { headers }
      );
      
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
      }
      
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got less than 20 items, there's no more data
      if (lastPage.length < 20) return undefined;
      // Return the next offset
      return allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2, // 2 minutes for feed (slightly fresher)
  });
}

// Single review by ID
export function useReview(reviewId) {
  const fetcher = useFetcher();
  
  return useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => fetcher(`/reviews/${reviewId}`),
    enabled: !!reviewId,
    staleTime: 1000 * 60 * 5,
  });
}

// User's own reviews
export function useMyReviews() {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['reviews', 'my'],
    queryFn: () => fetcher('/reviews/my'),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

// Reviews by specific user
export function useUserReviews(userId) {
  const fetcher = useFetcher();
  
  return useQuery({
    queryKey: ['reviews', 'user', userId],
    queryFn: () => fetcher(`/reviews/user/${userId}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// PROFILE QUERIES
// ============================================

// Current user's profile
export function useMyProfile() {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => fetcher('/profiles/me'),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10, // Profile doesn't change often
  });
}

// Any user's profile by ID
export function useUserProfile(userId) {
  const fetcher = useFetcher();
  
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetcher(`/profiles/${userId}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// Follow status for a user
export function useFollowStatus(userId) {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['followStatus', userId],
    queryFn: () => fetcher(`/relationships/status/${userId}`),
    enabled: !!userId && isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

// ============================================
// ALBUM QUERIES
// ============================================

// New releases (frequently accessed, cache longer)
export function useNewReleases(limit = 15) {
  return useQuery({
    queryKey: ['albums', 'new-releases', limit],
    queryFn: async () => {
      const response = await fetch(`/api/albums/new-releases?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch new releases');
      return response.json();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - doesn't change often
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

// Popular albums
export function usePopularAlbums(limit = 10) {
  return useQuery({
    queryKey: ['albums', 'popular', limit],
    queryFn: async () => {
      const response = await fetch(`/api/albums/popular?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch popular albums');
      return response.json();
    },
    staleTime: 1000 * 60 * 10,
  });
}

// Single album by ID
export function useAlbum(albumId) {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const response = await fetch(`/api/albums/${albumId}`);
      if (!response.ok) throw new Error('Failed to fetch album');
      return response.json();
    },
    enabled: !!albumId,
    staleTime: 1000 * 60 * 30, // Albums don't change
  });
}

// ============================================
// NOTIFICATIONS QUERIES
// ============================================

export function useNotifications(limit = 50) {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetcher(`/notifications?limit=${limit}`),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 1, // 1 minute - check frequently
  });
}

export function useUnreadNotificationCount() {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetcher('/notifications/unread-count'),
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Poll every minute
  });
}

// ============================================
// MESSAGES QUERIES
// ============================================

export function useConversations() {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetcher('/messages/conversations'),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 1,
  });
}

export function useMessages(conversationId, limit = 50) {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetcher(`/messages/conversations/${conversationId}?limit=${limit}`),
    enabled: !!conversationId && isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds for messages
  });
}

export function useUnreadMessageCount() {
  const fetcher = useFetcher();
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => fetcher('/messages/unread-count'),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

// ============================================
// COMMENTS QUERIES
// ============================================

export function useReviewComments(reviewId) {
  return useQuery({
    queryKey: ['comments', 'review', reviewId],
    queryFn: async () => {
      const response = await fetch(`/api/comments/review/${reviewId}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!reviewId,
    staleTime: 1000 * 60 * 2,
  });
}

// ============================================
// MUTATIONS (with cache invalidation)
// ============================================

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { token, handleUnauthorized } = useAuth();
  
  return useMutation({
    mutationFn: async (reviewData) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(reviewData),
      });
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
      }
      if (!response.ok) throw new Error('Failed to create review');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate feed and user reviews to show new content
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  const { token, handleUnauthorized } = useAuth();
  
  return useMutation({
    mutationFn: async ({ userId, action }) => {
      const response = await fetch(`/api/relationships/follow/${userId}`, {
        method: action === 'unfollow' ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
      }
      if (!response.ok) throw new Error('Failed to follow/unfollow');
      return response.json();
    },
    onSuccess: (_, { userId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'feed', 'following'] });
    },
  });
}

export function useLikeReview() {
  const queryClient = useQueryClient();
  const { token, handleUnauthorized } = useAuth();
  
  return useMutation({
    mutationFn: async ({ reviewId, action }) => {
      const response = await fetch(`/api/likes/review/${reviewId}`, {
        method: action === 'unlike' ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
      }
      if (!response.ok) throw new Error('Failed to like/unlike');
      return response.json();
    },
    onSuccess: (_, { reviewId }) => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
    },
  });
}

// ============================================
// SEARCH QUERIES (not cached as long)
// ============================================

export function useSearchUsers(query) {
  const fetcher = useFetcher();
  
  return useQuery({
    queryKey: ['search', 'users', query],
    queryFn: () => fetcher(`/profiles/search/users?q=${encodeURIComponent(query)}&limit=20`),
    enabled: query?.length >= 2,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSearchSongs(query) {
  return useQuery({
    queryKey: ['search', 'songs', query],
    queryFn: async () => {
      const response = await fetch(`/api/songs/search?q=${encodeURIComponent(query)}&limit=20`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: query?.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSearchAlbums(query) {
  return useQuery({
    queryKey: ['search', 'albums', query],
    queryFn: async () => {
      const response = await fetch(`/api/albums/search?q=${encodeURIComponent(query)}&limit=20`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: query?.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// UTILITY: Prefetch helper
// ============================================

export function usePrefetch() {
  const queryClient = useQueryClient();
  
  return {
    // Prefetch a user's profile when hovering over their name
    prefetchProfile: (userId) => {
      queryClient.prefetchQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
          const response = await fetch(`/api/profiles/${userId}`);
          return response.json();
        },
        staleTime: 1000 * 60 * 5,
      });
    },
    
    // Prefetch a review when hovering
    prefetchReview: (reviewId) => {
      queryClient.prefetchQuery({
        queryKey: ['review', reviewId],
        queryFn: async () => {
          const response = await fetch(`/api/reviews/${reviewId}`);
          return response.json();
        },
        staleTime: 1000 * 60 * 5,
      });
    },
  };
}

