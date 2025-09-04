/**
 * Security Middleware Module Entry Point
 * Exports all security middleware components
 */

export { SecurityMiddlewareFactory, createSecurityMiddleware } from './SecurityMiddleware';
export { RateLimitMiddleware } from './RateLimitMiddleware';
export { 
  InputSanitizationService, 
  RequestSizeLimitService,
  inputSanitization,
  requestSizeLimit 
} from './InputSanitization';
export { SecurityHeadersService, securityHeaders } from './SecurityHeaders';
export { CorsConfigurationService, createCorsOptions } from './CorsConfiguration';
export * from './types';

// Re-export commonly used functions for backward compatibility
export {
  SecurityMiddlewareFactory as RateLimitMiddleware
} from './SecurityMiddleware';

// Default export for backward compatibility
export { SecurityMiddlewareFactory as default } from './SecurityMiddleware';
