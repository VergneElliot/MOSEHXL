/**
 * Professional Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */

import React, { Component, ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

/**
 * Error information interface
 */
interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  enableReporting?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number | boolean | null | undefined>;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

/**
 * Error severity levels
 */
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Professional Error Boundary Class
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  /**
   * Static method called when an error occurs
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  /**
   * Component did catch error
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableReporting = true } = this.props;
    const { errorId } = this.state;

    // Update state with error info
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error [${errorId}]`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Call custom error handler
    if (onError && errorId) {
      onError(error, errorInfo, errorId);
    }

    // Report error to monitoring service
    if (enableReporting) {
      this.reportError(error, errorInfo, errorId || 'unknown');
    }
  }

  /**
   * Component did update - check if we should reset on props change
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  /**
   * Report error to monitoring service
   */
  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      // In a real application, you would send this to your error reporting service
      // Examples: Sentry, LogRocket, Bugsnag, etc.
      
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        severity: this.getErrorSeverity(error),
        context: this.getErrorContext(),
      };

      // Send to error reporting service
      this.sendToErrorService(errorReport);

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  /**
   * Get user ID for error tracking
   */
  private getUserId = (): string | null => {
    try {
      // Get user ID from localStorage, context, or other source
      return localStorage.getItem('user_id') || null;
    } catch {
      return null;
    }
  };

  /**
   * Get session ID for error tracking
   */
  private getSessionId = (): string => {
    try {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    } catch {
      return 'unknown_session';
    }
  };

  /**
   * Determine error severity
   */
  private getErrorSeverity = (error: Error): ErrorSeverity => {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors (app-breaking)
    if (
      message.includes('out of memory') ||
      message.includes('maximum call stack') ||
      stack.includes('maximum call stack')
    ) {
      return 'critical';
    }

    // High severity (major features broken)
    if (
      message.includes('network error') ||
      message.includes('failed to fetch') ||
      message.includes('payment') ||
      message.includes('order')
    ) {
      return 'high';
    }

    // Medium severity (minor features affected)
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('validation')
    ) {
      return 'medium';
    }

    // Low severity (cosmetic issues)
    return 'low';
  };

  /**
   * Get additional error context
   */
  private getErrorContext = () => {
    return {
      level: this.props.level || 'component',
      isolate: this.props.isolate || false,
      retryCount: this.state.retryCount,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      performance: {
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      },
    };
  };

  /**
   * Send error to monitoring service
   */
  private sendToErrorService = (errorReport: any) => {
    // Example: Send to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(errorReport);
      // or
      // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) });
    }

    // For development, just log it
    console.log('Error Report:', errorReport);
  };

  /**
   * Reset error boundary
   */
  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  /**
   * Retry with delay
   */
  private retryWithDelay = (delay: number = 1000) => {
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  /**
   * Reload the page
   */
  private reloadPage = () => {
    window.location.reload();
  };

  /**
   * Get retry button text
   */
  private getRetryButtonText = (): string => {
    const { retryCount } = this.state;
    const { maxRetries = 3 } = this.props;

    if (retryCount >= maxRetries) {
      return 'Recharger la page';
    }

    return retryCount === 0 ? 'Réessayer' : `Réessayer (${retryCount + 1})`;
  };

  /**
   * Handle retry action
   */
  private handleRetry = () => {
    const { retryCount } = this.state;
    const { maxRetries = 3 } = this.props;

    if (retryCount >= maxRetries) {
      this.reloadPage();
    } else {
      this.retryWithDelay();
    }
  };

  /**
   * Render error severity chip
   */
  private renderSeverityChip = (severity: ErrorSeverity) => {
    const severityConfig = {
      low: { color: 'info' as const, label: 'Faible' },
      medium: { color: 'warning' as const, label: 'Moyenne' },
      high: { color: 'error' as const, label: 'Élevée' },
      critical: { color: 'error' as const, label: 'Critique' },
    };

    const config = severityConfig[severity];
    return <Chip size="small" color={config.color} label={`Sévérité: ${config.label}`} />;
  };

  /**
   * Render default fallback UI
   */
  private renderDefaultFallback = () => {
    const { error, errorInfo, errorId, retryCount } = this.state;
    const { level = 'component', maxRetries = 3 } = this.props;

    if (!error) return null;

    const severity = this.getErrorSeverity(error);
    const canRetry = retryCount < maxRetries;

    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          m: 2,
          textAlign: 'center',
          border: '1px solid',
          borderColor: severity === 'critical' ? 'error.main' : 'warning.main',
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <ErrorIcon
            sx={{
              fontSize: 48,
              color: severity === 'critical' ? 'error.main' : 'warning.main',
            }}
          />

          <Typography variant="h5" color="error" gutterBottom>
            Une erreur s'est produite
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {severity === 'critical'
              ? 'Une erreur critique empêche le bon fonctionnement de l\'application.'
              : 'Une erreur inattendue s\'est produite dans cette section.'}
          </Typography>

          <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
            {this.renderSeverityChip(severity)}
            <Chip size="small" label={`Niveau: ${level}`} />
            {errorId && (
              <Chip size="small" variant="outlined" label={`ID: ${errorId.slice(-8)}`} />
            )}
          </Box>

          <Alert severity={severity === 'critical' ? 'error' : 'warning'} sx={{ width: '100%' }}>
            <AlertTitle>Détails de l'erreur</AlertTitle>
            {error.message}
          </Alert>

          <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              startIcon={canRetry ? <RefreshIcon /> : <RefreshIcon />}
              onClick={this.handleRetry}
            >
              {this.getRetryButtonText()}
            </Button>

            {process.env.NODE_ENV === 'development' && errorInfo && (
              <Accordion sx={{ width: '100%', mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BugReportIcon />
                    <Typography>Détails techniques (développement)</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ 
                    overflow: 'auto', 
                    fontSize: '0.75rem',
                    backgroundColor: 'grey.100',
                    p: 2,
                    borderRadius: 1,
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Stack Trace:
                    </Typography>
                    {error.stack}
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Component Stack:
                    </Typography>
                    {errorInfo.componentStack}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        </Box>
      </Paper>
    );
  };

  /**
   * Render component
   */
  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo, this.resetErrorBoundary);
      }

      // Use default fallback
      return this.renderDefaultFallback();
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Hook for manually triggering error boundary
 */
export const useErrorHandler = () => {
  return React.useCallback((error: Error, errorInfo?: Partial<ErrorInfo>) => {
    // This will trigger the nearest error boundary
    throw error;
  }, []);
};

/**
 * Async error boundary for handling promise rejections
 */
export const AsyncErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Convert promise rejection to error that can be caught by error boundary
      const error = new Error(
        event.reason instanceof Error ? event.reason.message : String(event.reason)
      );
      error.stack = event.reason instanceof Error ? event.reason.stack : undefined;
      
      // This doesn't automatically trigger error boundary, but logs the error
      // You might want to implement a different strategy for handling async errors
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <ErrorBoundary {...props} />;
};
