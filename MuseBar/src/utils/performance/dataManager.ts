/**
 * Performance Data Management
 * Handles metrics storage, analytics reporting, and summary generation
 */

import { PerformanceMetric, PerformanceConfig, PerformanceSummary } from './types';

export class PerformanceDataManager {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  /**
   * Add a performance metric
   */
  addMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) return;
    
    // Sample rate check
    if (Math.random() > this.config.sampleRate) return;

    this.metrics.push(metric);

    // Keep metrics array size manageable
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-Math.floor(this.config.maxMetrics * 0.8));
    }

    // Send to analytics if configured
    if (this.config.sendToAnalytics && this.config.analyticsEndpoint) {
      this.sendToAnalytics(metric);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const apiMetrics = this.getMetricsByName('api-call');
    const loadMetrics = this.getMetricsByName('page-load-time');
    const longTasks = this.getMetricsByName('long-task');
    const layoutShifts = this.getMetricsByName('layout-shift');
    const firstInputMetrics = this.getMetricsByName('first-input-delay');

    const avgLoadTime = loadMetrics.length > 0
      ? loadMetrics.reduce((sum, m) => sum + m.value, 0) / loadMetrics.length
      : 0;

    const avgAPITime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0;

    const firstInputDelay = firstInputMetrics.length > 0
      ? firstInputMetrics[firstInputMetrics.length - 1].value
      : undefined;

    // Get memory usage if available
    let memoryUsage;
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      memoryUsage = {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      };
    }

    return {
      totalMetrics: this.metrics.length,
      avgLoadTime,
      avgAPITime,
      longTasksCount: longTasks.length,
      layoutShiftsCount: layoutShifts.length,
      firstInputDelay,
      memoryUsage,
    };
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      summary: this.getSummary(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Send metric to analytics endpoint
   */
  private async sendToAnalytics(metric: PerformanceMetric): Promise<void> {
    if (!this.config.analyticsEndpoint) return;

    try {
      await fetch(this.config.analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance-metric',
          data: metric,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      console.warn('Failed to send performance metric to analytics:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }
}
