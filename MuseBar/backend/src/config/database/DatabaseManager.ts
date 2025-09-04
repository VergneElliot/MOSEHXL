/**
 * Database Manager
 * Main database manager orchestrating all database operations
 */

import { PoolClient } from 'pg';
import { EnvironmentConfig } from '../environment';
import { Logger } from '../../utils/logger';
import { DatabasePool } from './DatabasePool';
import { DatabaseStatsManager } from './DatabaseStats';
import { DatabaseHealthMonitor } from './DatabaseHealthMonitor';
import { 
  DatabaseStats, 
  TransactionCallback, 
  DatabaseHealthCheck, 
  DatabaseInfo 
} from './types';

/**
 * Professional Database Manager
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private config: EnvironmentConfig;
  private logger: Logger;
  private pool: DatabasePool;
  private statsManager: DatabaseStatsManager;
  private healthMonitor: DatabaseHealthMonitor;

  private constructor(config: EnvironmentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize components
    this.pool = new DatabasePool(config, logger);
    this.statsManager = new DatabaseStatsManager(logger);
    
    // Initialize pool first
    this.pool.initialize();
    
    // Then initialize health monitor with pool
    this.healthMonitor = new DatabaseHealthMonitor(
      this.pool.getPool(), 
      logger, 
      this.statsManager
    );
    
    // Start health monitoring
    this.healthMonitor.startHealthChecks();
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
      const result = await this.pool.getPool().query(text, params);
      const duration = Date.now() - startTime;
      
      this.statsManager.logQuery(
        text,
        duration,
        result.rowCount || 0,
        params,
        userId,
        requestId
      );

      return result.rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.statsManager.logQueryError(
        text,
        error as Error,
        duration,
        params,
        userId,
        requestId
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
    const client = await this.pool.getPool().connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');
      
      this.statsManager.logTransaction('started', undefined, undefined, userId, requestId);

      const result = await callback(client);
      
      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      
      this.statsManager.logTransaction('committed', duration, undefined, userId, requestId);

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      this.statsManager.logTransaction('rolled_back', duration, error as Error, userId, requestId);

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for manual transaction management
   */
  public async getClient(): Promise<PoolClient> {
    return await this.pool.getPool().connect();
  }

  /**
   * Perform health check
   */
  public async performHealthCheck(): Promise<boolean> {
    return await this.healthMonitor.performHealthCheck();
  }

  /**
   * Get database statistics
   */
  public getStats(): DatabaseStats {
    return this.pool.getStats();
  }

  /**
   * Get database configuration info (sanitized)
   */
  public getInfo(): DatabaseInfo {
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
   * Get database health status
   */
  public getHealthStatus(): DatabaseHealthCheck {
    return this.healthMonitor.getHealthStatus(this.getInfo());
  }

  /**
   * Close all connections and stop monitoring
   */
  public async close(): Promise<void> {
    this.healthMonitor.stopHealthChecks();
    await this.pool.close();
    
    this.logger.info(
      'Database manager closed successfully',
      this.statsManager.getStats(),
      'DATABASE'
    );
  }
}
