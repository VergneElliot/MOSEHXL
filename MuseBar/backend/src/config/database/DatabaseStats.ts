/**
 * Database Statistics Manager
 * Handles performance monitoring, query tracking, and statistics calculation
 */

import { Logger } from '../../utils/logger';
import { DatabaseStats, QueryContext } from './types';

/**
 * Database statistics and performance monitor
 */
export class DatabaseStatsManager {
  private stats: DatabaseStats;
  private logger: Logger;

  constructor(logger: Logger) {
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
   * Update query performance statistics
   */
  public updateQueryStats(duration: number): void {
    this.stats.totalQueries++;
    
    // Calculate rolling average
    const totalTime = this.stats.averageQueryTime * (this.stats.totalQueries - 1) + duration;
    this.stats.averageQueryTime = Math.round(totalTime / this.stats.totalQueries);
  }

  /**
   * Log successful query execution
   */
  public logQuery(
    query: string,
    duration: number,
    rowCount: number,
    params?: any[],
    userId?: number,
    requestId?: string
  ): void {
    this.updateQueryStats(duration);
    
    this.logger.database(
      'Query executed',
      this.extractTableFromQuery(query),
      duration,
      rowCount,
      { 
        query: this.sanitizeQuery(query),
        paramsCount: params?.length || 0,
      },
      requestId,
      userId
    );
  }

  /**
   * Log failed query execution
   */
  public logQueryError(
    query: string,
    error: Error,
    duration: number,
    params?: any[],
    userId?: number,
    requestId?: string
  ): void {
    this.logger.error(
      'Database query failed',
      {
        error: error,
        query: this.sanitizeQuery(query),
        paramsCount: params?.length || 0,
        duration,
      },
      'DATABASE',
      requestId,
      userId
    );
  }

  /**
   * Log transaction operations
   */
  public logTransaction(
    type: 'started' | 'committed' | 'rolled_back',
    duration?: number,
    error?: Error,
    userId?: number,
    requestId?: string
  ): void {
    if (type === 'started') {
      this.logger.debug(
        'Transaction started',
        {},
        'DATABASE',
        requestId,
        userId
      );
    } else if (type === 'committed') {
      this.logger.database(
        'Transaction committed',
        'transaction',
        duration || 0,
        undefined,
        { status: 'committed' },
        requestId,
        userId
      );
    } else if (type === 'rolled_back' && error) {
      this.logger.error(
        'Transaction rolled back',
        { 
          error: error,
          duration: duration || 0 
        },
        'DATABASE',
        requestId,
        userId
      );
    }
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

  /**
   * Get current statistics
   */
  public getStats(): DatabaseStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  public updateStats(updates: Partial<DatabaseStats>): void {
    Object.assign(this.stats, updates);
  }
}
