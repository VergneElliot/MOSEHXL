/**
 * Professional Logging System
 * Provides structured logging with multiple transports and performance monitoring
 */

import fs from 'fs';
import path from 'path';
import { EnvironmentConfig } from '../config/environment';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: keyof typeof LogLevel;
  message: string;
  metadata?: Record<string, any>;
  context?: string;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Performance monitoring data
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Professional Logger Class
 */
export class Logger {
  private static instance: Logger;
  private config: EnvironmentConfig;
  private logLevel: LogLevel;
  private logsDir: string;

  private constructor(config: EnvironmentConfig) {
    this.config = config;
    this.logLevel = this.getLogLevelFromString(config.logging.level);
    this.logsDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (config.logging.enableFileLogging && !fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: EnvironmentConfig): Logger {
    if (!Logger.instance && config) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Convert string log level to enum
   */
  private getLogLevelFromString(level: string): LogLevel {
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
  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, metadata, context, requestId, userId, duration, error } = entry;
    
    let formattedMessage = `[${timestamp}] ${level.toUpperCase()}`;
    
    if (context) formattedMessage += ` [${context}]`;
    if (requestId) formattedMessage += ` [${requestId}]`;
    if (userId) formattedMessage += ` [User:${userId}]`;
    
    formattedMessage += `: ${message}`;
    
    if (duration !== undefined) formattedMessage += ` (${duration}ms)`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      formattedMessage += ` | Metadata: ${JSON.stringify(metadata)}`;
    }
    
    if (error) {
      formattedMessage += `\n  Error: ${error.name}: ${error.message}`;
      if (error.stack && this.config.app.environment === 'development') {
        formattedMessage += `\n  Stack: ${error.stack}`;
      }
    }
    
    return formattedMessage;
  }

  /**
   * Write log entry to console and file
   */
  private writeLog(entry: LogEntry): void {
    const numericLevel = LogLevel[entry.level];
    
    // Check if we should log this level
    if (numericLevel > this.logLevel) return;
    
    const formattedMessage = this.formatLogEntry(entry);
    
    // Console output with colors
    this.writeToConsole(entry.level, formattedMessage);
    
    // File output
    if (this.config.logging.enableFileLogging) {
      this.writeToFile(entry);
    }
  }

  /**
   * Write to console with appropriate colors
   */
  private writeToConsole(level: keyof typeof LogLevel, message: string): void {
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m', // White
    };
    
    const reset = '\x1b[0m';
    const colorCode = colors[level] || colors.INFO;
    
    console.log(`${colorCode}${message}${reset}`);
  }

  /**
   * Write to file with rotation
   */
  private writeToFile(entry: LogEntry): void {
    const today = new Date().toISOString().split('T')[0];
    const filename = `${today}.log`;
    const filepath = path.join(this.logsDir, filename);
    
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Create log entry with current timestamp
   */
  private createLogEntry(
    level: keyof typeof LogLevel,
    message: string,
    metadata?: Record<string, any>,
    context?: string,
    requestId?: string,
    userId?: string,
    duration?: number,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      context,
      requestId,
      userId,
      duration,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
  }

  /**
   * Error logging
   */
  public error(
    message: string,
    error?: Error,
    metadata?: Record<string, any>,
    context?: string,
    requestId?: string,
    userId?: string
  ): void {
    const entry = this.createLogEntry('ERROR', message, metadata, context, requestId, userId, undefined, error);
    this.writeLog(entry);
  }

  /**
   * Warning logging
   */
  public warn(
    message: string,
    metadata?: Record<string, any>,
    context?: string,
    requestId?: string,
    userId?: string
  ): void {
    const entry = this.createLogEntry('WARN', message, metadata, context, requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Info logging
   */
  public info(
    message: string,
    metadata?: Record<string, any>,
    context?: string,
    requestId?: string,
    userId?: string
  ): void {
    const entry = this.createLogEntry('INFO', message, metadata, context, requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Debug logging
   */
  public debug(
    message: string,
    metadata?: Record<string, any>,
    context?: string,
    requestId?: string,
    userId?: string
  ): void {
    const entry = this.createLogEntry('DEBUG', message, metadata, context, requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Performance logging
   */
  public performance(
    message: string,
    duration: number,
    metadata?: Record<string, any>,
    context?: string,
    requestId?: string,
    userId?: string
  ): void {
    const entry = this.createLogEntry('INFO', message, metadata, context, requestId, userId, duration);
    this.writeLog(entry);
  }

  /**
   * HTTP request logging
   */
  public httpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string,
    ip?: string,
    userAgent?: string,
    requestId?: string
  ): void {
    const message = `${method} ${url} - ${statusCode}`;
    const metadata = {
      method,
      url,
      statusCode,
      ip,
      userAgent,
    };
    
    const level: keyof typeof LogLevel = statusCode >= 400 ? 'ERROR' : 'INFO';
    const entry = this.createLogEntry(level, message, metadata, 'HTTP', requestId, userId, duration);
    this.writeLog(entry);
  }

  /**
   * Database operation logging
   */
  public database(
    operation: string,
    table: string,
    duration: number,
    rowsAffected?: number,
    metadata?: Record<string, any>,
    userId?: string,
    requestId?: string
  ): void {
    const message = `Database ${operation} on ${table}`;
    const dbMetadata = {
      operation,
      table,
      rowsAffected,
      ...metadata,
    };
    
    const entry = this.createLogEntry('DEBUG', message, dbMetadata, 'DATABASE', requestId, userId, duration);
    this.writeLog(entry);
  }

  /**
   * Security event logging
   */
  public security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>,
    userId?: string,
    ip?: string,
    requestId?: string
  ): void {
    const message = `Security Event: ${event}`;
    const securityMetadata = {
      event,
      severity,
      ip,
      ...metadata,
    };
    
    const level: keyof typeof LogLevel = severity === 'critical' || severity === 'high' ? 'ERROR' : 'WARN';
    const entry = this.createLogEntry(level, message, securityMetadata, 'SECURITY', requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Business logic logging
   */
  public business(
    event: string,
    metadata?: Record<string, any>,
    userId?: string,
    requestId?: string
  ): void {
    const message = `Business Event: ${event}`;
    const entry = this.createLogEntry('INFO', message, metadata, 'BUSINESS', requestId, userId);
    this.writeLog(entry);
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static logger: Logger;

  public static initialize(logger: Logger): void {
    PerformanceMonitor.logger = logger;
  }

  /**
   * Start timing an operation
   */
  public static startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return (metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        metadata,
      };
      
      PerformanceMonitor.metrics.push(metric);
      
      if (PerformanceMonitor.logger) {
        PerformanceMonitor.logger.performance(
          `Operation completed: ${operation}`,
          duration,
          metadata,
          'PERFORMANCE'
        );
      }
      
      // Keep only last 1000 metrics in memory
      if (PerformanceMonitor.metrics.length > 1000) {
        PerformanceMonitor.metrics = PerformanceMonitor.metrics.slice(-1000);
      }
    };
  }

  /**
   * Get performance statistics
   */
  public static getStats(): {
    totalOperations: number;
    averageDuration: number;
    slowestOperations: PerformanceMetric[];
  } {
    const total = PerformanceMonitor.metrics.length;
    const avgDuration = total > 0 
      ? PerformanceMonitor.metrics.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;
    
    const slowest = [...PerformanceMonitor.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    return {
      totalOperations: total,
      averageDuration: Math.round(avgDuration),
      slowestOperations: slowest,
    };
  }
}

/**
 * Express middleware for request logging
 */
export const requestLoggerMiddleware = (logger: Logger) => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    // Add request ID to request object
    req.requestId = requestId;
    
    // Log request start
    logger.debug(
      `Request started: ${req.method} ${req.originalUrl}`,
      {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      'HTTP',
      requestId,
      req.user?.id
    );
    
    // Override res.end to log completion
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      
      logger.httpRequest(
        req.method,
        req.originalUrl,
        res.statusCode,
        duration,
        req.user?.id,
        req.ip,
        req.headers['user-agent'],
        requestId
      );
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Export default logger instance (will be initialized in app.ts)
export let logger: Logger;

export const initializeLogger = (config: EnvironmentConfig): Logger => {
  logger = Logger.getInstance(config);
  PerformanceMonitor.initialize(logger);
  return logger;
}; 