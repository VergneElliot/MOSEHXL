/**
 * Core Data Fetching Hook
 * Advanced data fetching with caching, loading states, and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLoadingState } from '../useLoadingState';
import { getCachedData, setCachedData, invalidateCache, isDataStale } from './cacheManager';
import { UseDataFetchingOptions, UseDataFetchingReturn } from './types';

export const useDataFetching = <T>(
  fetchFn: () => Promise<T>,
  options: UseDataFetchingOptions<T> = {}
): UseDataFetchingReturn<T> => {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    retryOnError = true,
    maxRetries = 3,
    staleTime = 0,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    return cacheKey ? getCachedData<T>(cacheKey, cacheDuration) : null;
  });
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { loadingState, executeWithLoading } = useLoadingState(maxRetries);
  const mountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  // Update fetchFn ref when it changes
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // Check if data is stale
  const isStale = cacheKey ? isDataStale(cacheKey, staleTime) : false;

  const fetchData = useCallback(async (forceFetch = false) => {
    if (!forceFetch && cacheKey) {
      const cachedData = getCachedData<T>(cacheKey, cacheDuration);
      if (cachedData) {
        setData(cachedData);
        setLastFetched(new Date());
        onSuccess?.(cachedData);
        return cachedData;
      }
    }

    const result = await executeWithLoading(async () => {
      const fetchedData = await fetchFnRef.current();
      if (!mountedRef.current) return fetchedData;

      setData(fetchedData);
      setLastFetched(new Date());
      
      if (cacheKey) {
        setCachedData(cacheKey, fetchedData);
      }
      
      return fetchedData;
    });

    if (result === null && loadingState.error) {
      onError?.(loadingState.error);
    }
  }, [getCachedData, executeWithLoading, setCachedData, onSuccess, onError, loadingState.error]);

  const refetch = useCallback(async () => { await fetchData(true); }, [fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    if (cacheKey) {
      setCachedData(cacheKey, newData);
    }
    setLastFetched(new Date());
  }, [cacheKey]);

  const invalidate = useCallback(() => {
    if (cacheKey) {
      invalidateCache(cacheKey);
    }
    setData(null);
    setLastFetched(null);
  }, [cacheKey]);

  // Handle window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, fetchData]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount || (!data && !loadingState.isLoading)) {
      fetchData();
    }
  }, [refetchOnMount]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading: loadingState.isLoading,
    error: loadingState.error,
    refetch,
    mutate,
    invalidate,
    isStale,
    isFetching: loadingState.isLoading,
    lastFetched,
  };
};
