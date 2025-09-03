/**
 * Performance Measurement Utilities
 * Functions for measuring performance of functions and API calls
 */

import { PerformanceMetric } from './types';

export class PerformanceMeasurements {
  private addMetric: (metric: PerformanceMetric) => void;

  constructor(addMetricCallback: (metric: PerformanceMetric) => void) {
    this.addMetric = addMetricCallback;
  }

  /**
   * Measure the execution time of an async function
   */
  async measureFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      
      this.addMetric({
        name: `function-${name}`,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { status: 'success' },
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.addMetric({
        name: `function-${name}`,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      throw error;
    }
  }

  /**
   * Measure the execution time of a synchronous function
   */
  measureFunctionSync<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const endTime = performance.now();
      
      this.addMetric({
        name: `function-sync-${name}`,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { status: 'success' },
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.addMetric({
        name: `function-sync-${name}`,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
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
      const endTime = performance.now();
      
      this.addMetric({
        name: 'api-call',
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { 
          endpoint, 
          status: 'success',
          timestamp: new Date().toISOString(),
        },
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.addMetric({
        name: 'api-call',
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { 
          endpoint, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      });
      
      throw error;
    }
  }

  /**
   * Mark a custom performance point
   */
  mark(name: string, value?: number, metadata?: Record<string, any>): void {
    this.addMetric({
      name: `mark-${name}`,
      value: value || performance.now(),
      unit: 'ms',
      timestamp: Date.now(),
      metadata,
    });
  }

  /**
   * Measure time between two marks
   */
  measureBetweenMarks(startMark: string, endMark: string, name?: string): void {
    try {
      performance.measure(name || `${startMark}-to-${endMark}`, startMark, endMark);
      const measure = performance.getEntriesByName(name || `${startMark}-to-${endMark}`)[0];
      
      if (measure) {
        this.addMetric({
          name: `measure-${name || `${startMark}-to-${endMark}`}`,
          value: measure.duration,
          unit: 'ms',
          timestamp: Date.now(),
          metadata: { startMark, endMark },
        });
      }
    } catch (error) {
      console.warn('Failed to measure between marks:', error);
    }
  }
}
