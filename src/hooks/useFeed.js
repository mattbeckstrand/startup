import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/authContext';

export function useFeed(type = 'forYou') {
  const { token, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;
      let endpoint = '/api/reviews';
      
      if (type === 'following' && isAuthenticated) {
        endpoint = '/api/reviews/following';
      }

      const headers = isAuthenticated ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(
        `${endpoint}?limit=20&offset=${currentOffset}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setReviews(data);
        } else {
          setReviews(prev => [...prev, ...data]);
        }
        
        setHasMore(data.length === 20);
        setOffset(currentOffset + data.length);
        setError(null);
      } else {
        throw new Error('Failed to fetch reviews');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [type, token, isAuthenticated, offset]);

  useEffect(() => {
    fetchReviews(true);
  }, [type]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchReviews(false);
    }
  }, [loadingMore, hasMore, fetchReviews]);

  const refresh = useCallback(() => {
    fetchReviews(true);
  }, [fetchReviews]);

  return {
    reviews,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh
  };
}

