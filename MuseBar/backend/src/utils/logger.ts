/// <reference path="../types/express/index.d.ts" />

/**
 * Professional Logging System
 * Provides structured logging with multiple transports and performance monitoring
 */

import fs from 'fs';
import path from 'path';
import { EnvironmentConfig } from '../config/environment';
import { Request, Response, NextFunction } from 'express';
import { LogEntry, LogLevel, PerformanceMetric } from './logger/types';
import { formatLogEntry, writeToConsole } from './logger/logFormatters';
import { FileTransport } from './logger/logTransport';

/**
 * Log levels in order of severity
 */
// moved to ./logger/types

/**
 * Log entry structure
 */
// moved to ./logger/types

/**
 * Performance monitoring data
 */
// moved to ./logger/types

/**
 * Professional Logger Class
 */
export class Logger {
  private static instance: Logger;
  private config: EnvironmentConfig;
  private logLevel: LogLevel;
  private logsDir: string;
  private fileTransport: FileTransport;

  private constructor(config: EnvironmentConfig) {
    this.config = config;
    this.logLevel = this.getLogLevelFromString(config.logging.level);
    this.logsDir = path.join(process.cwd(), 'logs');
    
    // Initialize file transport
    this.fileTransport = new FileTransport(this.logsDir, config.logging.enableFileLogging);
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
    return formatLogEntry(entry, this.config);
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
    writeToConsole(level, message);
  }

  /**
   * Write to file with rotation
   */
  private writeToFile(entry: LogEntry): void {
    this.fileTransport.write(entry);
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
    userId?: string | number,
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
      userId: userId !== undefined ? String(userId) : undefined,
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
    userId?: string | number
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
    userId?: string | number
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
    userId?: string | number,
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
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    // Add request ID to request object
    req.requestId = requestId;
    
    // Log request start
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader.join(', ') : userAgentHeader;
    logger.debug(
      `Request started: ${req.method} ${req.originalUrl}`,
      {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent,
      },
      'HTTP',
      requestId,
      req.user?.id
    );
    
    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const finishUserAgentHeader = req.headers['user-agent'];
      const finishUserAgent = Array.isArray(finishUserAgentHeader) ? finishUserAgentHeader.join(', ') : finishUserAgentHeader;
      logger.httpRequest(
        req.method,
        req.originalUrl,
        res.statusCode,
        duration,
        req.user?.id,
        req.ip,
        finishUserAgent,
        requestId
      );
    });
    
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