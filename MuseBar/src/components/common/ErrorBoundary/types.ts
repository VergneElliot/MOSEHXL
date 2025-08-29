/**
 * Error Boundary Types and Interfaces
 * Centralized type definitions for the error handling system
 */

import { ReactNode } from 'react';

/**
 * Error information interface
 */
export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps {
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
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error display props
 */
export interface ErrorDisplayProps {
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string;
  retryCount: number;
  maxRetries: number;
  level: string;
  onRetry: () => void;
}

/**
 * Error reporting data structure
 */
export interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack: string;
  userAgent: string;
  url: string;
  timestamp: string;
  userId?: string;
  level: string;
  severity: ErrorSeverity;
  retryCount: number;
  context?: Record<string, any>;
}

/**
 * Hook return type for error handling
 */
export interface UseErrorHandlerReturn {
  reportError: (error: Error, errorInfo: ErrorInfo, errorId: string) => Promise<void>;
  determineErrorSeverity: (error: Error) => ErrorSeverity;
  shouldEnableReporting: () => boolean;
  formatErrorForDisplay: (error: Error) => string;
}

