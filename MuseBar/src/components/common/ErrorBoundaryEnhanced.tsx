/**
 * Enhanced Error Boundary Component
 * Comprehensive error handling for React components with recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  allowRetry?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  showDetails: boolean;
}

export class ErrorBoundaryEnhanced extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = Math.random().toString(36).substring(2, 15);
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName } = this.props;
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Send error to logging service
    this.logError(error, errorInfo, componentName);

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private logError = async (error: Error, errorInfo: ErrorInfo, componentName?: string) => {
    try {
      const errorData = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        componentName: componentName || 'Unknown',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('userId'), // If available
        establishmentId: localStorage.getItem('establishmentId') // If available
      };

      // Send to backend logging endpoint
      await fetch('/api/client-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      }).catch(() => {
        // Fail silently if logging fails
        console.warn('Failed to log error to backend');
      });
    } catch (logError) {
      console.warn('Error logging failed:', logError);
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        showDetails: false
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  private getErrorSeverity = (error: Error): 'error' | 'warning' => {
    // Determine error severity based on error type
    if (error.name === 'ChunkLoadError' || 
        error.message.includes('Loading chunk') ||
        error.message.includes('Loading CSS chunk')) {
      return 'warning'; // Network/loading issues are less severe
    }
    
    return 'error'; // Default to error for unknown issues
  };

  private getErrorMessage = (error: Error): { title: string; description: string } => {
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return {
        title: 'Loading Error',
        description: 'There was a problem loading part of the application. This usually happens after an update.'
      };
    }

    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return {
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.'
      };
    }

    if (error.message.includes('Permission') || error.message.includes('Unauthorized')) {
      return {
        title: 'Access Error',
        description: 'You do not have permission to access this feature. Please contact your administrator.'
      };
    }

    return {
      title: 'Application Error',
      description: 'An unexpected error occurred. The development team has been notified.'
    };
  };

  render() {
    const { hasError, error, errorInfo, errorId, retryCount, showDetails } = this.state;
    const { children, fallback, showErrorDetails = true, allowRetry = true, componentName } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const severity = this.getErrorSeverity(error);
      const { title, description } = this.getErrorMessage(error);
      const canRetry = allowRetry && retryCount < this.maxRetries;

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          p={3}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Alert severity={severity}>
                <AlertTitle>
                  <Box display="flex" alignItems="center">
                    <BugReportIcon sx={{ mr: 1 }} />
                    {title}
                  </Box>
                </AlertTitle>
                
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {description}
                </Typography>

                {componentName && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Component: {componentName}
                  </Typography>
                )}

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Error ID: {errorId}
                </Typography>

                {retryCount > 0 && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Retry attempts: {retryCount}/{this.maxRetries}
                  </Typography>
                )}

                <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  {canRetry && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<RefreshIcon />}
                      onClick={this.handleRetry}
                      size="small"
                    >
                      Try Again
                    </Button>
                  )}
                  
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={this.handleReload}
                    size="small"
                  >
                    Reload Page
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<HomeIcon />}
                    onClick={this.handleGoHome}
                    size="small"
                  >
                    Go Home
                  </Button>
                </Box>

                {showErrorDetails && process.env.NODE_ENV === 'development' && (
                  <>
                    <Button
                      onClick={this.toggleDetails}
                      endIcon={<ExpandMoreIcon />}
                      size="small"
                      sx={{ mb: 1 }}
                    >
                      {showDetails ? 'Hide' : 'Show'} Technical Details
                    </Button>
                    
                    <Collapse in={showDetails}>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.75rem',
                          maxHeight: '300px'
                        }}
                      >
                        <Typography variant="subtitle2">Error:</Typography>
                        {error.message}
                        {'\n\n'}
                        <Typography variant="subtitle2">Stack Trace:</Typography>
                        {error.stack}
                        {errorInfo && (
                          <>
                            {'\n\n'}
                            <Typography variant="subtitle2">Component Stack:</Typography>
                            {errorInfo.componentStack}
                          </>
                        )}
                      </Box>
                    </Collapse>
                  </>
                )}
              </Alert>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundaryEnhanced {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundaryEnhanced>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

export default ErrorBoundaryEnhanced;