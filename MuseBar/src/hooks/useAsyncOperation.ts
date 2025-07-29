import { useState, useCallback } from 'react';
import { useErrorHandler, ErrorInfo } from './useErrorHandler';

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
  const [errorState, errorActions] = useErrorHandler(context);
  const [state, setState] = useState<Omit<AsyncState<T>, 'error'>>({
    data: null,
    loading: false,
    success: false,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setState(prev => ({ ...prev, loading: true, success: false }));
      errorActions.clearError();

      try {
        const result = await asyncFn(...args);
        setState({
          data: result,
          loading: false,
          success: true,
        });
        return result;
      } catch (error) {
        setState(prev => ({ ...prev, loading: false, success: false }));
        errorActions.setError(error as Error);
        throw error;
      }
    },
    [asyncFn, errorActions]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      success: false,
    });
    errorActions.clearError();
  }, [errorActions]);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, success: true }));
  }, []);

  return [
    {
      ...state,
      error: errorState.error,
    },
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
