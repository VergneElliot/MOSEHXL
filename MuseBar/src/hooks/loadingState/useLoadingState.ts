/**
 * Single Loading State Hook
 * Basic loading state management with error handling and retry logic
 */

import { useState, useCallback } from 'react';
import { LoadingState, UseLoadingStateReturn } from './types';

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
