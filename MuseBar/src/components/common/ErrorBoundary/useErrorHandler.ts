/**
 * Error Handler Hook
 * Custom hook for error handling logic and error reporting
 */

import { useCallback } from 'react';
import { ErrorInfo, ErrorSeverity, ErrorReport, UseErrorHandlerReturn } from './types';

/**
 * Custom hook for error handling
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  /**
   * Report error to monitoring service
   */
  const reportError = useCallback(async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      // Don't report in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_REPORT_DEV_ERRORS) {
        return;
      }

      const severity = determineErrorSeverity(error);
      
      const errorReport: ErrorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('userId') || undefined,
        level: 'error',
        severity,
        retryCount: 0,
        context: {
          pathname: window.location.pathname,
          search: window.location.search,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        },
      };

      // Send to backend error reporting endpoint
      const response = await fetch('/api/client-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        throw new Error(`Error reporting failed: ${response.status}`);
      }

      // Optional: Send to external monitoring service (e.g., Sentry)
      if (window.Sentry && typeof window.Sentry.captureException === 'function') {
        window.Sentry.captureException(error, {
          tags: {
            errorBoundary: true,
            severity,
            errorId,
          },
          extra: {
            componentStack: errorInfo.componentStack,
            errorInfo,
          },
        });
      }

      console.log(`✅ Error reported successfully [${errorId}]`);
    } catch (reportingError) {
      console.error('❌ Failed to report error:', reportingError);
      console.error('Original error that failed to report:', error);
    }
  }, []);

  /**
   * Determine error severity based on error characteristics
   */
  const determineErrorSeverity = useCallback((error: Error): ErrorSeverity => {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors that break core functionality
    if (
      message.includes('network error') ||
      message.includes('failed to fetch') ||
      message.includes('payment') ||
      message.includes('transaction') ||
      message.includes('database') ||
      stack.includes('payment') ||
      stack.includes('checkout')
    ) {
      return 'critical';
    }

    // High severity errors that impact user experience
    if (
      message.includes('permission denied') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('authentication') ||
      error.name === 'TypeError' ||
      error.name === 'ReferenceError'
    ) {
      return 'high';
    }

    // Medium severity errors that may impact some features
    if (
      message.includes('not found') ||
      message.includes('invalid') ||
      message.includes('validation') ||
      error.name === 'ValidationError'
    ) {
      return 'medium';
    }

    // Low severity errors (UI glitches, minor issues)
    return 'low';
  }, []);

  /**
   * Check if error reporting should be enabled
   */
  const shouldEnableReporting = useCallback((): boolean => {
    // Always enable in production
    if (process.env.NODE_ENV === 'production') {
      return true;
    }

    // In development, only enable if explicitly configured
    return Boolean(process.env.REACT_APP_REPORT_DEV_ERRORS);
  }, []);

  /**
   * Format error message for display
   */
  const formatErrorForDisplay = useCallback((error: Error): string => {
    const message = error.message;

    // User-friendly messages for common errors
    if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) {
      return "Une mise à jour de l'application est disponible. Veuillez recharger la page.";
    }

    if (message.includes('Network Error') || message.includes('failed to fetch')) {
      return "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
    }

    if (message.includes('Permission denied') || message.includes('Unauthorized')) {
      return "Vous n'avez pas les permissions nécessaires pour cette action.";
    }

    if (message.includes('Not found')) {
      return "La ressource demandée n'a pas été trouvée.";
    }

    // Return original message for unknown errors
    return message || "Une erreur inattendue s'est produite.";
  }, []);

  return {
    reportError,
    determineErrorSeverity,
    shouldEnableReporting,
    formatErrorForDisplay,
  };
};

// Type augmentation for external monitoring services
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, options?: any) => void;
    };
  }
}

