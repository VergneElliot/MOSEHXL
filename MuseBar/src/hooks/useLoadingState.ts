/**
 * Loading State Hook
 * Advanced loading state management with error handling and retry logic
 */

import { useState, useCallback } from 'react';

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

export const useLoadingState = (maxRetries: number = 3): UseLoadingStateReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  const startLoading = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
      error,
    }));
  }, []);

  const clearError = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      error: null,
      retryCount: 0,
    }));
  }, []);

  const retry = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
      error: null,
    }));
  }, []);

  const executeWithLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    if (loadingState.retryCount >= maxRetries) {
      setError(`Maximum retry attempts (${maxRetries}) reached`);
      return null;
    }

    startLoading();
    
    try {
      const result = await asyncFn();
      stopLoading();
      
      // Reset retry count on success
      setLoadingState(prev => ({
        ...prev,
        retryCount: 0,
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    }
  }, [loadingState.retryCount, maxRetries, startLoading, stopLoading, setError]);

  return {
    loadingState,
    startLoading,
    stopLoading,
    setError,
    clearError,
    retry,
    executeWithLoading,
    isIdle: !loadingState.isLoading && !loadingState.error,
    hasError: !!loadingState.error,
  };
};

/**
 * Multiple Loading States Hook
 * Manages multiple concurrent loading states
 */
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

export const useMultipleLoadingState = (): UseMultipleLoadingStateReturn => {
  const [loadingStates, setLoadingStates] = useState<MultipleLoadingState>({});

  const getLoadingState = useCallback((key: string): LoadingState => {
    return loadingStates[key] || {
      isLoading: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
    };
  }, [loadingStates]);

  const startLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...getLoadingState(key),
        isLoading: true,
        error: null,
      },
    }));
  }, [getLoadingState]);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...getLoadingState(key),
        isLoading: false,
        isRetrying: false,
      },
    }));
  }, [getLoadingState]);

  const setError = useCallback((key: string, error: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...getLoadingState(key),
        isLoading: false,
        isRetrying: false,
        error,
      },
    }));
  }, [getLoadingState]);

  const clearError = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...getLoadingState(key),
        error: null,
        retryCount: 0,
      },
    }));
  }, [getLoadingState]);

  const executeWithLoading = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    startLoading(key);
    
    try {
      const result = await asyncFn();
      stopLoading(key);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(key, errorMessage);
      return null;
    }
  }, [startLoading, stopLoading, setError]);

  const isAnyLoading = Object.values(loadingStates).some(state => state.isLoading);
  const hasAnyError = Object.values(loadingStates).some(state => !!state.error);

  return {
    loadingStates,
    startLoading,
    stopLoading,
    setError,
    clearError,
    isAnyLoading,
    hasAnyError,
    getLoadingState,
    executeWithLoading,
  };
};

/**
 * Async State Hook
 * Simplified hook for async operations with loading states
 */
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

export const useAsyncState = <T>(
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T> => {
  const {
    initialData = null,
    onSuccess,
    onError,
    retryDelay = 1000,
    maxRetries = 3,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [lastAsyncFn, setLastAsyncFn] = useState<(() => Promise<T>) | null>(null);
  const { loadingState, executeWithLoading, retry: retryLoading } = useLoadingState(maxRetries);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setLastAsyncFn(() => asyncFn);
    
    const result = await executeWithLoading(asyncFn);
    
    if (result !== null) {
      setData(result);
      onSuccess?.(result);
    } else if (loadingState.error) {
      onError?.(loadingState.error);
    }
  }, [executeWithLoading, loadingState.error, onSuccess, onError]);

  const retry = useCallback(async () => {
    if (lastAsyncFn && loadingState.retryCount < maxRetries) {
      retryLoading();
      
      // Add delay before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      await execute(lastAsyncFn);
    }
  }, [lastAsyncFn, loadingState.retryCount, maxRetries, retryLoading, retryDelay, execute]);

  const reset = useCallback(() => {
    setData(initialData);
    setLastAsyncFn(null);
  }, [initialData]);

  return {
    data,
    loading: loadingState.isLoading,
    error: loadingState.error,
    execute,
    retry,
    reset,
    isIdle: !loadingState.isLoading && !loadingState.error && data === null,
    canRetry: !!lastAsyncFn && loadingState.retryCount < maxRetries && !!loadingState.error,
  };
};

