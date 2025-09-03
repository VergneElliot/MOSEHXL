/**
 * Error Boundary Types
 * Type definitions for error boundary components
 */

import { ReactNode, ErrorInfo as ReactErrorInfo } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void;
  showErrorDetails?: boolean;
  allowRetry?: boolean;
  componentName?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ReactErrorInfo | null;
  errorId: string;
  retryCount: number;
  showDetails: boolean;
}

export interface ErrorLogEntry {
  id: string;
  error: Error;
  errorInfo: ReactErrorInfo;
  timestamp: Date;
  userAgent: string;
  url: string;
  componentName?: string;
  retryCount: number;
}
