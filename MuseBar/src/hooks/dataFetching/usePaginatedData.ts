/**
 * Paginated Data Fetching Hook
 * Handles pagination with data fetching and caching
 */

import { useState, useCallback, useMemo } from 'react';
import { useDataFetching } from './useDataFetching';
import { PaginatedResponse, UsePaginatedDataOptions, UsePaginatedDataReturn } from './types';

export const usePaginatedData = <T>(
  fetchFn: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  options: UsePaginatedDataOptions<T> = {}
): UsePaginatedDataReturn<T> => {
  const {
    pageSize = 10,
    initialPage = 1,
    ...dataOptions
  } = options;

  const [page, setPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);

  const paginatedFetchFn = useCallback(async () => {
    const result = await fetchFn(page, pageSize);
    setTotalItems(result.total);
    return result;
  }, [fetchFn, page, pageSize]);

  const {
    data: paginatedData,
    loading,
    error,
    refetch,
    mutate: mutatePaginated,
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

  const mutate = useCallback((newData: T[]) => {
    mutatePaginated({ data: newData, total: totalItems });
  }, [mutatePaginated, totalItems]);

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loading) {
      const nextPageData = await fetchFn(page + 1, pageSize);
      if (paginatedData) {
        mutate([...paginatedData.data, ...nextPageData.data]);
      }
      setPage(prev => prev + 1);
    }
  }, [hasNextPage, loading, fetchFn, page, pageSize, paginatedData, mutate]);

  return {
    data: paginatedData?.data || [],
    loading,
    error,
    refetch,
    mutate,
    invalidate,
    isStale,
    isFetching,
    lastFetched,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    loadMore,
  };
};
