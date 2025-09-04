export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: keyof typeof LogLevel;
  message: string;
  metadata?: Record<string, any>;
  category?: string;
  context?: string;
  requestId?: string;
  userId?: string;
  service?: string;
  version?: string;
  environment?: string;
  nodeId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}


