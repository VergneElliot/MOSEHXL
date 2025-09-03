/**
 * Infinite Scroll Data Fetching Hook
 * Handles infinite scrolling with automatic loading and data accumulation
 */

import { useState, useCallback, useEffect } from 'react';
import { useLoadingState } from '../useLoadingState';
import { UseInfiniteScrollDataReturn } from './types';

export const useInfiniteScrollData = <T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>,
  pageSize: number = 20
): UseInfiniteScrollDataReturn<T> => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { loadingState, executeWithLoading } = useLoadingState();

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
      
      if (append && pageNumber > 1) {
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
    if (hasMore && !loadingState.isLoading && !isLoadingMore) {
      await loadPage(page + 1, true);
    }
  }, [hasMore, loadingState.isLoading, isLoadingMore, loadPage, page]);

  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await loadPage(1, false);
  }, [loadPage]);

  // Initial load
  useEffect(() => {
    if (data.length === 0 && !loadingState.isLoading) {
      loadPage(1, false);
    }
  }, []);

  return {
    data,
    loading: loadingState.isLoading,
    error: loadingState.error,
    hasMore,
    loadMore,
    refresh,
    isLoadingMore,
  };
};
