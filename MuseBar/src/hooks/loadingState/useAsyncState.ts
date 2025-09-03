/**
 * Async State Hook
 * Simplified hook for async operations with automatic loading states
 */

import { useState, useCallback } from 'react';
import { UseAsyncStateOptions, UseAsyncStateReturn } from './types';
import { useLoadingState } from './useLoadingState';

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
