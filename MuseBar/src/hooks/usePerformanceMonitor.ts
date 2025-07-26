import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastUpdate: number;
}

interface PerformanceConfig {
  enabled: boolean;
  logToConsole: boolean;
  sendToAnalytics: boolean;
  threshold: number; // ms threshold for slow renders
}

const defaultConfig: PerformanceConfig = {
  enabled: process.env.NODE_ENV === 'development',
  logToConsole: true,
  sendToAnalytics: false,
  threshold: 16 // 16ms = 60fps
};

export const usePerformanceMonitor = (
  componentName: string,
  config: Partial<PerformanceConfig> = {}
) => {
  const mergedConfig = { ...defaultConfig, ...config };
  const metricsRef = useRef<PerformanceMetrics>({
    componentName,
    renderTime: 0,
    mountTime: Date.now(),
    updateCount: 0,
    lastUpdate: Date.now()
  });

  const startRender = useCallback(() => {
    if (!mergedConfig.enabled) return;
    return performance.now();
  }, [mergedConfig.enabled]);

  const endRender = useCallback((startTime: number) => {
    if (!mergedConfig.enabled) return;
    
    const renderTime = performance.now() - startTime;
    const metrics = metricsRef.current;
    
    metrics.renderTime = renderTime;
    metrics.updateCount++;
    metrics.lastUpdate = Date.now();

    // Log slow renders
    if (renderTime > mergedConfig.threshold) {
      const message = `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`;
      
      if (mergedConfig.logToConsole) {
        console.warn(message, {
          component: componentName,
          renderTime,
          threshold: mergedConfig.threshold,
          updateCount: metrics.updateCount,
          totalTime: Date.now() - metrics.mountTime
        });
      }

      // Send to analytics if configured
      if (mergedConfig.sendToAnalytics) {
        // Example: send to analytics service
        // analytics.track('slow_render', { component: componentName, renderTime });
      }
    }

    // Log all renders in development
    if (mergedConfig.logToConsole && process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }
  }, [componentName, mergedConfig]);

  const trackOperation = useCallback((operationName: string, operation: () => void) => {
    if (!mergedConfig.enabled) {
      operation();
      return;
    }

    const startTime = performance.now();
    operation();
    const duration = performance.now() - startTime;

    if (duration > mergedConfig.threshold) {
      console.warn(`🐌 Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
    }
  }, [mergedConfig]);

  const trackAsyncOperation = useCallback(async <T>(
    operationName: string, 
    operation: () => Promise<T>
  ): Promise<T> => {
    if (!mergedConfig.enabled) {
      return operation();
    }

    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      if (duration > mergedConfig.threshold) {
        console.warn(`🐌 Slow async operation: ${operationName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Failed operation: ${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }, [mergedConfig]);

  // Track component lifecycle
  useEffect(() => {
    if (!mergedConfig.enabled) return;

    const mountTime = Date.now();
    metricsRef.current.mountTime = mountTime;

    if (mergedConfig.logToConsole) {
      console.log(`🚀 ${componentName} mounted at ${new Date(mountTime).toISOString()}`);
    }

    return () => {
      const totalTime = Date.now() - mountTime;
      const metrics = metricsRef.current;

      if (mergedConfig.logToConsole) {
        console.log(`🔄 ${componentName} unmounted after ${totalTime}ms (${metrics.updateCount} updates)`);
      }
    };
  }, [componentName, mergedConfig]);

  return {
    startRender,
    endRender,
    trackOperation,
    trackAsyncOperation,
    getMetrics: () => ({ ...metricsRef.current }),
    isEnabled: mergedConfig.enabled
  };
};

// Hook for tracking expensive operations
export const useExpensiveOperation = (operationName: string) => {
  const { trackOperation, trackAsyncOperation } = usePerformanceMonitor(operationName);

  return {
    track: trackOperation,
    trackAsync: trackAsyncOperation
  };
};

// Hook for tracking API calls
export const useAPIPerformance = () => {
  const { trackAsyncOperation } = usePerformanceMonitor('API');

  const trackAPICall = useCallback(async <T>(
    endpoint: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return trackAsyncOperation(`API: ${endpoint}`, operation);
  }, [trackAsyncOperation]);

  return { trackAPICall };
}; 