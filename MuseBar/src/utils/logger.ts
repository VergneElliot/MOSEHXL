import { reportClientError } from '../services/clientErrorLogger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, error?: unknown, context?: Record<string, unknown>): void {
  const payload = error ?? context;
  if (import.meta.env.DEV) {
    const fn =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.info;
    fn(`[${level.toUpperCase()}] ${message}`, payload ?? '');
  }
  if (level === 'error' || level === 'warn') {
    void reportClientError(message, error, { level, ...context });
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, undefined, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, undefined, context),
  warn: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    log('warn', message, error, context),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    log('error', message, error, context),
};
