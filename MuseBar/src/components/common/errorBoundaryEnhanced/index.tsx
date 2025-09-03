/**
 * Error Boundary Index
 * Aggregates and re-exports all error boundary components
 */

// Re-export all error boundary components and utilities
export * from './types';
export * from './errorLogger';
export * from './ErrorFallbackUI';
export * from './ErrorBoundaryEnhanced';

// Export main component as default
export { ErrorBoundaryEnhanced as default } from './ErrorBoundaryEnhanced';
