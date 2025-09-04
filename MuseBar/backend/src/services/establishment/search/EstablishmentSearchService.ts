/**
 * Establishment Search Service
 * Handles establishment search, filtering, and pagination
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { EstablishmentStatus } from '../types';

/**
 * Search filters interface
 */
export interface EstablishmentSearchFilters {
  name?: string;
  email?: string;
  status?: EstablishmentStatus;
  business_type?: string;
  subscription_plan?: string;
  created_after?: Date;
  created_before?: Date;
  setup_progress_min?: number;
  setup_progress_max?: number;
}

/**
 * Search options interface
 */
export interface SearchOptions {
  page: number;
  limit: number;
  sortBy: 'name' | 'created_at' | 'status' | 'setup_progress';
  sortOrder: 'asc' | 'desc';
}

/**
 * Search result interface
 */
export interface EstablishmentSearchResult {
  establishments: any[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Establishment Search Service Class
 * Single responsibility: Search and filter establishments
 */
export class EstablishmentSearchService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Search establishments with filters and pagination
   */
  public async searchEstablishments(
    client: PoolClient,
    filters: EstablishmentSearchFilters,
    options: SearchOptions
  ): Promise<EstablishmentSearchResult> {
    try {
      // Build search query
      const { query, params } = this.buildSearchQuery(filters, options);
      
      // Get total count
      const countQuery = this.buildCountQuery(filters);
      const countResult = await client.query(countQuery.query, countQuery.params);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const results = await client.query(query, params);
      
      // Calculate pagination info
      const totalPages = Math.ceil(total / options.limit);
      const hasNext = options.page < totalPages;
      const hasPrevious = options.page > 1;

      return {
        establishments: results.rows,
        total,
        page: options.page,
        totalPages,
        hasNext,
        hasPrevious
      };

    } catch (error) {
      this.logger.error(
        'Failed to search establishments',
        { error: error as Error, filters, options },
        'ESTABLISHMENT_SEARCH_SERVICE'
      );
      throw error;
    }
  }

  /**
   * Build search query with filters
   */
  private buildSearchQuery(
    filters: EstablishmentSearchFilters,
    options: SearchOptions
  ): { query: string; params: any[] } {
    let query = `
      SELECT 
        e.*,
        COALESCE(esp.progress_percentage, 0) as setup_progress,
        COALESCE(esp.status, 'not_started') as setup_status
      FROM establishments e
      LEFT JOIN establishment_setup_progress esp ON e.id = esp.establishment_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add filters
    if (filters.name) {
      query += ` AND LOWER(e.name) LIKE LOWER($${paramIndex})`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }

    if (filters.email) {
      query += ` AND LOWER(e.email) LIKE LOWER($${paramIndex})`;
      params.push(`%${filters.email}%`);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.business_type) {
      query += ` AND e.business_type = $${paramIndex}`;
      params.push(filters.business_type);
      paramIndex++;
    }

    if (filters.subscription_plan) {
      query += ` AND e.subscription_plan = $${paramIndex}`;
      params.push(filters.subscription_plan);
      paramIndex++;
    }

    if (filters.created_after) {
      query += ` AND e.created_at >= $${paramIndex}`;
      params.push(filters.created_after);
      paramIndex++;
    }

    if (filters.created_before) {
      query += ` AND e.created_at <= $${paramIndex}`;
      params.push(filters.created_before);
      paramIndex++;
    }

    if (filters.setup_progress_min !== undefined) {
      query += ` AND COALESCE(esp.progress_percentage, 0) >= $${paramIndex}`;
      params.push(filters.setup_progress_min);
      paramIndex++;
    }

    if (filters.setup_progress_max !== undefined) {
      query += ` AND COALESCE(esp.progress_percentage, 0) <= $${paramIndex}`;
      params.push(filters.setup_progress_max);
      paramIndex++;
    }

    // Add sorting
    const sortColumn = this.getSortColumn(options.sortBy);
    query += ` ORDER BY ${sortColumn} ${options.sortOrder.toUpperCase()}`;

    // Add pagination
    const offset = (options.page - 1) * options.limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(options.limit, offset);

    return { query, params };
  }

  /**
   * Build count query for total results
   */
  private buildCountQuery(filters: EstablishmentSearchFilters): { query: string; params: any[] } {
    let query = `
      SELECT COUNT(*) as count
      FROM establishments e
      LEFT JOIN establishment_setup_progress esp ON e.id = esp.establishment_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add same filters as search query
    if (filters.name) {
      query += ` AND LOWER(e.name) LIKE LOWER($${paramIndex})`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }

    if (filters.email) {
      query += ` AND LOWER(e.email) LIKE LOWER($${paramIndex})`;
      params.push(`%${filters.email}%`);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.business_type) {
      query += ` AND e.business_type = $${paramIndex}`;
      params.push(filters.business_type);
      paramIndex++;
    }

    if (filters.subscription_plan) {
      query += ` AND e.subscription_plan = $${paramIndex}`;
      params.push(filters.subscription_plan);
      paramIndex++;
    }

    if (filters.created_after) {
      query += ` AND e.created_at >= $${paramIndex}`;
      params.push(filters.created_after);
      paramIndex++;
    }

    if (filters.created_before) {
      query += ` AND e.created_at <= $${paramIndex}`;
      params.push(filters.created_before);
      paramIndex++;
    }

    if (filters.setup_progress_min !== undefined) {
      query += ` AND COALESCE(esp.progress_percentage, 0) >= $${paramIndex}`;
      params.push(filters.setup_progress_min);
      paramIndex++;
    }

    if (filters.setup_progress_max !== undefined) {
      query += ` AND COALESCE(esp.progress_percentage, 0) <= $${paramIndex}`;
      params.push(filters.setup_progress_max);
      paramIndex++;
    }

    return { query, params };
  }

  /**
   * Get sort column for query
   */
  private getSortColumn(sortBy: string): string {
    switch (sortBy) {
      case 'name':
        return 'e.name';
      case 'created_at':
        return 'e.created_at';
      case 'status':
        return 'e.status';
      case 'setup_progress':
        return 'COALESCE(esp.progress_percentage, 0)';
      default:
        return 'e.created_at';
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  public async getSearchSuggestions(
    client: PoolClient,
    query: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const sql = `
        SELECT DISTINCT name 
        FROM establishments 
        WHERE LOWER(name) LIKE LOWER($1)
        ORDER BY name
        LIMIT $2
      `;

      const result = await client.query(sql, [`%${query}%`, limit]);
      return result.rows.map(row => row.name);

    } catch (error) {
      this.logger.error(
        'Failed to get search suggestions',
        { error: error as Error, query },
        'ESTABLISHMENT_SEARCH_SERVICE'
      );
      return [];
    }
  }
}
