/**
 * Data Fetching Hook
 * Advanced data fetching with caching, loading states, and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLoadingState, useAsyncState } from './useLoadingState';

export interface UseDataFetchingOptions<T> {
  cacheKey?: string;
  cacheDuration?: number; // in milliseconds
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export interface UseDataFetchingReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
  invalidate: () => void;
  isStale: boolean;
  isFetching: boolean;
  lastFetched: Date | null;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number; }>() ;

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

  const [data, setData] = useState<T | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { loadingState, executeWithLoading } = useLoadingState(maxRetries);
  const mountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  
  // Update fetchFn ref when it changes
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;
    
    const cached = cache.get(cacheKey);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cacheDuration;
    if (isExpired) {
      cache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }, [cacheKey, cacheDuration]);

  const setCachedData = useCallback((newData: T) => {
    if (cacheKey) {
      cache.set(cacheKey, {
        data: newData,
        timestamp: Date.now(),
      });
    }
  }, [cacheKey]);

  const isStale = lastFetched ? Date.now() - lastFetched.getTime() > staleTime : true;

  const fetchData = useCallback(async (force = false) => {
    // Check cache first if not forcing
    if (!force) {
      const cachedData = getCachedData();
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }

    const result = await executeWithLoading(async () => {
      const fetchedData = await fetchFnRef.current();
      
      if (!mountedRef.current) return fetchedData;
      
      setData(fetchedData);
      setLastFetched(new Date());
      setCachedData(fetchedData);
      onSuccess?.(fetchedData);
      
      return fetchedData;
    });

    if (result === null && loadingState.error) {
      onError?.(loadingState.error);
    }
  }, [getCachedData, executeWithLoading, setCachedData, onSuccess, onError, loadingState.error]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    setCachedData(newData);
    setLastFetched(new Date());
  }, [setCachedData]);

  const invalidate = useCallback(() => {
    if (cacheKey) {
      cache.delete(cacheKey);
    }
    setData(null);
    setLastFetched(null);
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale && !loadingState.isLoading) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, loadingState.isLoading, fetchData]);

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

/**
 * Paginated Data Fetching Hook
 */
export interface UsePaginatedDataOptions<T> extends UseDataFetchingOptions<T[]> {
  pageSize?: number;
  initialPage?: number;
}

export interface UsePaginatedDataReturn<T> extends UseDataFetchingReturn<T[]> {
  page: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPages: number;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  loadMore: () => Promise<void>;
}

export const usePaginatedData = <T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; total: number; }>,
  options: UsePaginatedDataOptions<T> = {}
): UsePaginatedDataReturn<T> => {
  const { pageSize = 20, initialPage = 1, ...dataOptions } = options;
  const [page, setPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);

  const paginatedFetchFn = useCallback(async () => {
    const result = await fetchFn(page, pageSize);
    setTotalItems(result.total);
    return result.data;
  }, [fetchFn, page, pageSize]);

  const {
    data,
    loading,
    error,
    refetch,
    mutate,
    invalidate,
    isStale,
    isFetching,
    lastFetched,
  } = useDataFetching(paginatedFetchFn, {
    ...dataOptions,
    cacheKey: dataOptions.cacheKey ? `${dataOptions.cacheKey}_page_${page}` : undefined,
  });

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loading) {
      const nextPageData = await fetchFn(page + 1, pageSize);
      if (data) {
        mutate([...data, ...nextPageData.data]);
      }
      setPage(prev => prev + 1);
    }
  }, [hasNextPage, loading, fetchFn, page, pageSize, data, mutate]);

  return {
    data: data || [],
    loading,
    error,
    refetch,
    mutate,
    invalidate,
    isStale,
    isFetching,
    lastFetched,
    page,
    hasNextPage,
    hasPreviousPage,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
    loadMore,
  };
};

/**
 * Infinite Scroll Data Hook
 */
export interface UseInfiniteScrollDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isLoadingMore: boolean;
}

export const useInfiniteScrollData = <T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean; }>,
  pageSize: number = 20
): UseInfiniteScrollDataReturn<T> => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { loading, error, executeWithLoading } = useLoadingState();

  const loadPage = useCallback(async (pageNumber: number, append = false) => {
    const execute = pageNumber === 1 ? executeWithLoading : 
      async (fn: () => Promise<any>) => {
        setIsLoadingMore(true);
        try {
          const result = await fn();
          setIsLoadingMore(false);
          return result;
        } catch (error) {
          setIsLoadingMore(false);
          throw error;
        }
      };

    const result = await execute(async () => {
      const response = await fetchFn(pageNumber, pageSize);
      
      if (append && data.length > 0) {
        setData(prev => [...prev, ...response.data]);
      } else {
        setData(response.data);
      }
      
      setHasMore(response.hasMore);
      setPage(pageNumber);
      
      return response;
    });

    return result;
  }, [executeWithLoading, fetchFn, pageSize, data.length]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading && !isLoadingMore) {
      await loadPage(page + 1, true);
    }
  }, [hasMore, loading, isLoadingMore, loadPage, page]);

  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await loadPage(1, false);
  }, [loadPage]);

  // Initial load
  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    isLoadingMore,
  };
};

