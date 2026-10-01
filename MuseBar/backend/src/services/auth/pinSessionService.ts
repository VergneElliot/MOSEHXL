import { StaffPinSessionModel } from '../../models/staffPinSession';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { PIN_ACTOR_TTL_MS } from './pinActorToken';
import { clockInOnPinOpen, clockOutOnPinClose } from './pinSessionPointage';
import { assertPinPointageOnVenueNetwork } from './venueNetworkGuard';

/**
 * Opens or reuses the server-side badge session and returns its id (`sid` in the PIN actor
 * token). Re-verify on another device must reuse the same row (one open session per user)
 * and must not clock-in again. First open requires venue Wi‑Fi (pointage). Soft failures
 * (DB) still return null so the floor is not hard-blocked; network denials propagate.
 */
export async function openPinSession(input: {
  establishmentId: string;
  pinUserId: number;
  openedByUserId: number;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}): Promise<string | null> {
  try {
    await StaffPinSessionModel.closeStale(input.establishmentId);

    const expiresAt = new Date(Date.now() + PIN_ACTOR_TTL_MS);
    const existing = await StaffPinSessionModel.findActiveForUser(
      input.establishmentId,
      input.pinUserId
    );

    if (existing) {
      await StaffPinSessionModel.touchAndExtend(
        existing.id,
        input.establishmentId,
        expiresAt
      );
      await StaffPinSessionModel.closeDuplicatesForUser(
        input.pinUserId,
        input.establishmentId,
        existing.id
      );
      // Already clocked in when this session was first opened — no Wi‑Fi check.
      return existing.id;
    }

    await assertPinPointageOnVenueNetwork(input.establishmentId, input.ipAddress);

    const session = await StaffPinSessionModel.open({
      establishmentId: input.establishmentId,
      userId: input.pinUserId,
      openedByUserId: input.openedByUserId,
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    await clockInOnPinOpen({
      establishmentId: input.establishmentId,
      userId: input.pinUserId,
      ip: input.ipAddress ?? null,
    });
    return session.id;
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.getInstance().error(
      'Failed to open PIN session record',
      error as Error,
      'PIN_SESSION'
    );
    return null;
  }
}

export async function closePinSession(
  sessionId: string,
  establishmentId: string,
  reason: string,
  options?: { pinUserId?: number; ipAddress?: string | null }
): Promise<boolean> {
  await assertPinPointageOnVenueNetwork(establishmentId, options?.ipAddress ?? null);

  if (options?.pinUserId != null) {
    await clockOutOnPinClose({
      establishmentId,
      userId: options.pinUserId,
      ip: options.ipAddress ?? null,
    });
  }
  return StaffPinSessionModel.close(sessionId, establishmentId, reason);
}
