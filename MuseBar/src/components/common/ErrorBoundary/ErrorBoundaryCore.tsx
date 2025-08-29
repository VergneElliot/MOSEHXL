/**
 * Core Error Boundary Component
 * Lightweight error boundary focused on error catching and state management
 */

import React, { Component } from 'react';
import { ErrorBoundaryProps, ErrorBoundaryState, ErrorInfo } from './types';
import { ErrorDisplay } from './ErrorDisplay';

/**
 * Core Error Boundary Class - Focused and under 100 lines
 */
export class ErrorBoundaryCore extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private reportError: ((error: Error, errorInfo: ErrorInfo, errorId: string) => Promise<void>) | null = null;

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
  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableReporting = true } = this.props;
    const { errorId } = this.state;

    // Update state with error info
    this.setState({ errorInfo });

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary [${errorId}]`);
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Call custom error handler
    if (onError && errorId) {
      onError(error, errorInfo, errorId);
    }

    // Report error if enabled
    if (enableReporting && this.reportError && errorId) {
      await this.reportError(error, errorInfo, errorId);
    }
  }

  /**
   * Component did update - handle props changes
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
   * Reset error boundary state
   */
  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });
  };

  /**
   * Handle retry with count increment
   */
  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      // Max retries reached, reload page
      window.location.reload();
    }
  };

  /**
   * Render component
   */
  render() {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;
    const { children, fallback, maxRetries = 3, level = 'component' } = this.props;

    if (hasError && error && errorInfo && errorId) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo, this.resetErrorBoundary);
      }

      // Use default error display
      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          maxRetries={maxRetries}
          level={level}
          onRetry={this.handleRetry}
        />
      );
    }

    return children;
  }
}

export default ErrorBoundaryCore;

