/**
 * Enhanced Error Boundary Component
 * Main error boundary class with state management and recovery
 */

import React, { Component, ErrorInfo } from 'react';
import { ErrorBoundaryProps, ErrorBoundaryState } from './types';
import { errorLogger } from './errorLogger';
import { ErrorFallbackUI } from './ErrorFallbackUI';

const MAX_RETRIES = 3;

export class ErrorBoundaryEnhanced extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = errorLogger.logError(
      error,
      errorInfo,
      this.props.componentName,
      this.state.retryCount
    );

    this.setState({
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount >= MAX_RETRIES) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      showDetails: false,
    }));

    // Auto-retry with exponential backoff for first few retries
    if (this.state.retryCount < 2) {
      const delay = Math.pow(2, this.state.retryCount) * 1000; // 1s, 2s, 4s
      this.retryTimeoutId = setTimeout(() => {
        // Force re-render to trigger retry
        this.forceUpdate();
      }, delay);
    }
  };

  handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default enhanced error UI
      return (
        <ErrorFallbackUI
          error={this.state.error!}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          componentName={this.props.componentName}
          showErrorDetails={this.props.showErrorDetails}
          allowRetry={this.props.allowRetry}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}
