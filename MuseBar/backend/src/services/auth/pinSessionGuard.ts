import { StaffPinSessionModel } from '../../models/staffPinSession';
import { Logger } from '../../utils/logger';

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const lastTouched = new Map<string, number>();

export type PinSessionState = 'active' | 'revoked' | 'unknown';

/**
 * Server-side state of the badge behind a PIN actor token.
 *
 * `unknown` covers tokens issued before sessions existed and lookup failures: the floor must
 * keep working when the database hiccups, so only an explicit "this session is closed or
 * expired" answer revokes access.
 */
export async function checkPinSession(
  sessionId: string | undefined,
  establishmentId: string
): Promise<PinSessionState> {
  if (!sessionId) return 'unknown';
  try {
    const session = await StaffPinSessionModel.findActive(sessionId, establishmentId);
    return session ? 'active' : 'revoked';
  } catch (error) {
    Logger.getInstance().error('PIN session lookup failed', error as Error, 'PIN_SESSION');
    return 'unknown';
  }
}

/** Refreshes `last_seen_at` at most once per interval per session. */
export function touchPinSession(sessionId: string | undefined, establishmentId: string): void {
  if (!sessionId) return;
  const now = Date.now();
  const previous = lastTouched.get(sessionId) ?? 0;
  if (now - previous < TOUCH_INTERVAL_MS) return;
  lastTouched.set(sessionId, now);
  void StaffPinSessionModel.touch(sessionId, establishmentId).catch(() => {
    // Liveness is best-effort; a missed touch only affects the sessions list.
    lastTouched.delete(sessionId);
  });
}

/** Test seam. */
export function resetPinSessionTouchCache(): void {
  lastTouched.clear();
}
