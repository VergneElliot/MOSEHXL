/**
 * Logger Module - Clean Exports
 * Provides a modular logging system with specialized components
 * Maintains backward compatibility while providing access to focused modules
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

// Default export for main logger access
export { Logger } from '../logger';
