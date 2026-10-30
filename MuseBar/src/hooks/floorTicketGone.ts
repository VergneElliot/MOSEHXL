/**
 * Detect open-ticket APIs that failed because the ticket is already closed / missing.
 * Used to release a stale local cart binding instead of trapping the waiter.
 */

const GONE_PATTERNS = [
  /open ticket not found/i,
  /ticket not found or already closed/i,
  /not found or already closed/i,
];

export function isOpenTicketGoneError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error != null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error ?? '');
  return GONE_PATTERNS.some((re) => re.test(message));
}
