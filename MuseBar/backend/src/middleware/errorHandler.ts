import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default error
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    const message = 'Cette ressource existe déjà';
    error = new AppError(message, 409);
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key constraint violation
    const message = 'Référence invalide - ressource liée introuvable';
    error = new AppError(message, 400);
  }

  if (err.code === '23502') {
    // PostgreSQL not null constraint violation
    const message = 'Champ requis manquant';
    error = new AppError(message, 400);
  }

  if (err.name === 'ValidationError') {
    // Validation errors
    const message = Object.values(err.errors || {}).map((val: any) => val.message).join(', ');
    error = new AppError(`Erreur de validation: ${message}`, 400);
  }

  if (err.name === 'CastError') {
    // Invalid ID format
    const message = 'Format d\'identifiant invalide';
    error = new AppError(message, 400);
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Erreur interne du serveur';

  // In development, send full error details
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(isDevelopment && {
        stack: err.stack,
        details: err
      })
    }
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route non trouvée: ${req.originalUrl}`, 404);
  next(error);
}; 