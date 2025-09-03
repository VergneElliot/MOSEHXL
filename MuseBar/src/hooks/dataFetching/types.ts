/**
 * Types and Interfaces for Data Fetching Hooks
 * Shared type definitions across all data fetching modules
 */

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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface UsePaginatedDataOptions<T> extends Omit<UseDataFetchingOptions<PaginatedResponse<T>>, 'onSuccess'> {
  pageSize?: number;
  initialPage?: number;
  onSuccess?: (data: PaginatedResponse<T>) => void;
}

export interface UsePaginatedDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (newData: T[]) => void;
  invalidate: () => void;
  isStale: boolean;
  isFetching: boolean;
  lastFetched: Date | null;
  // Pagination specific
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  loadMore: () => Promise<void>;
}

export interface UseInfiniteScrollDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isLoadingMore: boolean;
}
