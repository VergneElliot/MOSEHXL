/**
 * Request Logger
 * Express middleware and request logging functionality
 */

import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware and utilities
 */
export class RequestLogger {
  
  /**
   * Create Express middleware for request logging
   */
  public static createMiddleware(logger: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = RequestLogger.generateRequestId();
      
      logger.debug(`Request started: ${req.method} ${req.path}`, { requestId });
      
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
          userAgent: userAgent?.substring(0, 200), // Truncate long user agents
          headers: RequestLogger.sanitizeHeaders(req.headers),
          query: req.query,
          body: RequestLogger.sanitizeBody(req.body)
        },
        'HTTP',
        requestId,
        req.user?.id
      );
      
      // Log on response finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const finishUserAgentHeader = req.headers['user-agent'];
        const finishUserAgent = Array.isArray(finishUserAgentHeader) 
          ? finishUserAgentHeader.join(', ') 
          : finishUserAgentHeader;
        
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
      
      // Log on response error
      res.on('error', (error) => {
        const duration = Date.now() - startTime;
        logger.error(
          `Request error: ${req.method} ${req.originalUrl}`,
          {
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip
          },
          'HTTP_ERROR',
          requestId,
          req.user?.id
        );
      });
      
      logger.debug(`Request middleware completed: ${req.method} ${req.path}`);
      next();
    };
  }

  /**
   * Generate unique request ID (crypto-based for uniqueness and predictability)
   */
  private static generateRequestId(): string {
    return randomUUID();
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   */
  private static sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-csrf-token'
    ];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize request body for logging (remove sensitive information)
   */
  private static sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'confirm_password',
      'currentPassword',
      'newPassword',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'social_security_number'
    ];
    
    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            result[key] = sanitizeObject(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }
      
      return obj;
    };
    
    return sanitizeObject(sanitized);
  }

  /**
   * Log API endpoint access
   */
  public static logEndpointAccess(
    logger: any,
    endpoint: string,
    method: string,
    userId?: number,
    requestId?: string,
    metadata?: Record<string, any>
  ): void {
    logger.api(
      endpoint,
      'ACCESS',
      'SUCCESS',
      undefined,
      {
        method,
        ...metadata
      },
      requestId,
      userId
    );
  }

  /**
   * Log API validation error
   */
  public static logValidationError(
    logger: any,
    endpoint: string,
    errors: any[],
    requestId?: string,
    userId?: number
  ): void {
    logger.api(
      endpoint,
      'VALIDATION',
      'VALIDATION_ERROR',
      undefined,
      {
        errors: errors.map(err => ({
          field: err.field || err.path,
          message: err.message,
          value: err.value
        }))
      },
      requestId,
      userId
    );
  }

  /**
   * Log rate limiting event
   */
  public static logRateLimit(
    logger: any,
    ip: string,
    endpoint: string,
    requestId?: string,
    userId?: number
  ): void {
    logger.security(
      'Rate limit exceeded',
      'MEDIUM',
      {
        ip,
        endpoint,
        action: 'RATE_LIMIT_EXCEEDED'
      },
      requestId,
      userId
    );
  }

  /**
   * Log authentication failure
   */
  public static logAuthFailure(
    logger: any,
    reason: string,
    ip: string,
    requestId?: string,
    metadata?: Record<string, any>
  ): void {
    logger.authentication(
      'FAILED_LOGIN',
      undefined,
      {
        reason,
        ip,
        ...metadata
      },
      requestId
    );
  }
}
