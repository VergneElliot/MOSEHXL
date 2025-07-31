/**
 * Database Connection Manager
 * Provides connection pooling, health monitoring, and transaction management
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { EnvironmentConfig } from './environment';
import { Logger } from '../utils/logger';

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
 * Professional Database Manager
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool!: Pool; // Definite assignment assertion - initialized in initializePool()
  private config: EnvironmentConfig;
  private logger: Logger;
  private stats: DatabaseStats;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor(config: EnvironmentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.stats = {
      totalConnections: 0,
      idleConnections: 0,
      waitingCount: 0,
      connectionsCreated: 0,
      connectionsDestroyed: 0,
      averageQueryTime: 0,
      totalQueries: 0,
      lastHealthCheck: null,
      isHealthy: false,
    };

    this.initializePool();
    this.setupEventHandlers();
    this.startHealthChecks();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: EnvironmentConfig, logger?: Logger): DatabaseManager {
    if (!DatabaseManager.instance && config && logger) {
      DatabaseManager.instance = new DatabaseManager(config, logger);
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize the connection pool
   */
  private initializePool(): void {
    const poolConfig: PoolConfig = {
      host: this.config.database.host,
      port: this.config.database.port,
      database: this.config.database.database,
      user: this.config.database.user,
      password: this.config.database.password,
      max: this.config.database.maxConnections,
      idleTimeoutMillis: this.config.database.idleTimeoutMillis,
      connectionTimeoutMillis: 5000, // 5 seconds
      ssl: this.config.database.ssl ? { rejectUnauthorized: false } : false,
      application_name: this.config.app.name,
    };

    this.pool = new Pool(poolConfig);

    this.logger.info(
      'Database pool initialized',
      {
        host: this.config.database.host,
        port: this.config.database.port,
        database: this.config.database.database,
        maxConnections: this.config.database.maxConnections,
        ssl: this.config.database.ssl,
      },
      'DATABASE'
    );
  }

  /**
   * Setup event handlers for the pool
   */
  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      this.stats.connectionsCreated++;
      this.stats.totalConnections++;
      
      this.logger.debug(
        'New database client connected',
        { totalConnections: this.stats.totalConnections },
        'DATABASE'
      );
    });

    this.pool.on('remove', (client) => {
      this.stats.connectionsDestroyed++;
      this.stats.totalConnections--;
      
      this.logger.debug(
        'Database client removed',
        { totalConnections: this.stats.totalConnections },
        'DATABASE'
      );
    });

    this.pool.on('error', (error, client) => {
      this.logger.error(
        'Database pool error',
        error,
        { 
          totalConnections: this.stats.totalConnections,
          isHealthy: this.stats.isHealthy 
        },
        'DATABASE'
      );
      
      this.stats.isHealthy = false;
    });

    this.pool.on('acquire', (client) => {
      this.stats.idleConnections--;
    });

    this.pool.on('release', (error, client) => {
      this.stats.idleConnections++;
      
      if (error) {
        this.logger.error(
          'Error releasing database client',
          error,
          {},
          'DATABASE'
        );
      }
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const healthCheckInterval = 30000; // 30 seconds
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, healthCheckInterval);

    this.logger.info(
      'Database health checks started',
      { intervalMs: healthCheckInterval },
      'DATABASE'
    );
  }

  /**
   * Perform database health check
   */
  public async performHealthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const result = await this.pool.query('SELECT 1 as health_check, NOW() as timestamp');
      const duration = Date.now() - startTime;

      this.stats.isHealthy = true;
      this.stats.lastHealthCheck = new Date();

      this.logger.debug(
        'Database health check passed',
        { 
          duration,
          timestamp: result.rows[0]?.timestamp,
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        },
        'DATABASE'
      );

      // Update connection stats
      this.stats.totalConnections = this.pool.totalCount;
      this.stats.idleConnections = this.pool.idleCount;
      this.stats.waitingCount = this.pool.waitingCount;

      return true;
    } catch (error) {
      this.stats.isHealthy = false;
      this.stats.lastHealthCheck = new Date();

      this.logger.error(
        'Database health check failed',
        error as Error,
        { 
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        },
        'DATABASE'
      );

      return false;
    }
  }

  /**
   * Execute a query with performance monitoring
   */
  public async query<T = any>(
    text: string,
    params?: any[],
    requestId?: string,
    userId?: string
  ): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - startTime;
      
      this.updateQueryStats(duration);
      
      this.logger.database(
        'Query executed',
        this.extractTableFromQuery(text),
        duration,
        result.rowCount || 0,
        { 
          query: this.sanitizeQuery(text),
          paramsCount: params?.length || 0,
        },
        userId,
        requestId
      );

      return result.rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(
        'Database query failed',
        error as Error,
        {
          query: this.sanitizeQuery(text),
          paramsCount: params?.length || 0,
          duration,
        },
        'DATABASE',
        requestId,
        userId
      );

      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  public async transaction<T>(
    callback: TransactionCallback<T>,
    requestId?: string,
    userId?: string
  ): Promise<T> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');
      
      this.logger.debug(
        'Transaction started',
        {},
        'DATABASE',
        requestId,
        userId
      );

      const result = await callback(client);
      
      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      
      this.logger.database(
        'Transaction committed',
        'transaction',
        duration,
        undefined,
        { status: 'committed' },
        userId,
        requestId
      );

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      this.logger.error(
        'Transaction rolled back',
        error as Error,
        { duration },
        'DATABASE',
        requestId,
        userId
      );

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for manual transaction management
   */
  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Get database statistics
   */
  public getStats(): DatabaseStats {
    return {
      ...this.stats,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Get database configuration info (sanitized)
   */
  public getInfo(): {
    host: string;
    port: number;
    database: string;
    maxConnections: number;
    ssl: boolean;
    environment: string;
  } {
    return {
      host: this.config.database.host,
      port: this.config.database.port,
      database: this.config.database.database,
      maxConnections: this.config.database.maxConnections,
      ssl: this.config.database.ssl,
      environment: this.config.app.environment,
    };
  }

  /**
   * Close all connections and stop health checks
   */
  public async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    await this.pool.end();
    
    this.logger.info(
      'Database connections closed',
      { 
        totalQueries: this.stats.totalQueries,
        averageQueryTime: this.stats.averageQueryTime,
      },
      'DATABASE'
    );
  }

  /**
   * Update query performance statistics
   */
  private updateQueryStats(duration: number): void {
    this.stats.totalQueries++;
    
    // Calculate rolling average
    const totalTime = this.stats.averageQueryTime * (this.stats.totalQueries - 1) + duration;
    this.stats.averageQueryTime = Math.round(totalTime / this.stats.totalQueries);
  }

  /**
   * Extract table name from SQL query for logging
   */
  private extractTableFromQuery(query: string): string {
    const upperQuery = query.toUpperCase().trim();
    
    // Common patterns for table extraction
    const patterns = [
      /FROM\s+(\w+)/,
      /INSERT\s+INTO\s+(\w+)/,
      /UPDATE\s+(\w+)/,
      /DELETE\s+FROM\s+(\w+)/,
    ];

    for (const pattern of patterns) {
      const match = upperQuery.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }

    return 'unknown';
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential passwords, tokens, etc.
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'")
      .substring(0, 200); // Limit length
  }
}

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
 * Get database health status for API endpoints
 */
export const getDatabaseHealth = (db: DatabaseManager): DatabaseHealthCheck => {
  const stats = db.getStats();
  const info = db.getInfo();
  
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  if (!stats.isHealthy) {
    status = 'unhealthy';
  } else if (stats.averageQueryTime > 1000 || stats.waitingCount > 5) {
    status = 'degraded';
  }

  return {
    status,
    uptime: process.uptime(),
    connections: {
      total: stats.totalConnections,
      idle: stats.idleConnections,
      waiting: stats.waitingCount,
    },
    performance: {
      averageQueryTime: stats.averageQueryTime,
      totalQueries: stats.totalQueries,
    },
    lastHealthCheck: stats.lastHealthCheck,
    environment: info.environment,
  };
}; 