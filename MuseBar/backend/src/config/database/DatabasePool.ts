/**
 * Database Connection Pool Manager
 * Handles connection pool initialization, configuration, and event management
 */

import { Pool, PoolConfig } from 'pg';
import { EnvironmentConfig } from '../environment';
import { Logger } from '../../utils/logger';
import { DatabaseStats } from './types';

/**
 * Database connection pool manager
 */
export class DatabasePool {
  private pool!: Pool; // Definite assignment assertion - initialized in initialize()
  private config: EnvironmentConfig;
  private logger: Logger;
  private stats: DatabaseStats;

  constructor(config: EnvironmentConfig, logger: Logger) {
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
  }

  /**
   * Initialize the connection pool
   */
  public initialize(): void {
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
    this.setupEventHandlers();

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
   * Get the connection pool
   */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Get current statistics
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
   * Update statistics
   */
  public updateStats(updates: Partial<DatabaseStats>): void {
    Object.assign(this.stats, updates);
  }

  /**
   * Close the connection pool
   */
  public async close(): Promise<void> {
    await this.pool.end();
    
    this.logger.info(
      'Database connection pool closed',
      { 
        totalQueries: this.stats.totalQueries,
        averageQueryTime: this.stats.averageQueryTime,
      },
      'DATABASE'
    );
  }
}
