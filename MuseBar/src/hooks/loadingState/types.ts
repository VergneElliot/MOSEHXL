/**
 * Loading State Types
 * Shared type definitions for loading state management
 */

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  isRetrying: boolean;
  retryCount: number;
}

export interface UseLoadingStateReturn {
  loadingState: LoadingState;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  retry: () => void;
  executeWithLoading: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
  isIdle: boolean;
  hasError: boolean;
}

export interface MultipleLoadingState {
  [key: string]: LoadingState;
}

export interface UseMultipleLoadingStateReturn {
  loadingStates: MultipleLoadingState;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  isAnyLoading: boolean;
  hasAnyError: boolean;
  getLoadingState: (key: string) => LoadingState;
  executeWithLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T | null>;
}

export interface UseAsyncStateOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  retryDelay?: number;
  maxRetries?: number;
}

export interface UseAsyncStateReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (asyncFn: () => Promise<T>) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  isIdle: boolean;
  canRetry: boolean;
}
