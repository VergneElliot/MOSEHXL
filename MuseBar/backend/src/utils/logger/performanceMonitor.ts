/**
 * Performance Monitor
 * Performance monitoring and metrics collection system
 */

import { PerformanceMetric } from './types';

/**
 * Performance monitoring utility for tracking operation metrics
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static logger: any; // Will be set to Logger instance
  private static maxMetrics = 1000;

  /**
   * Initialize performance monitor with logger instance
   */
  public static initialize(logger: any): void {
    PerformanceMonitor.logger = logger;
  }

  /**
   * Start timing an operation
   * Returns a function that when called will log the duration
   */
  public static startTimer(operation: string): (metadata?: Record<string, any>) => void {
    const startTime = Date.now();
    
    return (metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
      };
      
      // Store metric
      PerformanceMonitor.addMetric(metric);
      
      // Log performance if logger is available
      if (PerformanceMonitor.logger) {
        PerformanceMonitor.logger.performance(
          `Operation completed: ${operation}`,
          duration,
          metadata,
          'PERFORMANCE'
        );
      }
    };
  }

  /**
   * Time a synchronous operation
   */
  public static time<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    const timer = PerformanceMonitor.startTimer(operation);
    const startTime = Date.now();
    
    try {
      const result = fn();
      timer({ ...metadata, success: true });
      return result;
    } catch (error) {
      timer({ 
        ...metadata, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Time an asynchronous operation
   */
  public static async timeAsync<T>(
    operation: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    const timer = PerformanceMonitor.startTimer(operation);
    
    try {
      const result = await fn();
      timer({ ...metadata, success: true });
      return result;
    } catch (error) {
      timer({ 
        ...metadata, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Add a metric to the collection
   */
  private static addMetric(metric: PerformanceMetric): void {
    PerformanceMonitor.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (PerformanceMonitor.metrics.length > PerformanceMonitor.maxMetrics) {
      PerformanceMonitor.metrics = PerformanceMonitor.metrics.slice(-PerformanceMonitor.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  public static getStats(): {
    totalOperations: number;
    averageDuration: number;
    slowestOperations: PerformanceMetric[];
    fastestOperations: PerformanceMetric[];
    operationBreakdown: Record<string, {
      count: number;
      averageDuration: number;
      totalDuration: number;
    }>;
  } {
    const total = PerformanceMonitor.metrics.length;
    const avgDuration = total > 0 
      ? PerformanceMonitor.metrics.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;
    
    const sortedMetrics = [...PerformanceMonitor.metrics].sort((a, b) => b.duration - a.duration);
    const slowest = sortedMetrics.slice(0, 10);
    const fastest = sortedMetrics.slice(-10).reverse();
    
    // Create operation breakdown
    const operationBreakdown: Record<string, {
      count: number;
      averageDuration: number;
      totalDuration: number;
    }> = {};
    
    PerformanceMonitor.metrics.forEach(metric => {
      if (!operationBreakdown[metric.operation]) {
        operationBreakdown[metric.operation] = {
          count: 0,
          averageDuration: 0,
          totalDuration: 0
        };
      }
      
      const breakdown = operationBreakdown[metric.operation];
      breakdown.count++;
      breakdown.totalDuration += metric.duration;
      breakdown.averageDuration = breakdown.totalDuration / breakdown.count;
    });
    
    return {
      totalOperations: total,
      averageDuration: Math.round(avgDuration),
      slowestOperations: slowest,
      fastestOperations: fastest,
      operationBreakdown
    };
  }

  /**
   * Get metrics for a specific operation
   */
  public static getOperationMetrics(operation: string): PerformanceMetric[] {
    return PerformanceMonitor.metrics.filter(m => m.operation === operation);
  }

  /**
   * Get metrics within a time range
   */
  public static getMetricsInTimeRange(startTime: Date, endTime: Date): PerformanceMetric[] {
    return PerformanceMonitor.metrics.filter(m => {
      const metricTime = new Date(m.timestamp);
      return metricTime >= startTime && metricTime <= endTime;
    });
  }

  /**
   * Clear all metrics
   */
  public static clearMetrics(): void {
    PerformanceMonitor.metrics = [];
  }

  /**
   * Get current metrics count
   */
  public static getMetricsCount(): number {
    return PerformanceMonitor.metrics.length;
  }

  /**
   * Set maximum number of metrics to keep in memory
   */
  public static setMaxMetrics(max: number): void {
    PerformanceMonitor.maxMetrics = max;
    
    // Trim current metrics if needed
    if (PerformanceMonitor.metrics.length > max) {
      PerformanceMonitor.metrics = PerformanceMonitor.metrics.slice(-max);
    }
  }

  /**
   * Export metrics for external analysis
   */
  public static exportMetrics(): PerformanceMetric[] {
    return [...PerformanceMonitor.metrics];
  }
}
