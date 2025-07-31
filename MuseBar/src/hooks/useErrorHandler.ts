import { useState, useCallback } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: any;
  timestamp: Date;
  context?: string;
}

export interface ErrorHandlerState {
  error: ErrorInfo | null;
  hasError: boolean;
  isRetrying: boolean;
}

export interface ErrorHandlerActions {
  setError: (error: string | Error | ErrorInfo, context?: string) => void;
  clearError: () => void;
  retry: (retryFn: () => Promise<void> | void) => Promise<void>;
}

export const useErrorHandler = (
  defaultContext?: string
): [ErrorHandlerState, ErrorHandlerActions] => {
  const [state, setState] = useState<ErrorHandlerState>({
    error: null,
    hasError: false,
    isRetrying: false,
  });

  const setError = useCallback(
    (error: string | Error | ErrorInfo, context = defaultContext) => {
      let errorInfo: ErrorInfo;

      if (typeof error === 'string') {
        errorInfo = {
          message: error,
          timestamp: new Date(),
          context,
        };
      } else if (error instanceof Error) {
        errorInfo = {
          message: error.message,
          details: error.stack,
          timestamp: new Date(),
          context,
        };
      } else {
        errorInfo = {
          ...error,
          timestamp: error.timestamp || new Date(),
          context: error.context || context,
        };
      }

      setState({
        error: errorInfo,
        hasError: true,
        isRetrying: false,
      });

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        // Error caught by useErrorHandler
      }
    },
    [defaultContext]
  );

  const clearError = useCallback(() => {
    setState({
      error: null,
      hasError: false,
      isRetrying: false,
    });
  }, []);

  const retry = useCallback(
    async (retryFn: () => Promise<void> | void) => {
      setState(prev => ({ ...prev, isRetrying: true }));

      try {
        await retryFn();
        clearError();
      } catch (error) {
        setError(error as Error, 'Retry failed');
      } finally {
        setState(prev => ({ ...prev, isRetrying: false }));
      }
    },
    [setError, clearError]
  );

  return [state, { setError, clearError, retry }];
};

// Utility functions for common error scenarios
export const createApiErrorHandler = (apiName: string) => {
  return (error: any): ErrorInfo => {
    if (error.response) {
      // API error with response
      return {
        message: error.response.data?.message || `Erreur ${apiName}`,
        code: error.response.status,
        details: error.response.data,
        timestamp: new Date(),
        context: apiName,
      };
    } else if (error.request) {
      // Network error
      return {
        message: `Erreur réseau lors de la connexion à ${apiName}`,
        code: 'NETWORK_ERROR',
        details: error.request,
        timestamp: new Date(),
        context: apiName,
      };
    } else {
      // Other error
      return {
        message: error.message || `Erreur inconnue dans ${apiName}`,
        details: error,
        timestamp: new Date(),
        context: apiName,
      };
    }
  };
};

export const createFormErrorHandler = (formName: string) => {
  return (error: any): ErrorInfo => {
    return {
      message: `Erreur de validation dans ${formName}: ${error.message}`,
      details: error.errors || error,
      timestamp: new Date(),
      context: formName,
    };
  };
};
