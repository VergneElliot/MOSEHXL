import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

/**
 * Custom Application Error Class
 * Provides structured error handling with operational vs programming error distinction
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error Class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error Class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization Error Class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not Found Error Class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * Conflict Error Class
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Rate Limit Error Class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Enhanced Error Handler Middleware
 * Provides comprehensive error handling with proper logging and response formatting
 */
export const createErrorHandler = (logger?: Logger) => {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    // Set default error
    let error = { ...err };
    error.message = err.message;

    const requestId = req.requestId;
    const userId = req.user?.id;

    // Log error with context
    if (logger) {
      logger.error(
        'Request error occurred',
        err,
        {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          body: req.body,
          params: req.params,
          query: req.query,
        },
        'ERROR_HANDLER',
        requestId,
        userId
      );
    } else {
      console.error('❌ Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        requestId,
        userId
      });
    }

    // Handle specific error types
    error = handleSpecificErrors(err);

    // Send error response
    const statusCode = error.statusCode || 500;
    const message = error.isOperational ? error.message : 'Erreur interne du serveur';

    // Security: Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';

    const response: any = {
      success: false,
      error: {
        message,
        code: error.errorCode || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId,
      }
    };

    // Add details for development/test environments
    if (isDevelopment || isTest) {
      response.error.stack = err.stack;
      response.error.details = error.details;
    }

    // Add validation details if available
    if (error.details && statusCode === 400) {
      response.error.validation = error.details;
    }

    res.status(statusCode).json(response);
  };
};

/**
 * Handle specific error types and convert them to AppError instances
 */
const handleSpecificErrors = (err: any): AppError => {
  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        return new ConflictError('Cette ressource existe déjà');
      
      case '23503': // Foreign key constraint violation
        return new ValidationError('Référence invalide - ressource liée introuvable');
      
      case '23502': // Not null constraint violation
        return new ValidationError('Champ requis manquant');
      
      case '23514': // Check constraint violation
        return new ValidationError('Valeur invalide pour ce champ');
      
      case '42703': // Undefined column
        return new AppError('Erreur de requête - colonne inexistante', 500, 'DATABASE_ERROR');
      
      case '42P01': // Undefined table
        return new AppError('Erreur de requête - table inexistante', 500, 'DATABASE_ERROR');
      
      default:
        if (err.code.startsWith('23')) {
          return new ValidationError('Contrainte de données violée');
        }
        if (err.code.startsWith('42')) {
          return new AppError('Erreur de structure de base de données', 500, 'DATABASE_ERROR');
        }
        break;
    }
  }

  // Mongoose/MongoDB-style validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map((val: any) => val.message)
      .join(', ');
    return new ValidationError(`Erreur de validation: ${message}`, err.errors);
  }

  // Cast errors (invalid ID format)
  if (err.name === 'CastError') {
    return new ValidationError('Format d\'identifiant invalide');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new AuthenticationError('Token d\'authentification invalide');
  }

  if (err.name === 'TokenExpiredError') {
    return new AuthenticationError('Token d\'authentification expiré');
  }

  // Syntax errors (malformed JSON, etc.)
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return new ValidationError('Format JSON invalide');
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('Fichier trop volumineux');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Fichier non autorisé');
  }

  // Rate limiting errors
  if (err.message && err.message.includes('rate limit')) {
    return new RateLimitError();
  }

  // If it's already an AppError, return as is
  if (err instanceof AppError) {
    return err;
  }

  // Default to internal server error
  return new AppError(
    'Erreur interne du serveur',
    500,
    'INTERNAL_ERROR',
    { originalError: err.message }
  );
};

/**
 * Legacy error handler for backward compatibility
 */
export const errorHandler = createErrorHandler();

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route non trouvée: ${req.originalUrl}`, 404);
  next(error);
}; 