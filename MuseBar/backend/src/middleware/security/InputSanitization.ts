/**
 * Input Sanitization Middleware
 * Handles input sanitization and validation for security
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';
import { ValidationError } from '../errorHandler';
import { SecurityMiddlewareFunction } from './types';

/**
 * Input Sanitization Service
 */
export class InputSanitizationService {
  /**
   * Create input sanitization middleware
   */
  public static createMiddleware(logger?: Logger): SecurityMiddlewareFunction {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = InputSanitizationService.sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = InputSanitizationService.sanitizeObject(req.query);
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
          req.params = InputSanitizationService.sanitizeObject(req.params);
        }

        next();
      } catch (error) {
        if (logger) {
          logger.error(
            'Input sanitization failed',
            {
              error: error as Error,
              url: req.originalUrl,
              method: req.method,
            },
            'SECURITY',
            req.requestId
          );
        }

        throw new ValidationError('Invalid input format');
      }
    };
  }

  /**
   * Sanitize object recursively
   */
  public static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return InputSanitizationService.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => InputSanitizationService.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = InputSanitizationService.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string input.
   * Does NOT strip SQL keywords — that would corrupt legitimate data (e.g. "Select Blend Coffee")
   * and provides no real protection; SQL injection is prevented by parameterized queries only.
   */
  public static sanitizeString(str: string): string {
    return str
      // Remove potential XSS vectors
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload\s*=/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onclick\s*=/gi, '')
      // Trim and limit length
      .trim()
      .substring(0, 10000); // Reasonable length limit
  }

  /**
   * Validate email format
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  public static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Check for potentially dangerous patterns (XSS-style only).
   * SQL keywords are not treated as dangerous; SQL injection is prevented by parameterized queries.
   */
  public static containsDangerousPatterns(str: string): boolean {
    const dangerousPatterns = [
      /<script/i,
      /<iframe/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
    ];

    return dangerousPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Escape HTML entities
   */
  public static escapeHtml(str: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return str.replace(/[&<>"'/]/g, char => htmlEntities[char]);
  }

  /**
   * Remove HTML tags
   */
  public static stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, '');
  }
}

/**
 * Request Size Limiting Middleware
 */
export class RequestSizeLimitService {
  /**
   * Create request size limiting middleware
   */
  public static createMiddleware(maxSizeKB: number, logger?: Logger): SecurityMiddlewareFunction {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      const maxSizeBytes = maxSizeKB * 1024;

      if (contentLength > maxSizeBytes) {
        if (logger) {
          logger.security(
            'Request size limit exceeded',
            'LOW',
            {
              contentLength,
              maxSize: maxSizeBytes,
              url: req.originalUrl,
              method: req.method,
              ip: req.ip,
            },
            req.requestId,
            req.user?.id ? parseInt(String(req.user.id)) : undefined
          );
        }

        throw new ValidationError(`Request too large. Maximum size: ${maxSizeKB}KB`);
      }

      next();
    };
  }
}

// Export convenience functions for backward compatibility
export const inputSanitization = InputSanitizationService.createMiddleware;
export const requestSizeLimit = RequestSizeLimitService.createMiddleware;
