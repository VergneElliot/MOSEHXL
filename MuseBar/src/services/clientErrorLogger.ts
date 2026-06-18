import { apiConfig } from '../config/api';

type ErrorLike = Error & { cause?: unknown };

interface ClientErrorPayload {
  errorId: string;
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  level: 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

let initialized = false;
let originalConsoleError: typeof console.error | null = null;
let windowErrorHandler: ((event: ErrorEvent) => void) | null = null;
let windowRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

function isReportingEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return Boolean(process.env.REACT_APP_REPORT_DEV_ERRORS);
}

function resolveSeverity(message: string): ClientErrorPayload['severity'] {
  const lower = message.toLowerCase();
  if (lower.includes('payment') || lower.includes('transaction') || lower.includes('database')) {
    return 'critical';
  }
  if (lower.includes('forbidden') || lower.includes('unauthorized') || lower.includes('permission')) {
    return 'high';
  }
  if (lower.includes('not found') || lower.includes('validation') || lower.includes('invalid')) {
    return 'medium';
  }
  return 'low';
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toErrorPayload(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): ClientErrorPayload {
  const err = error instanceof Error ? (error as ErrorLike) : null;
  const url = typeof window !== 'undefined' ? window.location.href : 'unknown';

  return {
    errorId: `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    message,
    stack: err?.stack,
    url,
    timestamp: new Date().toISOString(),
    level: 'error',
    severity: resolveSeverity(message),
    context: {
      ...(context ?? {}),
      errorName: err?.name,
      errorCause: err?.cause ? safeStringify(err.cause) : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
  };
}

async function sendClientError(payload: ClientErrorPayload): Promise<void> {
  if (!isReportingEnabled()) return;

  try {
    if (!apiConfig.isReady()) {
      await apiConfig.initialize();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const reportKey = process.env.REACT_APP_CLIENT_ERROR_REPORT_KEY;
    if (reportKey) {
      headers['x-client-error-key'] = reportKey;
    }

    await fetch(apiConfig.getEndpoint('/api/client-errors'), {
      method: 'POST',
      headers,
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // Fail silent: reporting must never break UX or recurse into more logs.
  }
}

export async function reportClientError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  await sendClientError(toErrorPayload(message, error, context));
}

export function initializeClientErrorLogging(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  originalConsoleError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    originalConsoleError?.(...args);

    const [first, second] = args;
    const message =
      typeof first === 'string'
        ? first
        : first instanceof Error
          ? first.message
          : 'Unhandled console.error event';
    void reportClientError(message, first instanceof Error ? first : second, {
      source: 'console.error',
      rawArgs: args.map((a) => (typeof a === 'string' ? a : safeStringify(a))).slice(0, 5),
    });
  };

  windowErrorHandler = (event: ErrorEvent) => {
    void reportClientError(event.message || 'Window error event', event.error, {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };
  window.addEventListener('error', windowErrorHandler);

  windowRejectionHandler = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    void reportClientError(message, reason instanceof Error ? reason : undefined, {
      source: 'window.unhandledrejection',
      reason: reason instanceof Error ? reason.message : safeStringify(reason),
    });
  };
  window.addEventListener('unhandledrejection', windowRejectionHandler);
}

export function __resetClientErrorLoggerForTests(): void {
  if (originalConsoleError) {
    console.error = originalConsoleError;
  }
  if (windowErrorHandler) {
    window.removeEventListener('error', windowErrorHandler);
  }
  if (windowRejectionHandler) {
    window.removeEventListener('unhandledrejection', windowRejectionHandler);
  }
  windowErrorHandler = null;
  windowRejectionHandler = null;
  originalConsoleError = null;
  initialized = false;
}

