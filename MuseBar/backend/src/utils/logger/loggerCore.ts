/**
 * Logger Core
 * Core logging functionality with level management and basic operations
 */

import { EnvironmentConfig } from '../../config/environment';
import { LogEntry, LogLevel } from './types';
import { formatLogEntry, writeToConsole } from './logFormatters';
import { FileTransport } from './logTransport';

/**
 * Core logger class with fundamental logging operations
 */
export class LoggerCore {
  protected config: EnvironmentConfig;
  protected logLevel: LogLevel;
  protected logsDir: string;
  protected fileTransport: FileTransport;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.logLevel = this.getLogLevelFromString(config.logging.level);
    this.logsDir = require('path').join(process.cwd(), 'logs');
    
    // Initialize file transport
    this.fileTransport = new FileTransport(this.logsDir, config.logging.enableFileLogging);
  }

  /**
   * Convert string to LogLevel enum
   */
  protected getLogLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Format log entry for output
   */
  protected formatLogEntry(entry: LogEntry): string {
    return formatLogEntry(entry, this.config);
  }

  /**
   * Write log entry to all configured transports
   */
  protected writeLog(entry: LogEntry): void {
    const numericLevel = LogLevel[entry.level];
    const currentLevel = this.logLevel;

    // Only log if the message level meets the minimum threshold
    if (numericLevel <= currentLevel) {
      // Always write to console in development
      if (this.config.app.environment === 'development' || entry.level === 'ERROR') {
        this.writeToConsole(entry.level, this.formatLogEntry(entry));
      }

      // Write to file if enabled
      if (this.config.logging.enableFileLogging) {
        this.writeToFile(entry);
      }
    }
  }

  /**
   * Write to console with appropriate styling
   */
  protected writeToConsole(level: keyof typeof LogLevel, message: string): void {
    writeToConsole(level, message);
  }

  /**
   * Write to file transport
   */
  protected writeToFile(entry: LogEntry): void {
    this.fileTransport.write(entry);
  }

  /**
   * Create standardized log entry
   */
  protected createLogEntry(
    level: keyof typeof LogLevel,
    message: string,
    metadata?: Record<string, any>,
    category?: string,
    requestId?: string,
    userId?: number
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: metadata || {},
      category: category || 'GENERAL',
      requestId,
      userId: userId?.toString(),
      service: 'MuseBar',
      version: process.env.npm_package_version || '1.0.0',
      environment: this.config.app.environment,
      nodeId: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Basic logging methods
   */
  public error(
    message: string,
    error?: Error | Record<string, any>,
    category = 'ERROR',
    requestId?: string,
    userId?: number
  ): void {
    const metadata = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    const entry = this.createLogEntry('ERROR', message, metadata, category, requestId, userId);
    this.writeLog(entry);
  }

  public warn(
    message: string,
    metadata?: Record<string, any>,
    category = 'WARNING',
    requestId?: string,
    userId?: number
  ): void {
    const entry = this.createLogEntry('WARN', message, metadata, category, requestId, userId);
    this.writeLog(entry);
  }

  public info(
    message: string,
    metadata?: Record<string, any>,
    category = 'INFO',
    requestId?: string,
    userId?: number
  ): void {
    const entry = this.createLogEntry('INFO', message, metadata, category, requestId, userId);
    this.writeLog(entry);
  }

  public debug(
    message: string,
    metadata?: Record<string, any>,
    category = 'DEBUG',
    requestId?: string,
    userId?: number
  ): void {
    const entry = this.createLogEntry('DEBUG', message, metadata, category, requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Get current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Set log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Check if level should be logged
   */
  public shouldLog(level: keyof typeof LogLevel): boolean {
    const numericLevel = LogLevel[level];
    return numericLevel <= this.logLevel;
  }
}
