/**
 * Category Loggers
 * Specialized logging methods for different application categories
 */

import { LoggerCore } from './loggerCore';

/**
 * Specialized logging methods for different application categories
 */
export class CategoryLoggers extends LoggerCore {

  /**
   * Log performance metrics
   */
  public performance(
    message: string,
    duration?: number,
    metadata?: Record<string, unknown>,
    category = 'PERFORMANCE',
    requestId?: string,
    userId?: number
  ): void {
    const performanceMetadata = {
      ...metadata,
      duration: duration ? `${duration}ms` : undefined
    };
    
    const entry = this.createLogEntry('INFO', message, performanceMetadata, category, requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Log HTTP requests with comprehensive details
   */
  public httpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: number,
    ip?: string,
    userAgent?: string,
    requestId?: string
  ): void {
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;
    const metadata = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userId,
      ip,
      userAgent: userAgent?.substring(0, 200), // Truncate long user agents
      responseTime: duration,
      statusClass: this.getStatusClass(statusCode)
    };
    
    const level = statusCode >= 400 ? 'WARN' : 'INFO';
    const entry = this.createLogEntry(level, message, metadata, 'HTTP', requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Log database operations
   */
  public database(
    operation: string,
    table?: string,
    duration?: number,
    rowsAffected?: number,
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: number
  ): void {
    const message = `Database ${operation}${table ? ` on ${table}` : ''}`;
    const dbMetadata = {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      rowsAffected,
      ...metadata
    };
    
    const entry = this.createLogEntry('INFO', message, dbMetadata, 'DATABASE', requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Log security events
   */
  public security(
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: number
  ): void {
    const message = `Security Event: ${event}`;
    const securityMetadata = {
      event,
      severity,
      ...metadata
    };
    
    // Map severity to log level
    const level = this.getSecurityLogLevel(severity);
    const entry = this.createLogEntry(level, message, securityMetadata, 'SECURITY', requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Log business events
   */
  public business(
    event: string,
    entityType?: string,
    entityId?: string | number,
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: number
  ): void {
    const message = `Business Event: ${event}`;
    const businessMetadata = {
      event,
      entityType,
      entityId,
      ...metadata
    };
    
    const entry = this.createLogEntry('INFO', message, businessMetadata, 'BUSINESS', requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Log authentication events
   */
  public authentication(
    action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'PASSWORD_CHANGE' | 'TOKEN_REFRESH',
    userId?: number,
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    const message = `Authentication: ${action}`;
    const authMetadata = {
      action,
      userId,
      ...metadata
    };
    
    const level = action === 'FAILED_LOGIN' ? 'WARN' : 'INFO';
    const entry = this.createLogEntry(level, message, authMetadata, 'AUTH', requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Log API events
   */
  public api(
    endpoint: string,
    action: string,
    result: 'SUCCESS' | 'ERROR' | 'VALIDATION_ERROR',
    duration?: number,
    metadata?: Record<string, any>,
    requestId?: string,
    userId?: number
  ): void {
    const message = `API ${action} on ${endpoint}: ${result}`;
    const apiMetadata = {
      endpoint,
      action,
      result,
      duration: duration ? `${duration}ms` : undefined,
      ...metadata
    };
    
    const level = result === 'ERROR' ? 'ERROR' : result === 'VALIDATION_ERROR' ? 'WARN' : 'INFO';
    const entry = this.createLogEntry(level, message, apiMetadata, 'API', requestId, userId);
    this.writeLog(entry);
  }

  /**
   * Log system events
   */
  public system(
    event: string,
    component: string,
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    const message = `System Event: ${event} in ${component}`;
    const systemMetadata = {
      event,
      component,
      ...metadata
    };
    
    const entry = this.createLogEntry('INFO', message, systemMetadata, 'SYSTEM', requestId);
    this.writeLog(entry);
  }

  /**
   * Get HTTP status class for categorization
   */
  private getStatusClass(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  /**
   * Map security severity to log level
   */
  private getSecurityLogLevel(severity: string): keyof typeof import('./types').LogLevel {
    switch (severity) {
      case 'CRITICAL': return 'ERROR';
      case 'HIGH': return 'ERROR';
      case 'MEDIUM': return 'WARN';
      case 'LOW': return 'INFO';
      default: return 'WARN';
    }
  }
}
