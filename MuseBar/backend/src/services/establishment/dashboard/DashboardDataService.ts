/**
 * Dashboard Data Service
 * Provides dashboard metrics and data for system admin interface
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';

/**
 * Dashboard metrics interface
 */
export interface DashboardMetrics {
  establishments: {
    total: number;
    active: number;
    pending_setup: number;
    setup_in_progress: number;
    suspended: number;
    cancelled: number;
  };
  setupProgress: {
    completed: number;
    in_progress: number;
    not_started: number;
    stalled: number;
  };
  recentActivity: {
    created_today: number;
    status_changes_today: number;
    setup_completions_today: number;
  };
  performance: {
    avg_setup_time_hours: number;
    completion_rate_percentage: number;
    active_establishments_percentage: number;
  };
}

/**
 * Dashboard Data Service Class
 * Single responsibility: Provide dashboard metrics and data
 */
export class DashboardDataService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Get comprehensive dashboard metrics
   */
  public async getDashboardMetrics(client: PoolClient): Promise<DashboardMetrics> {
    try {
      const [establishmentMetrics, setupMetrics, activityMetrics, performanceMetrics] = await Promise.all([
        this.getEstablishmentMetrics(client),
        this.getSetupProgressMetrics(client),
        this.getRecentActivityMetrics(client),
        this.getPerformanceMetrics(client)
      ]);

      return {
        establishments: establishmentMetrics,
        setupProgress: setupMetrics,
        recentActivity: activityMetrics,
        performance: performanceMetrics
      };

    } catch (error) {
      this.logger.error(
        'Failed to get dashboard metrics',
        { error: error as Error },
        'DASHBOARD_DATA_SERVICE'
      );
      throw error;
    }
  }

  /**
   * Get establishment status metrics
   */
  private async getEstablishmentMetrics(client: PoolClient): Promise<DashboardMetrics['establishments']> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'pending_setup' THEN 1 END) as pending_setup,
        COUNT(CASE WHEN status = 'setup_in_progress' THEN 1 END) as setup_in_progress,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM establishments
    `;

    const result = await client.query(query);
    const row = result.rows[0] ?? {};

    return {
      total: parseInt(String((row as Record<string, unknown>).total ?? '0'), 10),
      active: parseInt(String((row as Record<string, unknown>).active ?? '0'), 10),
      pending_setup: parseInt(String((row as Record<string, unknown>).pending_setup ?? '0'), 10),
      setup_in_progress: parseInt(String((row as Record<string, unknown>).setup_in_progress ?? '0'), 10),
      suspended: parseInt(String((row as Record<string, unknown>).suspended ?? '0'), 10),
      cancelled: parseInt(String((row as Record<string, unknown>).cancelled ?? '0'), 10)
    };
  }

  /**
   * Get setup progress metrics
   */
  private async getSetupProgressMetrics(client: PoolClient): Promise<DashboardMetrics['setupProgress']> {
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started,
        COUNT(CASE WHEN status = 'stalled' THEN 1 END) as stalled
      FROM establishment_setup_progress
    `;

    const result = await client.query(query);
    const row = result.rows[0] ?? {};

    return {
      completed: parseInt(String((row as Record<string, unknown>).completed ?? '0'), 10),
      in_progress: parseInt(String((row as Record<string, unknown>).in_progress ?? '0'), 10),
      not_started: parseInt(String((row as Record<string, unknown>).not_started ?? '0'), 10),
      stalled: parseInt(String((row as Record<string, unknown>).stalled ?? '0'), 10)
    };
  }

  /**
   * Get recent activity metrics
   */
  private async getRecentActivityMetrics(client: PoolClient): Promise<DashboardMetrics['recentActivity']> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queries = [
      // Establishments created today
      {
        query: 'SELECT COUNT(*) as count FROM establishments WHERE created_at >= $1',
        params: [today]
      },
      // Status changes today
      {
        query: 'SELECT COUNT(*) as count FROM establishment_status_transitions WHERE created_at >= $1',
        params: [today]
      },
      // Setup completions today
      {
        query: 'SELECT COUNT(*) as count FROM establishment_setup_progress WHERE status = \'completed\' AND last_updated >= $1',
        params: [today]
      }
    ];

    const results = await Promise.all(
      queries.map(q => client.query(q.query, q.params))
    );

    return {
      created_today: parseInt(String(results[0]?.rows[0]?.count ?? '0'), 10),
      status_changes_today: parseInt(String(results[1]?.rows[0]?.count ?? '0'), 10),
      setup_completions_today: parseInt(String(results[2]?.rows[0]?.count ?? '0'), 10)
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(client: PoolClient): Promise<DashboardMetrics['performance']> {
    const queries = [
      // Average setup time
      {
        query: `
          SELECT AVG(EXTRACT(EPOCH FROM (last_updated - created_at))/3600) as avg_hours
          FROM establishment_setup_progress 
          WHERE status = 'completed'
        `
      },
      // Completion rate
      {
        query: `
          SELECT 
            ROUND(
              (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
               COUNT(*)::DECIMAL) * 100, 2
            ) as completion_rate
          FROM establishment_setup_progress
        `
      },
      // Active establishments percentage
      {
        query: `
          SELECT 
            ROUND(
              (COUNT(CASE WHEN status = 'active' THEN 1 END)::DECIMAL / 
               COUNT(*)::DECIMAL) * 100, 2
            ) as active_percentage
          FROM establishments
        `
      }
    ];

    const results = await Promise.all(
      queries.map(q => client.query(q.query))
    );

    return {
      avg_setup_time_hours: parseFloat(String(results[0]?.rows[0]?.avg_hours ?? '0')) || 0,
      completion_rate_percentage: parseFloat(String(results[1]?.rows[0]?.completion_rate ?? '0')) || 0,
      active_establishments_percentage: parseFloat(String(results[2]?.rows[0]?.active_percentage ?? '0')) || 0
    };
  }
}
