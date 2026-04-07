/// <reference path="../types/express/index.d.ts" />

/**
 * Professional Logging System
 * REFACTORED: Main logging system that delegates to specialized modules
 * The original 429-line logger has been modularized into:
 * - loggerCore.ts (Core functionality)
 * - categoryLoggers.ts (Specialized logging methods)
 * - performanceMonitor.ts (Performance monitoring)
 * - requestLogger.ts (Express middleware)
 * - logger.ts (Main coordinator)
 */

import { EnvironmentConfig } from '../config/environment';
import { CategoryLoggers } from './logger/categoryLoggers';
import { PerformanceMonitor } from './logger/performanceMonitor';
import { RequestLogger } from './logger/requestLogger';

// Re-export types for backward compatibility
export { LogEntry, LogLevel, PerformanceMetric } from './logger/types';

/**
 * Main Logger class - combines all logging modules
 */
export class Logger extends CategoryLoggers {
  private static instance: Logger | undefined;

  private constructor(config: EnvironmentConfig) {
    super(config);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: EnvironmentConfig): Logger {
    if (!Logger.instance) {
      if (!config) {
        throw new Error('Config required for first Logger initialization');
      }
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    Logger.instance = undefined;
  }
}

/**
 * Express middleware for request logging
 * Maintained for backward compatibility
 */
export const requestLoggerMiddleware = (logger: Logger) => {
  return RequestLogger.createMiddleware(logger);
};

// Export performance monitor for direct access
export { PerformanceMonitor };

// Export request logger utilities
export { RequestLogger };

// Export default logger instance (will be initialized in app.ts)
export let logger: Logger;

/**
 * Initialize logger with configuration
 */
export const initializeLogger = (config: EnvironmentConfig): Logger => {
  logger = Logger.getInstance(config);
  PerformanceMonitor.initialize(logger);
  return logger;
};

/**
 * Get current logger instance
 */
export const getLogger = (): Logger => {
  if (!logger) {
    throw new Error('Logger not initialized. Call initializeLogger first.');
  }
  return logger;
};

/**
 * Quick logging functions for convenience
 */
export const logError = (message: string, error?: Error | Record<string, unknown>, requestId?: string) => {
  if (logger) {
    logger.error(message, error, 'ERROR', requestId);
  }
};

export const logInfo = (message: string, metadata?: Record<string, unknown>, requestId?: string) => {
  if (logger) {
    logger.info(message, metadata, 'INFO', requestId);
  }
};

export const logDebug = (message: string, metadata?: Record<string, unknown>, requestId?: string) => {
  if (logger) {
    logger.debug(message, metadata, 'DEBUG', requestId);
  }
};

export const logPerformance = (operation: string, duration: number, metadata?: Record<string, unknown>) => {
  if (logger) {
    logger.performance(`Operation: ${operation}`, duration, metadata);
  }
};

// Default export for backward compatibility
export default Logger;