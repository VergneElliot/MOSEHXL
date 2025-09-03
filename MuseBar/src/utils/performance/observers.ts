/**
 * Performance Observers
 * Handles all performance observation and data collection
 */

import { PerformanceMetric } from './types';

export class PerformanceObservers {
  private observers: Map<string, PerformanceObserver> = new Map();
  private addMetric: (metric: PerformanceMetric) => void;

  constructor(addMetricCallback: (metric: PerformanceMetric) => void) {
    this.addMetric = addMetricCallback;
  }

  /**
   * Initialize all performance observers
   */
  initializeObservers(): void {
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
      this.addMetric({
        name: 'page-load-time',
        value: navigation.loadEventEnd - navigation.fetchStart,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstByte: navigation.responseStart - navigation.fetchStart,
        },
      });
    }
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        this.addMetric({
          name: 'resource-load-time',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          metadata: { name: entry.name, type: (entry as any).initiatorType },
        });
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', observer);
  }

  /**
   * Observe long tasks (blocking main thread)
   */
  private observeLongTasks(): void {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        this.addMetric({
          name: 'long-task',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
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
        this.addMetric({
          name: 'layout-shift',
          value: (entry as any).value,
          unit: 'score',
          timestamp: Date.now(),
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
        this.addMetric({
          name: 'first-input-delay',
          value: (entry as any).processingStart - entry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
        });
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.set('first-input', observer);
  }

  /**
   * Disconnect all observers
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}
