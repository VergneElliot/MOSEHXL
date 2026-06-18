import {
  __resetClientErrorLoggerForTests,
  initializeClientErrorLogging,
  reportClientError,
} from './clientErrorLogger';
import { apiConfig } from '../config/api';

jest.mock('../config/api', () => ({
  apiConfig: {
    isReady: jest.fn(() => true),
    initialize: jest.fn(async () => {}),
    getEndpoint: jest.fn(() => 'http://localhost:3001/api/client-errors'),
  },
}));

const mockedApiConfig = apiConfig as jest.Mocked<typeof apiConfig>;

describe('clientErrorLogger', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockedApiConfig.isReady as jest.Mock).mockReturnValue(true);
    (mockedApiConfig.initialize as jest.Mock).mockResolvedValue(undefined);
    (mockedApiConfig.getEndpoint as jest.Mock).mockImplementation(
      () => 'http://localhost:3001/api/client-errors'
    );
    process.env.REACT_APP_REPORT_DEV_ERRORS = 'true';
    process.env.REACT_APP_CLIENT_ERROR_REPORT_KEY = 'frontend-test-key';
    global.fetch = jest.fn(async () => ({ ok: true } as Response));
  });

  afterEach(() => {
    __resetClientErrorLoggerForTests();
    process.env = { ...originalEnv };
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
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    initializeClientErrorLogging();

    console.error('Console emitted error', new Error('console-failure'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

