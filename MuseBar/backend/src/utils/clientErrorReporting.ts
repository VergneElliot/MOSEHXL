import crypto from 'crypto';

export const MAX_CLIENT_ERROR_REPORT_BYTES = 16 * 1024; // 16 KiB

const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'api_key',
  'apikey',
  'client_error_key',
  'setup_secret',
  'creditcard',
  'credit_card',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function truncateString(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...[truncated]`;
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return truncateString(value, 2000);
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    result[key] = sanitizeValue(nested);
  }
  return result;
}

export function getClientErrorPayloadSizeBytes(payload: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(payload ?? null), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function isClientErrorPayloadTooLarge(
  payload: unknown,
  maxBytes: number = MAX_CLIENT_ERROR_REPORT_BYTES
): boolean {
  return getClientErrorPayloadSizeBytes(payload) > maxBytes;
}

export function sanitizeClientErrorForLog(payload: unknown): Record<string, unknown> {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  return {
    errorId: typeof raw.errorId === 'string' ? truncateString(raw.errorId, 128) : 'unknown',
    message: typeof raw.message === 'string' ? truncateString(raw.message, 500) : 'Unknown client error',
    stack: typeof raw.stack === 'string' ? truncateString(raw.stack, 4000) : undefined,
    url: typeof raw.url === 'string' ? truncateString(raw.url, 500) : undefined,
    source: 'CLIENT',
    context: sanitizeValue(raw.context ?? raw.metadata ?? {}),
    tags: sanitizeValue(raw.tags ?? {}),
  };
}

export function verifyClientErrorReportKey(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;

  try {
    const providedBuffer = Buffer.from(provided, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
