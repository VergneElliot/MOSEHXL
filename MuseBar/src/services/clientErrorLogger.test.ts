import { vi } from 'vitest';
import {
  __resetClientErrorLoggerForTests,
  initializeClientErrorLogging,
  reportClientError,
} from './clientErrorLogger';
import { apiConfig } from '../config/api';

vi.mock('../config/api', () => ({
  apiConfig: {
    isReady: vi.fn(() => true),
    initialize: vi.fn(async () => {}),
    getEndpoint: vi.fn(() => 'http://localhost:3001/api/client-errors'),
  },
}));

const mockedApiConfig = vi.mocked(apiConfig);

describe('clientErrorLogger', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiConfig.isReady.mockReturnValue(true);
    mockedApiConfig.initialize.mockResolvedValue(undefined);
    mockedApiConfig.getEndpoint.mockImplementation(() => 'http://localhost:3001/api/client-errors');
    vi.stubEnv('VITE_REPORT_DEV_ERRORS', 'true');
    vi.stubEnv('VITE_CLIENT_ERROR_REPORT_KEY', 'frontend-test-key');
    global.fetch = vi.fn(async () => ({ ok: true }) as Response);
  });

  afterEach(() => {
    __resetClientErrorLoggerForTests();
    vi.unstubAllEnvs();
    global.fetch = originalFetch;
  });

  it('reports client errors to /api/client-errors endpoint', async () => {
    await reportClientError('Manual report error', new Error('boom'), { source: 'unit-test' });

    expect(mockedApiConfig.getEndpoint).toHaveBeenCalledWith('/api/client-errors');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/client-errors',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-client-error-key': 'frontend-test-key',
        }),
      })
    );
  });

  it('patches console.error and reports emitted errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    initializeClientErrorLogging();

    console.error('Console emitted error', new Error('console-failure'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
