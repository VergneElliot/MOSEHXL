interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of events to track
  maxMetrics: number; // Maximum number of metrics to keep in memory
  sendToAnalytics: boolean;
  analyticsEndpoint?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig;
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development' || config.enabled || false,
      sampleRate: config.sampleRate || 0.1, // 10% by default
      maxMetrics: config.maxMetrics || 1000,
      sendToAnalytics: config.sendToAnalytics || false,
      analyticsEndpoint: config.analyticsEndpoint,
    };

    if (this.config.enabled) {
      this.initializeObservers();
    }
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    // Navigation timing
    if ('PerformanceNavigationTiming' in window) {
      this.observeNavigationTiming();
    }

    // Resource timing
    if ('PerformanceResourceTiming' in window) {
      this.observeResourceTiming();
    }

    // Long tasks
    if ('PerformanceObserver' in window) {
      this.observeLongTasks();
    }

    // Layout shifts
    if ('PerformanceObserver' in window) {
      this.observeLayoutShifts();
    }

    // First input delay
    if ('PerformanceObserver' in window) {
      this.observeFirstInput();
    }
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.addMetric(
        'navigation.domContentLoaded',
        navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        'ms'
      );
      this.addMetric(
        'navigation.loadComplete',
        navigation.loadEventEnd - navigation.loadEventStart,
        'ms'
      );
      this.addMetric('navigation.totalTime', navigation.loadEventEnd - navigation.fetchStart, 'ms');
    }
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        const resourceEntry = entry as PerformanceResourceTiming;
        this.addMetric(
          'resource.loadTime',
          resourceEntry.responseEnd - resourceEntry.requestStart,
          'ms',
          {
            name: resourceEntry.name,
            type: resourceEntry.initiatorType,
          }
        );
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', observer);
  }

  /**
   * Observe long tasks
   */
  private observeLongTasks(): void {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        const longTask = entry as PerformanceEntry;
        this.addMetric('longTask.duration', longTask.duration, 'ms', {
          startTime: longTask.startTime,
        });
      });
    });

    observer.observe({ entryTypes: ['longtask'] });
    this.observers.set('longtask', observer);
  }

  /**
   * Observe layout shifts
   */
  private observeLayoutShifts(): void {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        const layoutShift = entry as any;
        this.addMetric('layoutShift.score', layoutShift.value, 'score', {
          sources: layoutShift.sources,
        });
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('layout-shift', observer);
  }

  /**
   * Observe first input delay
   */
  private observeFirstInput(): void {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        const firstInput = entry as any;
        this.addMetric('firstInput.delay', firstInput.processingStart - firstInput.startTime, 'ms');
        this.addMetric(
          'firstInput.processingTime',
          firstInput.processingEnd - firstInput.processingStart,
          'ms'
        );
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.set('first-input', observer);
  }

  /**
   * Add a custom metric
   */
  addMetric(name: string, value: number, unit: string, metadata?: Record<string, any>): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the latest metrics
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    // Send to analytics if configured
    if (this.config.sendToAnalytics && this.config.analyticsEndpoint) {
      this.sendToAnalytics(metric);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance Metric: ${name} = ${value}${unit}`, metadata);
    }
  }

  /**
   * Measure function execution time
   */
  async measureFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.addMetric(`function.${name}`, duration, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addMetric(`function.${name}.error`, duration, 'ms');
      throw error;
    }
  }

  /**
   * Measure synchronous function execution time
   */
  measureFunctionSync<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.addMetric(`function.${name}`, duration, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addMetric(`function.${name}.error`, duration, 'ms');
      throw error;
    }
  }

  /**
   * Measure API call performance
   */
  async measureAPICall<T>(endpoint: string, apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      this.addMetric(`api.${endpoint}`, duration, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addMetric(`api.${endpoint}.error`, duration, 'ms');
      throw error;
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    // Group metrics by name
    const groupedMetrics = this.metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = [];
        }
        acc[metric.name].push(metric.value);
        return acc;
      },
      {} as Record<string, number[]>
    );

    // Calculate statistics for each metric
    Object.entries(groupedMetrics).forEach(([name, values]) => {
      const sorted = values.sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / count;
      const median = sorted[Math.floor(count / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p95 = sorted[Math.floor(count * 0.95)];

      summary[name] = {
        count,
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
      };
    });

    return summary;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Send metric to analytics
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
          ...metric,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send performance metric to analytics:', error);
    }
  }

  /**
   * Disconnect all observers
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export const usePerformanceMonitor = () => {
  return {
    addMetric: performanceMonitor.addMetric.bind(performanceMonitor),
    measureFunction: performanceMonitor.measureFunction.bind(performanceMonitor),
    measureFunctionSync: performanceMonitor.measureFunctionSync.bind(performanceMonitor),
    measureAPICall: performanceMonitor.measureAPICall.bind(performanceMonitor),
    getSummary: performanceMonitor.getSummary.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor),
  };
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.disconnect();
  });
}
