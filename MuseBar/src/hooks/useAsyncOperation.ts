import { useState, useCallback } from 'react';
import { useErrorHandler } from '../components/common/ErrorBoundary/useErrorHandler';
import { ErrorInfo } from '../components/common/ErrorBoundary/types';

export interface AsyncState<T = any> {
  data: T | null;
  loading: boolean;
  error: ErrorInfo | null;
  success: boolean;
}

export interface AsyncActions<T = any> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  setData: (data: T) => void;
}

export const useAsyncOperation = <T = any>(
  asyncFn: (...args: any[]) => Promise<T>,
  context?: string
): [AsyncState<T>, AsyncActions<T>] => {
  const errorHandler = useErrorHandler();
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setState(prev => ({ ...prev, loading: true, success: false, error: null }));

      try {
        const result = await asyncFn(...args);
        setState({
          data: result,
          loading: false,
          error: null,
          success: true,
        });
        return result;
      } catch (error) {
        const errorInfo: ErrorInfo = {
          componentStack: error instanceof Error ? error.stack || '' : '',
          errorBoundary: undefined,
          errorBoundaryStack: undefined,
        };
        setState(prev => ({ ...prev, loading: false, success: false, error: errorInfo }));
        throw error;
      }
    },
    [asyncFn, context]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, success: true }));
  }, []);

  return [
    state,
    {
      execute,
      reset,
      setData,
    },
  ];
};

// Specialized hooks for common patterns
export const useApiCall = <T = any>(apiCall: (...args: any[]) => Promise<T>, apiName: string) => {
  return useAsyncOperation(apiCall, `API: ${apiName}`);
};

export const useFormSubmission = <T = any>(
  submitFn: (...args: any[]) => Promise<T>,
  formName: string
) => {
  return useAsyncOperation(submitFn, `Form: ${formName}`);
};

export const useDataFetching = <T = any>(fetchFn: () => Promise<T>, resourceName: string) => {
  return useAsyncOperation(fetchFn, `Fetch: ${resourceName}`);
};
