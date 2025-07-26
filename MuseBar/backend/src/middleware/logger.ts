import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  ip: string;
  userAgent: string;
  userId?: string;
  error?: string;
}

export class Logger {
  static logRequest(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const userId = (req as any).user?.id;

    // Log request start
    const requestLog: Partial<LogEntry> = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId
    };

    console.log('📝 Request:', {
      ...requestLog,
      body: req.method !== 'GET' ? this.sanitizeBody(req.body) : undefined
    });

    // Override response.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function(...args: any[]) {
      const responseTime = Date.now() - startTime;
      
      const responseLog: LogEntry = {
        ...requestLog as LogEntry,
        statusCode: res.statusCode,
        responseTime
      };

      // Log with appropriate emoji based on status code
      const emoji = res.statusCode >= 500 ? '❌' : 
                   res.statusCode >= 400 ? '⚠️' : 
                   res.statusCode >= 300 ? '🔄' : '✅';

      console.log(`${emoji} Response:`, {
        ...responseLog,
        message: `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`
      });

      // Call original end method
      return originalEnd.apply(this, args);
    };

    next();
  }

  static logError(error: any, req: Request) {
    const errorLog: Partial<LogEntry> = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: (req as any).user?.id,
      error: error.message
    };

    console.error('💥 Error Log:', {
      ...errorLog,
      stack: error.stack,
      body: this.sanitizeBody(req.body)
    });
  }

  private static sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    // Create a copy and remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[HIDDEN]';
      }
    });

    return sanitized;
  }

  static logDatabaseQuery(query: string, params?: any[], duration?: number) {
    console.log('🗄️  Database Query:', {
      timestamp: new Date().toISOString(),
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params: params?.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p),
      duration: duration ? `${duration}ms` : undefined
    });
  }

  static logSystemEvent(event: string, details?: any) {
    console.log('🔧 System Event:', {
      timestamp: new Date().toISOString(),
      event,
      details
    });
  }
} 