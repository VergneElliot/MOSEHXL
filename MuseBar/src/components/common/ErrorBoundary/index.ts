/**
 * Error Boundary Module - Clean Exports
 * Provides a modular error handling system with focused components
 */

import React from 'react';
import { ErrorBoundaryProps } from './types';
import { ErrorBoundaryCore } from './ErrorBoundaryCore';

// Core components
export { ErrorBoundaryCore };
export { ErrorDisplay } from './ErrorDisplay';

// Hooks and utilities
export { useErrorHandler } from './useErrorHandler';

// Types
export type {
  ErrorInfo,
  ErrorBoundaryState,
  ErrorBoundaryProps,
  ErrorSeverity,
  ErrorDisplayProps,
  ErrorReport,
  UseErrorHandlerReturn,
} from './types';

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => 
    React.createElement(
      ErrorBoundaryCore, 
      { ...errorBoundaryProps, children: React.createElement(Component, props) }
    );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Default export for backward compatibility
export { ErrorBoundaryCore as default } from './ErrorBoundaryCore';
export { ErrorBoundaryCore as ErrorBoundary } from './ErrorBoundaryCore';

