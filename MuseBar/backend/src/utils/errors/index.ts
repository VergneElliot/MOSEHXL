/**
 * Error Utilities - Clean Exports
 * Provides standardized error handling patterns across all services
 */

// Main error handler
export {
  ErrorHandler,
  StandardError,
  ErrorTypes
} from './standardErrorHandler';

// Types
export type {
  StandardErrorResponse,
  StandardSuccessResponse
} from './standardErrorHandler';

// Default export for convenience
export { ErrorHandler as default } from './standardErrorHandler';
