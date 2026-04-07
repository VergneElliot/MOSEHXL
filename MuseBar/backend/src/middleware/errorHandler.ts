/**
 * Unified Error Handling
 * Single source of truth for error classes, asyncHandler, and the global error middleware.
 * Replaces the previous split between errorHandler.ts (AppError, French) and
 * errorHandling.ts (native Error extensions, English, createEnhancedErrorHandler).
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Error class hierarchy (one base + subclasses with statusCode)
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;
  public details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR');
    this.name = 'BusinessLogicError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service unavailable') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

// ---------------------------------------------------------------------------
// Async wrapper (single definition; was duplicated in errorHandler and errorHandling)
// ---------------------------------------------------------------------------

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ---------------------------------------------------------------------------
// Global error middleware (handles AppError, PG codes, JWT, etc.)
// ---------------------------------------------------------------------------

export const createErrorHandler = (logger?: Logger) => {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    void _next;
    const normalized = normalizeError(err);
    const requestId = (req as any).requestId;
    const userId = (req as any).user?.id;

    if (logger) {
      if (normalized.statusCode >= 500) {
        logger.error(
          `Server Error: ${normalized.message}`,
          {
            error: err,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            statusCode: normalized.statusCode,
          },
          'ERROR_HANDLER',
          requestId,
          userId ?? undefined
        );
      } else {
        logger.warn(
          `Client Error: ${normalized.message}`,
          {
            url: req.originalUrl,
            method: req.method,
            statusCode: normalized.statusCode,
          },
          'ERROR_HANDLER',
          requestId,
          userId ?? undefined
        );
      }
    } else {
      console.error('Error:', {
        message: normalized.message,
        stack: err instanceof Error ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        requestId,
        userId,
      });
    }

    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const payload: any = {
      success: false,
      error: {
        message: normalized.isOperational ? normalized.message : 'Internal server error',
        code: normalized.errorCode || 'INTERNAL_ERROR',
        statusCode: normalized.statusCode,
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
    };
    if (normalized.details && (normalized.statusCode === 400 || isDev)) {
      payload.error.details = normalized.details;
    }
    if (isDev && err instanceof Error && err.stack) {
      payload.error.stack = err.stack;
    }
    res.status(normalized.statusCode).json(payload);
  };
};

interface NormalizedError {
  message: string;
  statusCode: number;
  errorCode: string;
  details?: Record<string, unknown>;
  isOperational: boolean;
}

function normalizeError(err: unknown): NormalizedError {
  if (err instanceof AppError) {
    return {
      message: err.message,
      statusCode: err.statusCode,
      errorCode: err.errorCode || 'INTERNAL_ERROR',
      details: err.details,
      isOperational: err.isOperational,
    };
  }

  const e = err as any;

  // PostgreSQL
  if (e && e.code) {
    switch (e.code) {
      case '23505':
        return { message: 'Resource already exists', statusCode: 409, errorCode: 'CONFLICT_ERROR', isOperational: true };
      case '23503':
        return { message: 'Invalid reference', statusCode: 400, errorCode: 'VALIDATION_ERROR', isOperational: true };
      case '23502':
        return { message: 'Required field missing', statusCode: 400, errorCode: 'VALIDATION_ERROR', isOperational: true };
      case '23514':
        return { message: 'Invalid value for field', statusCode: 400, errorCode: 'VALIDATION_ERROR', isOperational: true };
      case '42703':
      case '42P01':
        return { message: 'Database error', statusCode: 500, errorCode: 'DATABASE_ERROR', isOperational: true };
      default:
        if (String(e.code).startsWith('23')) {
          return { message: 'Data constraint violated', statusCode: 400, errorCode: 'VALIDATION_ERROR', isOperational: true };
        }
        if (String(e.code).startsWith('42')) {
          return { message: 'Database structure error', statusCode: 500, errorCode: 'DATABASE_ERROR', isOperational: true };
        }
    }
  }

  // JWT
  if (e && e.name === 'JsonWebTokenError') {
    return { message: 'Invalid authentication token', statusCode: 401, errorCode: 'AUTHENTICATION_ERROR', isOperational: true };
  }
  if (e && e.name === 'TokenExpiredError') {
    return { message: 'Authentication token expired', statusCode: 401, errorCode: 'AUTHENTICATION_ERROR', isOperational: true };
  }

  // Network / external
  if (e && (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND')) {
    return { message: 'Service temporarily unavailable', statusCode: 502, errorCode: 'EXTERNAL_SERVICE_ERROR', isOperational: true };
  }

  // Rate limit (message-based)
  if (e && e.message && String(e.message).toLowerCase().includes('rate limit')) {
    return { message: 'Too many requests', statusCode: 429, errorCode: 'RATE_LIMIT_ERROR', isOperational: true };
  }

  // JSON syntax
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return { message: 'Invalid JSON', statusCode: 400, errorCode: 'VALIDATION_ERROR', isOperational: true };
  }

  // File upload
  if (e && e.code === 'LIMIT_FILE_SIZE') {
    return { message: 'File too large', statusCode: 400, errorCode: 'VALIDATION_ERROR', isOperational: true };
  }
  if (e && e.code === 'LIMIT_UNEXPECTED_FILE') {
    return { message: 'Unexpected file', statusCode: 400, errorCode: 'VALIDATION_ERROR', isOperational: true };
  }

  // Default
  const message = e && typeof e.message === 'string' ? e.message : 'Internal server error';
  return {
    message,
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    details: isOperationalMessage(message) ? undefined : { originalError: message },
    isOperational: false,
  };
}

function isOperationalMessage(msg: string): boolean {
  return msg.length < 200 && !msg.includes(' at ') && !msg.includes('  at ');
}

// ---------------------------------------------------------------------------
// 404 and legacy export
// ---------------------------------------------------------------------------

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND_ERROR'));
};

/** Legacy name for createErrorHandler() result when no logger is passed. */
export const errorHandler = createErrorHandler();
