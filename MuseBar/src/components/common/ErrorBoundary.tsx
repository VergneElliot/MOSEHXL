/**
 * Professional Error Boundary Component
 * REFACTORED: This component has been modularized into smaller, focused modules.
 * The original 537-line monolithic component has been broken down into:
 * - ErrorBoundaryCore.tsx (Core error boundary logic)
 * - ErrorDisplay.tsx (Error UI component)
 * - useErrorHandler.ts (Error handling hook)
 * - types.ts (Type definitions)
 * - index.ts (Clean exports and legacy compatibility)
 */

// Re-export the modular error boundary system for backward compatibility
export {
  ErrorBoundaryCore as ErrorBoundary,
  ErrorDisplay,
  useErrorHandler,
  withErrorBoundary,
  // Types
  type ErrorInfo,
  type ErrorBoundaryProps,
  type ErrorSeverity,
} from './ErrorBoundary/index';

// Default export for backward compatibility
export { default } from './ErrorBoundary/index';