/**
 * Error Recovery Utilities
 * Automatic recovery and retry mechanisms for critical operations
 */

import { Logger } from './logger';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  retryCondition?: (error: Error) => boolean;
}

export class ErrorRecovery {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Retry operation with exponential backoff
   */
  public async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config: RetryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBackoff: true,
      retryCondition: (error) => this.isRetryableError(error),
      ...options
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          this.logger.info(
            `Operation '${operationName}' succeeded after ${attempt} retries`,
            { attempt, operationName },
            'ERROR_RECOVERY'
          );
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry
        if (attempt === config.maxRetries || !config.retryCondition!(lastError)) {
          this.logger.error(
            `Operation '${operationName}' failed after ${attempt + 1} attempts`,
            lastError,
            { attempt, operationName, finalAttempt: true },
            'ERROR_RECOVERY'
          );
          throw lastError;
        }

        // Calculate delay
        const delay = config.exponentialBackoff
          ? Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay)
          : config.baseDelay;

        this.logger.warn(
          `Operation '${operationName}' failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms`,
          { 
            error: lastError.message, 
            attempt, 
            delay, 
            operationName 
          },
          'ERROR_RECOVERY'
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Circuit breaker pattern implementation
   */
  public createCircuitBreaker<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    operationName: string,
    options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringWindow: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringWindow: 60000
    }
  ) {
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    let failures = 0;
    let lastFailureTime = 0;
    let successCount = 0;

    return async (...args: T): Promise<R> => {
      const now = Date.now();

      // Reset failure count if monitoring window has passed
      if (now - lastFailureTime > options.monitoringWindow) {
        failures = 0;
      }

      // Handle OPEN state
      if (state === 'OPEN') {
        if (now - lastFailureTime < options.resetTimeout) {
          throw new Error(`Circuit breaker is OPEN for operation '${operationName}'. Service temporarily unavailable.`);
        }
        state = 'HALF_OPEN';
        successCount = 0;
      }

      try {
        const result = await operation(...args);

        // Handle successful call
        if (state === 'HALF_OPEN') {
          successCount++;
          if (successCount >= 3) { // Require 3 successful calls to close
            state = 'CLOSED';
            failures = 0;
            this.logger.info(
              `Circuit breaker CLOSED for operation '${operationName}'`,
              { operationName, state },
              'ERROR_RECOVERY'
            );
          }
        } else {
          failures = Math.max(0, failures - 1); // Gradually reduce failure count on success
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (state === 'HALF_OPEN') {
          state = 'OPEN';
          this.logger.warn(
            `Circuit breaker OPEN for operation '${operationName}' (failed during half-open)`,
            { operationName, state, failures },
            'ERROR_RECOVERY'
          );
        } else if (failures >= options.failureThreshold) {
          state = 'OPEN';
          this.logger.error(
            `Circuit breaker OPEN for operation '${operationName}' (failure threshold reached)`,
            error as Error,
            { operationName, state, failures, threshold: options.failureThreshold },
            'ERROR_RECOVERY'
          );
        }

        throw error;
      }
    };
  }

  /**
   * Graceful degradation wrapper
   */
  public async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      this.logger.warn(
        `Primary operation '${operationName}' failed, attempting fallback`,
        { error: (error as Error).message, operationName },
        'ERROR_RECOVERY'
      );

      try {
        const result = await fallbackOperation();
        this.logger.info(
          `Fallback operation '${operationName}' succeeded`,
          { operationName },
          'ERROR_RECOVERY'
        );
        return result;
      } catch (fallbackError) {
        this.logger.error(
          `Both primary and fallback operations failed for '${operationName}'`,
          fallbackError as Error,
          { 
            operationName, 
            primaryError: (error as Error).message,
            fallbackError: (fallbackError as Error).message 
          },
          'ERROR_RECOVERY'
        );
        throw error; // Throw original error
      }
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Network errors
    if (error.message.includes('ECONNRESET') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
      return true;
    }

    // Database connection errors
    if (error.message.includes('connection') && 
        (error.message.includes('lost') || 
         error.message.includes('closed') || 
         error.message.includes('timeout'))) {
      return true;
    }

    // HTTP 5xx errors (server errors)
    if (error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      return true;
    }

    // Rate limiting (429)
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global error recovery instance
 */
let globalErrorRecovery: ErrorRecovery;

export function initializeErrorRecovery(logger: Logger): void {
  globalErrorRecovery = new ErrorRecovery(logger);
}

export function getErrorRecovery(): ErrorRecovery {
  if (!globalErrorRecovery) {
    throw new Error('Error recovery not initialized. Call initializeErrorRecovery first.');
  }
  return globalErrorRecovery;
}

