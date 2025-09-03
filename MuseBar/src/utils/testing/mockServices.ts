/**
 * Mock Services and API Responses
 * Provides mock API responses and service utilities for testing
 */

/**
 * Mock API responses with realistic structure
 */
export const mockApiResponses = {
  success: (data: any) => ({
    data,
    message: 'Success',
    timestamp: new Date().toISOString(),
  }),

  error: (message: string = 'An error occurred', code: number = 500) => ({
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
    },
  }),

  pagination: (data: any[], page: number = 1, pageSize: number = 10, total?: number) => ({
    data: data.slice((page - 1) * pageSize, page * pageSize),
    pagination: {
      page,
      pageSize,
      total: total || data.length,
      totalPages: Math.ceil((total || data.length) / pageSize),
      hasNext: page * pageSize < (total || data.length),
      hasPrevious: page > 1,
    },
  }),
};

/**
 * Mock fetch implementation for testing API calls
 */
export const mockFetch = (responses: Array<{ url?: string; response: any; status?: number }>) => {
  const mockFn = jest.fn();
  
  responses.forEach((response, index) => {
    const call = response.url 
      ? mockFn.mockImplementationOnce((url: string) => {
          if (url.includes(response.url!)) {
            return Promise.resolve({
              ok: (response.status || 200) < 400,
              status: response.status || 200,
              json: () => Promise.resolve(response.response),
            });
          }
          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        })
      : mockFn.mockResolvedValueOnce({
          ok: (response.status || 200) < 400,
          status: response.status || 200,
          json: () => Promise.resolve(response.response),
        });
  });

  global.fetch = mockFn;
  return mockFn;
};

/**
 * Mock timers for testing time-dependent code
 */
export const mockTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  return {
    advanceBy: (ms: number) => jest.advanceTimersByTime(ms),
    advanceToNext: () => jest.advanceTimersToNextTimer(),
    runAll: () => jest.runAllTimers(),
    runPending: () => jest.runOnlyPendingTimers(),
  };
};
