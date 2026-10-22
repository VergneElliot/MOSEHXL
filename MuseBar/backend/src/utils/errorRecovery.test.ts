import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ErrorRecovery,
  getErrorRecovery,
  initializeErrorRecovery,
} from './errorRecovery';

function mockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('ErrorRecovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retryOperation succeeds without retry', async () => {
    const recovery = new ErrorRecovery(mockLogger() as never);
    await expect(recovery.retryOperation(async () => 42, 'op')).resolves.toBe(42);
  });

  it('retryOperation retries retryable errors then succeeds', async () => {
    const logger = mockLogger();
    const recovery = new ErrorRecovery(logger as never);
    let attempts = 0;
    const promise = recovery.retryOperation(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('ECONNRESET boom');
        return 'ok';
      },
      'net',
      { maxRetries: 3, baseDelay: 10, exponentialBackoff: false }
    );
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(attempts).toBe(3);
    expect(logger.info).toHaveBeenCalled();
  });

  it('retryOperation throws non-retryable errors immediately', async () => {
    const recovery = new ErrorRecovery(mockLogger() as never);
    await expect(
      recovery.retryOperation(async () => {
        throw new Error('validation failed');
      }, 'bad')
    ).rejects.toThrow('validation failed');
  });

  it('withFallback uses fallback when primary fails', async () => {
    const recovery = new ErrorRecovery(mockLogger() as never);
    await expect(
      recovery.withFallback(
        async () => {
          throw new Error('primary');
        },
        async () => 'fallback',
        'fb'
      )
    ).resolves.toBe('fallback');
  });

  it('withFallback rethrows original when both fail', async () => {
    const recovery = new ErrorRecovery(mockLogger() as never);
    await expect(
      recovery.withFallback(
        async () => {
          throw new Error('primary');
        },
        async () => {
          throw new Error('fallback');
        },
        'fb'
      )
    ).rejects.toThrow('primary');
  });

  it('circuit breaker opens after threshold failures', async () => {
    const recovery = new ErrorRecovery(mockLogger() as never);
    const breaker = recovery.createCircuitBreaker(
      async () => {
        throw new Error('down');
      },
      'svc',
      { failureThreshold: 2, resetTimeout: 60_000, monitoringWindow: 60_000 }
    );
    await expect(breaker()).rejects.toThrow('down');
    await expect(breaker()).rejects.toThrow('down');
    await expect(breaker()).rejects.toThrow(/Circuit breaker is OPEN/);
  });
});

describe('initializeErrorRecovery / getErrorRecovery', () => {
  it('requires initialization', () => {
    expect(() => getErrorRecovery()).toThrow(/not initialized/);
    initializeErrorRecovery(mockLogger() as never);
    expect(getErrorRecovery()).toBeInstanceOf(ErrorRecovery);
  });
});
