/**
 * Database Type Definitions
 * Shared types for database operations and monitoring
 */

import { PoolClient } from 'pg';

/**
 * Database connection statistics
 */
export interface DatabaseStats {
  totalConnections: number;
  idleConnections: number;
  waitingCount: number;
  connectionsCreated: number;
  connectionsDestroyed: number;
  averageQueryTime: number;
  totalQueries: number;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
}

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Database health check endpoint data
 */
export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  connections: {
    total: number;
    idle: number;
    waiting: number;
  };
  performance: {
    averageQueryTime: number;
    totalQueries: number;
  };
  lastHealthCheck: Date | null;
  environment: string;
}

/**
 * Database configuration info (sanitized)
 */
export interface DatabaseInfo {
  host: string;
  port: number;
  database: string;
  maxConnections: number;
  ssl: boolean;
  environment: string;
}

/**
 * Query execution context
 */
export interface QueryContext {
  requestId?: string;
  userId?: string;
  startTime: number;
}
