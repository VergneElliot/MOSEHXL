/**
 * Database Health Monitor
 * Handles health checks, monitoring, and status reporting
 */

import { Pool } from 'pg';
import { Logger } from '../../utils/logger';
import { DatabaseStats, DatabaseHealthCheck, DatabaseInfo } from './types';

/**
 * Database health monitoring service
 */
export class DatabaseHealthMonitor {
  private pool: Pool;
  private logger: Logger;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private statsManager: any; // We'll inject the stats manager

  constructor(pool: Pool, logger: Logger, statsManager: any) {
    this.pool = pool;
    this.logger = logger;
    this.statsManager = statsManager;
  }

  /**
   * Start periodic health checks
   */
  public startHealthChecks(): void {
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
   * Stop health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      
      this.logger.info('Database health checks stopped', {}, 'DATABASE');
    }
  }

  /**
   * Perform database health check
   */
  public async performHealthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const result = await this.pool.query('SELECT 1 as health_check, NOW() as timestamp');
      const duration = Date.now() - startTime;

      // Update stats
      const stats = this.statsManager.getStats();
      this.statsManager.updateStats({
        isHealthy: true,
        lastHealthCheck: new Date(),
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      });

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

      return true;
    } catch (error) {
      this.statsManager.updateStats({
        isHealthy: false,
        lastHealthCheck: new Date(),
      });

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
   * Get database health status for API endpoints
   */
  public getHealthStatus(info: DatabaseInfo): DatabaseHealthCheck {
    const stats = this.statsManager.getStats();
    
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
  }

  /**
   * Check if database is currently healthy
   */
  public isHealthy(): boolean {
    return this.statsManager.getStats().isHealthy;
  }
}
