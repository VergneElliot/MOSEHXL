/**
 * Enhanced Error Handling Middleware
 * Comprehensive error handling for critical system components
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

/**
 * Custom error types for better error categorization
 */
export class ValidationError extends Error {
  public statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public statusCode = 401;
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public statusCode = 403;
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BusinessLogicError extends Error {
  public statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

export class DatabaseError extends Error {
  public statusCode = 500;
  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends Error {
  public statusCode = 502;
  constructor(message: string = 'External service unavailable') {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Enhanced error handler middleware
 */
export function createEnhancedErrorHandler(logger: Logger) {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    // Generate unique error ID for tracking
    const errorId = Math.random().toString(36).substring(2, 15);
    
    // Default error properties
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorType = 'UnknownError';
    
    // Determine error type and appropriate response
    if (error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof NotFoundError ||
        error instanceof BusinessLogicError ||
        error instanceof DatabaseError ||
        error instanceof ExternalServiceError) {
      statusCode = error.statusCode;
      message = error.message;
      errorType = error.name;
    } else if (error.name === 'SequelizeValidationError' || error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      errorType = 'ValidationError';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 502;
      message = 'Service temporarily unavailable';
      errorType = 'ServiceUnavailable';
    } else if (error.code === '23505') { // PostgreSQL unique violation
      statusCode = 409;
      message = 'Resource already exists';
      errorType = 'ConflictError';
    } else if (error.code === '23503') { // PostgreSQL foreign key violation
      statusCode = 400;
      message = 'Invalid reference';
      errorType = 'ReferenceError';
    }

    // Log error with context
    const errorContext = {
      errorId,
      errorType,
      statusCode,
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
      establishmentId: (req as any).user?.establishment_id
    };

    if (statusCode >= 500) {
      logger.error(
        `Server Error [${errorId}]: ${error.message}`,
        error,
        errorContext,
        'ERROR_HANDLER'
      );
    } else {
      logger.warn(
        `Client Error [${errorId}]: ${error.message}`,
        errorContext,
        'ERROR_HANDLER'
      );
    }

    // Send error response
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse: any = {
      success: false,
      error: {
        id: errorId,
        type: errorType,
        message,
        statusCode
      }
    };

    // Include stack trace in development
    if (isDevelopment && error.stack) {
      errorResponse.error.stack = error.stack;
    }

    // Include validation details if available
    if (error.errors && Array.isArray(error.errors)) {
      errorResponse.error.details = error.errors;
    }

    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error handler for critical operations
 */
export class CriticalErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Handle legal journal errors with special care
   */
  public handleLegalJournalError(error: Error, context: any): never {
    const errorId = Math.random().toString(36).substring(2, 15);
    
    this.logger.error(
      `CRITICAL: Legal Journal Error [${errorId}]`,
      error,
      { ...context, errorId, severity: 'CRITICAL' },
      'LEGAL_JOURNAL_ERROR'
    );

    // For legal compliance, we need to be very careful about errors
    throw new DatabaseError(`Legal journal operation failed [${errorId}]. This incident has been logged for compliance review.`);
  }

  /**
   * Handle invitation errors with user-friendly messages
   */
  public handleInvitationError(error: Error, context: any): BusinessLogicError {
    const errorId = Math.random().toString(36).substring(2, 15);
    
    this.logger.error(
      `Invitation Error [${errorId}]`,
      error,
      { ...context, errorId },
      'INVITATION_ERROR'
    );

    // Convert technical errors to user-friendly messages
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      return new BusinessLogicError('An invitation for this email already exists');
    }
    
    if (error.message.includes('foreign key') || error.message.includes('establishment')) {
      return new BusinessLogicError('The specified establishment is not available');
    }

    if (error.message.includes('email') || error.message.includes('SMTP')) {
      return new ExternalServiceError('Unable to send invitation email. Please try again later.');
    }

    return new BusinessLogicError(`Invitation operation failed [${errorId}]. Please contact support if this continues.`);
  }

  /**
   * Handle establishment management errors
   */
  public handleEstablishmentError(error: Error, context: any): Error {
    const errorId = Math.random().toString(36).substring(2, 15);
    
    this.logger.error(
      `Establishment Management Error [${errorId}]`,
      error,
      { ...context, errorId },
      'ESTABLISHMENT_ERROR'
    );

    if (error.message.includes('permission') || error.message.includes('access')) {
      return new AuthorizationError('You do not have permission to perform this action');
    }

    if (error.message.includes('not found')) {
      return new NotFoundError('Establishment not found');
    }

    return new BusinessLogicError(`Operation failed [${errorId}]. Please try again.`);
  }
}

