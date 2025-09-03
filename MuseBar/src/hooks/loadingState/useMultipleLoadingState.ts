/**
 * Multiple Loading States Hook
 * Manages multiple concurrent loading states for complex UIs
 */

import { useState, useCallback } from 'react';
import { MultipleLoadingState, UseMultipleLoadingStateReturn, LoadingState } from './types';

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
