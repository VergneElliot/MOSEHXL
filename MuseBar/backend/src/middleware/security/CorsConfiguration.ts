/**
 * CORS Configuration Service
 * Handles Cross-Origin Resource Sharing configuration
 */

import { EnvironmentConfig } from '../../config/environment';
import { CorsCallback, CorsOriginFunction } from './types';

/**
 * CORS Configuration Service
 */
export class CorsConfigurationService {
  /**
   * Create CORS options for express-cors middleware
   */
  public static createCorsOptions(config: EnvironmentConfig) {
    return {
      origin: CorsConfigurationService.createOriginValidator(config),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Request-ID',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      optionsSuccessStatus: 200, // Some legacy browsers choke on 204
      maxAge: 86400, // 24 hours
    };
  }

  /**
   * Create origin validator function
   */
  private static createOriginValidator(config: EnvironmentConfig): CorsOriginFunction {
    return (origin: string | undefined, callback: CorsCallback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (CorsConfigurationService.isOriginAllowed(origin, config)) {
        return callback(null, true);
      }

      // In development, be more permissive
      if (CorsConfigurationService.isDevelopmentOrigin(origin, config)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    };
  }

  /**
   * Check if origin is explicitly allowed
   */
  private static isOriginAllowed(origin: string, config: EnvironmentConfig): boolean {
    const allowedOrigins = config.server.corsOrigins;
    
    return allowedOrigins.some(allowedOrigin => {
      // Exact string match
      if (origin === allowedOrigin) {
        return true;
      }
      
      // Pattern matching with wildcards
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      
      return false;
    });
  }

  /**
   * Check if origin should be allowed in development
   */
  private static isDevelopmentOrigin(origin: string, config: EnvironmentConfig): boolean {
    if (config.app.environment !== 'development') {
      return false;
    }

    // Allow localhost and 127.0.0.1 in development
    return origin.includes('localhost') || origin.includes('127.0.0.1');
  }

  /**
   * Get CORS preflight options
   */
  public static getPreflightOptions() {
    return {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Request-ID',
      ].join(', '),
      'Access-Control-Max-Age': '86400', // 24 hours
    };
  }

  /**
   * Validate origin against patterns
   */
  public static validateOriginPattern(origin: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(origin);
    }

    return origin === pattern;
  }

  /**
   * Get development CORS options (more permissive)
   */
  public static getDevelopmentCorsOptions() {
    return {
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
      allowedHeaders: '*',
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Total-Count',
      ],
      optionsSuccessStatus: 200,
      maxAge: 3600, // 1 hour
    };
  }

  /**
   * Get production CORS options (strict)
   */
  public static getProductionCorsOptions(config: EnvironmentConfig) {
    return {
      origin: CorsConfigurationService.createOriginValidator(config),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Request-ID',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      optionsSuccessStatus: 200,
      maxAge: 86400, // 24 hours
    };
  }
}

// Export convenience function for backward compatibility
export const createCorsOptions = CorsConfigurationService.createCorsOptions;
