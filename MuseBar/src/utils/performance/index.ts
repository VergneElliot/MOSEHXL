/**
 * Performance Monitor Index
 * Aggregates all performance monitoring modules and provides main class
 */

import { PerformanceConfig, DEFAULT_CONFIG } from './types';
import { PerformanceObservers } from './observers';
import { PerformanceMeasurements } from './measurements';
import { PerformanceDataManager } from './dataManager';

export * from './types';

class PerformanceMonitor {
  private dataManager: PerformanceDataManager;
  private observers: PerformanceObservers;
  private measurements: PerformanceMeasurements;

  constructor(config: Partial<PerformanceConfig> = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    
    this.dataManager = new PerformanceDataManager(fullConfig);
    this.observers = new PerformanceObservers(this.dataManager.addMetric.bind(this.dataManager));
    this.measurements = new PerformanceMeasurements(this.dataManager.addMetric.bind(this.dataManager));

    if (fullConfig.enabled) {
      this.observers.initializeObservers();
    }
  }

  // Delegate methods to appropriate modules
  addMetric = (metric: any) => this.dataManager.addMetric(metric);
  getMetrics = () => this.dataManager.getMetrics();
  getMetricsByName = (name: string) => this.dataManager.getMetricsByName(name);
  clearMetrics = () => this.dataManager.clearMetrics();
  getSummary = () => this.dataManager.getSummary();
  exportMetrics = () => this.dataManager.exportMetrics();
  updateConfig = (config: any) => this.dataManager.updateConfig(config);
  getConfig = () => this.dataManager.getConfig();

  measureFunction = <T>(name: string, fn: () => Promise<T>) => this.measurements.measureFunction(name, fn);
  measureFunctionSync = <T>(name: string, fn: () => T) => this.measurements.measureFunctionSync(name, fn);
  measureAPICall = <T>(endpoint: string, apiCall: () => Promise<T>) => this.measurements.measureAPICall(endpoint, apiCall);
  mark = (name: string, value?: number, metadata?: Record<string, any>) => this.measurements.mark(name, value, metadata);
  measureBetweenMarks = (startMark: string, endMark: string, name?: string) => this.measurements.measureBetweenMarks(startMark, endMark, name);

  disconnect = () => this.observers.disconnect();
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export const usePerformanceMonitor = () => {
  return {
    addMetric: performanceMonitor.addMetric,
    measureFunction: performanceMonitor.measureFunction,
    measureFunctionSync: performanceMonitor.measureFunctionSync,
    measureAPICall: performanceMonitor.measureAPICall,
    getSummary: performanceMonitor.getSummary,
    getMetrics: performanceMonitor.getMetrics,
    clearMetrics: performanceMonitor.clearMetrics,
    exportMetrics: performanceMonitor.exportMetrics,
    mark: performanceMonitor.mark,
    measureBetweenMarks: performanceMonitor.measureBetweenMarks,
  };
};
