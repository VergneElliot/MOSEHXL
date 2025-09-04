/**
 * Security Headers Middleware
 * Handles security-related HTTP headers
 */

import { Request, Response, NextFunction } from 'express';
import { EnvironmentConfig } from '../../config/environment';
import { SecurityMiddlewareFunction } from './types';

/**
 * Security Headers Service
 */
export class SecurityHeadersService {
  /**
   * Create security headers middleware
   */
  public static createMiddleware(config: EnvironmentConfig): SecurityMiddlewareFunction {
    return (req: Request, res: Response, next: NextFunction) => {
      // Apply security headers
      SecurityHeadersService.applySecurityHeaders(res, config);
      next();
    };
  }

  /**
   * Apply comprehensive security headers
   */
  public static applySecurityHeaders(res: Response, config: EnvironmentConfig): void {
    const headers: Record<string, string> = {
      // Prevent XSS attacks
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent content type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Prevent iframe embedding (clickjacking protection)
      'X-Frame-Options': 'DENY',
      
      // Content Security Policy
      'Content-Security-Policy': SecurityHeadersService.buildCSP(),
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Feature Policy / Permissions Policy
      'Permissions-Policy': SecurityHeadersService.buildPermissionsPolicy(),
      
      // Server identification
      'X-Powered-By': config.app.name,
    };

    // HTTP Strict Transport Security (HTTPS only in production)
    if (config.app.environment === 'production') {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    res.set(headers);
  }

  /**
   * Build Content Security Policy
   */
  private static buildCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
    ].join('; ');
  }

  /**
   * Build Permissions Policy
   */
  private static buildPermissionsPolicy(): string {
    return [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
    ].join(', ');
  }

  /**
   * Apply CORS headers
   */
  public static applyCorsHeaders(
    res: Response, 
    origin?: string, 
    allowCredentials = true
  ): void {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Request-ID',
      ].join(', '),
      'Access-Control-Expose-Headers': [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ].join(', '),
    };

    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
    }

    if (allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    res.set(headers);
  }

  /**
   * Apply cache control headers
   */
  public static applyCacheHeaders(
    res: Response,
    maxAge: number = 0,
    isPrivate: boolean = true
  ): void {
    const cacheControl = isPrivate 
      ? `private, max-age=${maxAge}`
      : `public, max-age=${maxAge}`;

    res.set({
      'Cache-Control': cacheControl,
      'Pragma': maxAge === 0 ? 'no-cache' : 'cache',
      'Expires': maxAge === 0 ? '0' : new Date(Date.now() + maxAge * 1000).toUTCString(),
    });
  }

  /**
   * Remove security headers (for debugging)
   */
  public static removeSecurityHeaders(res: Response): void {
    const headersToRemove = [
      'X-XSS-Protection',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'Referrer-Policy',
      'Permissions-Policy',
    ];

    headersToRemove.forEach(header => {
      res.removeHeader(header);
    });
  }
}

// Export convenience function for backward compatibility
export const securityHeaders = SecurityHeadersService.createMiddleware;
