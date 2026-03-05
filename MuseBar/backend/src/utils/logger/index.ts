/**
 * Logger Module - Clean Exports (building blocks only)
 * Provides a modular logging system with specialized components.
 *
 * Application-facing API (Logger, requestLoggerMiddleware, getLogger, etc.) lives in
 * the parent module utils/logger.ts. Do not re-export from '../logger' here to avoid
 * a circular dependency: index → parent → children (audit #41).
 */

// Core classes
export { LoggerCore } from './loggerCore';
export { CategoryLoggers } from './categoryLoggers';
export { PerformanceMonitor } from './performanceMonitor';
export { RequestLogger } from './requestLogger';

// Types
export type {
  LogEntry,
  LogLevel,
  PerformanceMetric
} from './types';

// Formatters and transports
export { formatLogEntry, writeToConsole } from './logFormatters';
export { FileTransport } from './logTransport';
