/**
 * Error Logging Utilities
 * Handles error logging, reporting, and analytics
 */

import { ErrorInfo } from 'react';
import { ErrorLogEntry } from './types';

class ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxErrors = 100;

  /**
   * Log an error with context information
   */
  logError(
    error: Error,
    errorInfo: ErrorInfo,
    componentName?: string,
    retryCount: number = 0
  ): string {
    const errorId = this.generateErrorId();
    
    const logEntry: ErrorLogEntry = {
      id: errorId,
      error,
      errorInfo,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentName,
      retryCount,
    };

    this.errors.push(logEntry);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Send to analytics/monitoring service
    this.sendToAnalytics(logEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🐛 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error ID:', errorId);
      console.groupEnd();
    }

    return errorId;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send error to analytics service
   */
  private async sendToAnalytics(logEntry: ErrorLogEntry): Promise<void> {
    try {
      // In a real app, you'd send to your analytics service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry),
      // });
      
      // For now, just store locally
      localStorage.setItem(`error_${logEntry.id}`, JSON.stringify(logEntry));
    } catch (e) {
      console.warn('Failed to send error to analytics:', e);
    }
  }

  /**
   * Get all logged errors
   */
  getErrors(): ErrorLogEntry[] {
    return [...this.errors];
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error by ID
   */
  getErrorById(id: string): ErrorLogEntry | undefined {
    return this.errors.find(error => error.id === id);
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      totalErrors: this.errors.length,
      uniqueComponents: new Set(this.errors.map(e => e.componentName).filter(Boolean)).size,
      mostCommonError: this.getMostCommonError(),
      errorsByComponent: this.getErrorsByComponent(),
    };
  }

  /**
   * Get most common error
   */
  private getMostCommonError(): string | null {
    const errorCounts: Record<string, number> = {};
    
    this.errors.forEach(entry => {
      const key = entry.error.message;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    const entries = Object.entries(errorCounts);
    if (entries.length === 0) return null;

    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /**
   * Get errors grouped by component
   */
  private getErrorsByComponent(): Record<string, number> {
    const componentCounts: Record<string, number> = {};
    
    this.errors.forEach(entry => {
      const component = entry.componentName || 'Unknown';
      componentCounts[component] = (componentCounts[component] || 0) + 1;
    });

    return componentCounts;
  }
}

export const errorLogger = new ErrorLogger();
