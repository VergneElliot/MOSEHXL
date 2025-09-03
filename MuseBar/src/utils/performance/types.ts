/**
 * Performance Monitoring Types
 * Type definitions and interfaces for performance monitoring
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of events to track
  maxMetrics: number; // Maximum number of metrics to keep in memory
  sendToAnalytics: boolean;
  analyticsEndpoint?: string;
}

export interface PerformanceSummary {
  totalMetrics: number;
  avgLoadTime: number;
  avgAPITime: number;
  longTasksCount: number;
  layoutShiftsCount: number;
  firstInputDelay?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: process.env.NODE_ENV === 'development',
  sampleRate: 0.1, // 10% by default
  maxMetrics: 1000,
  sendToAnalytics: false,
};
