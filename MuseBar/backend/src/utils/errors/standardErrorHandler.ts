/**
 * Standard Error Handler
 * Centralized error handling patterns to ensure consistency across services
 */

import { Logger } from '../logger';

/**
 * Standard error response interface
 */
export interface StandardErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, any>;
}

/**
 * Standard success response interface
 */
export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

/**
 * Standardized error types
 */
export enum ErrorTypes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

/**
 * Standardized application error class
 */
export class StandardError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorTypes,
    statusCode: number = 500,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'StandardError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, StandardError);
  }

  /**
   * Convert to standard error response
   */
  public toErrorResponse(requestId?: string): StandardErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      timestamp: new Date().toISOString(),
      requestId,
      details: this.details
    };
  }

  /**
   * Static factory methods for common errors
   */
  static validation(message: string, details?: Record<string, any>): StandardError {
    return new StandardError(message, ErrorTypes.VALIDATION_ERROR, 400, details);
  }

  static notFound(resource: string, identifier?: string): StandardError {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    return new StandardError(message, ErrorTypes.NOT_FOUND, 404);
  }

  static unauthorized(message: string = 'Unauthorized access'): StandardError {
    return new StandardError(message, ErrorTypes.UNAUTHORIZED, 401);
  }

  static forbidden(message: string = 'Access forbidden'): StandardError {
    return new StandardError(message, ErrorTypes.FORBIDDEN, 403);
  }

  static conflict(message: string, details?: Record<string, any>): StandardError {
    return new StandardError(message, ErrorTypes.CONFLICT, 409, details);
  }

  static database(message: string, details?: Record<string, any>): StandardError {
    return new StandardError(message, ErrorTypes.DATABASE_ERROR, 500, details);
  }

  static internal(message: string = 'Internal server error', details?: Record<string, any>): StandardError {
    return new StandardError(message, ErrorTypes.INTERNAL_ERROR, 500, details);
  }

  static timeout(message: string = 'Operation timed out'): StandardError {
    return new StandardError(message, ErrorTypes.TIMEOUT_ERROR, 408);
  }

  static rateLimit(message: string = 'Rate limit exceeded'): StandardError {
    return new StandardError(message, ErrorTypes.RATE_LIMIT_ERROR, 429);
  }
}

/**
 * Standard error handler utility
 */
export class ErrorHandler {
  private static logger = Logger.getInstance();

  /**
   * Handle and log error with standard pattern
   */
  static handleError(
    error: Error | StandardError,
    context: {
      operation: string;
      service: string;
      userId?: number;
      requestId?: string;
      metadata?: Record<string, any>;
    }
  ): StandardErrorResponse {
    const { operation, service, userId, requestId, metadata } = context;

    // Log the error
    this.logger.error(
      `Error in ${operation}`,
      error,
      service
    );

    // Return standardized error response
    if (error instanceof StandardError) {
      return error.toErrorResponse(requestId);
    }

    // Convert unknown errors to standard format
    const standardError = StandardError.internal(
      error.message || 'An unexpected error occurred',
      { originalError: error.constructor.name }
    );

    return standardError.toErrorResponse(requestId);
  }

  /**
   * Handle async operation with standardized error handling
   */
  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      service: string;
      userId?: number;
      requestId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<StandardSuccessResponse<T> | StandardErrorResponse> {
    try {
      const result = await operation();
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: context.requestId
      };
    } catch (error) {
      return this.handleError(error as Error, {
        operation: context.operationName,
        service: context.service,
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata
      });
    }
  }

  /**
   * Validate and throw if validation fails
   */
  static validateAndThrow(
    condition: boolean,
    message: string,
    details?: Record<string, any>
  ): void {
    if (!condition) {
      throw StandardError.validation(message, details);
    }
  }

  /**
   * Assert resource exists or throw not found
   */
  static assertExists<T>(
    resource: T | null | undefined,
    resourceType: string,
    identifier?: string
  ): T {
    if (!resource) {
      throw StandardError.notFound(resourceType, identifier);
    }
    return resource;
  }

  /**
   * Wrap database operations with standard error handling
   */
  static async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Convert database errors to standardized format
      if (error.code === '23505') { // Unique constraint violation
        throw StandardError.conflict('Resource already exists', {
          constraintViolation: error.constraint,
          ...metadata
        });
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        throw StandardError.validation('Referenced resource does not exist', {
          constraintViolation: error.constraint,
          ...metadata
        });
      }

      if (error.code === '23502') { // Not null constraint violation
        throw StandardError.validation('Required field is missing', {
          missingField: error.column,
          ...metadata
        });
      }

      // Generic database error
      throw StandardError.database(
        `Database operation failed: ${operationName}`,
        {
          originalError: error.message,
          sqlState: error.code,
          ...metadata
        }
      );
    }
  }

  /**
   * Create success response
   */
  static success<T>(data: T, requestId?: string): StandardSuccessResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId
    };
  }
}
