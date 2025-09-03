/**
 * Custom Jest Matchers and Performance Utilities
 * Provides custom Jest matchers and performance testing utilities
 */

/**
 * Custom Jest matchers for enhanced testing
 */
export const customMatchers = {
  /**
   * Check if element has specific CSS class
   */
  toHaveClass: (received: Element, className: string) => {
    const pass = received.classList.contains(className);
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have class "${className}"`
          : `Expected element to have class "${className}"`,
    };
  },

  /**
   * Check if element is visible
   */
  toBeVisible: (received: Element) => {
    const pass = (received as HTMLElement).offsetParent !== null;
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be visible`
          : `Expected element to be visible`,
    };
  },

  /**
   * Check if value is within range
   */
  toBeWithinRange: (received: number, floor: number, ceiling: number) => {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${floor} - ${ceiling}`
          : `Expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
};

/**
 * Performance testing utilities
 */
export const performanceUtils = {
  /**
   * Measure render time
   */
  measureRenderTime: async (renderFn: () => Promise<any>) => {
    const start = performance.now();
    await renderFn();
    const end = performance.now();
    return end - start;
  },

  /**
   * Check if render is under time threshold
   */
  expectRenderTimeUnder: async (renderFn: () => Promise<any>, maxTime: number) => {
    const renderTime = await performanceUtils.measureRenderTime(renderFn);
    expect(renderTime).toBeLessThan(maxTime);
    return renderTime;
  },

  /**
   * Monitor memory usage during test
   */
  monitorMemory: () => {
    const perfWithMemory = performance as any;
    if (perfWithMemory.memory) {
      return {
        usedJSHeapSize: perfWithMemory.memory.usedJSHeapSize,
        totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
        jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};

/**
 * Generate test data with various patterns
 */
export const generateTestData = {
  /**
   * Generate large dataset for performance testing
   */
  largeDataset: (count: number = 1000) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      name: `Item ${index}`,
      value: Math.random() * 100,
      category: `category-${index % 10}`,
      createdAt: new Date(Date.now() - Math.random() * 10000000000),
    }));
  },

  /**
   * Generate paginated data
   */
  paginatedData: (totalItems: number, pageSize: number = 10) => {
    const data = generateTestData.largeDataset(totalItems);
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return (page: number) => ({
      data: data.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        total: totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    });
  },

  /**
   * Generate error scenarios
   */
  errorScenarios: () => [
    { code: 400, message: 'Bad Request' },
    { code: 401, message: 'Unauthorized' },
    { code: 403, message: 'Forbidden' },
    { code: 404, message: 'Not Found' },
    { code: 500, message: 'Internal Server Error' },
  ],
};
