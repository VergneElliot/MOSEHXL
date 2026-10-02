import { StaffPinSessionModel } from '../../models/staffPinSession';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { PIN_ACTOR_TTL_MS } from './pinActorToken';
import { clockInOnPinOpen, clockOutOnPinClose } from './pinSessionPointage';
import { isPinPointageOnVenueNetwork } from './venueNetworkGuard';

/**
 * Opens or reuses the server-side badge session and returns its id (`sid` in the PIN actor
 * token). Re-verify on another device must reuse the same row (one open session per user).
 * Session open/reuse is always allowed; clock-in only when the client is on the venue
 * Wi‑Fi allowlist. Soft DB failures still return null so the floor is not hard-blocked.
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
    const onVenue = await isPinPointageOnVenueNetwork(
      input.establishmentId,
      input.ipAddress
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
      // Home→venue unlock: clock in if now on allowlist and not already punched.
      if (onVenue) {
        await clockInOnPinOpen({
          establishmentId: input.establishmentId,
          userId: input.pinUserId,
          ip: input.ipAddress ?? null,
        });
      }
      return existing.id;
    }

    const session = await StaffPinSessionModel.open({
      establishmentId: input.establishmentId,
      userId: input.pinUserId,
      openedByUserId: input.openedByUserId,
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    await StaffPinSessionModel.closeDuplicatesForUser(
      input.pinUserId,
      input.establishmentId,
      session.id
    );
    if (onVenue) {
      await clockInOnPinOpen({
        establishmentId: input.establishmentId,
        userId: input.pinUserId,
        ip: input.ipAddress ?? null,
      });
    }
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

/**
 * Closes the badge session. Always allowed off-venue; clock-out only on venue Wi‑Fi.
 * Owned open tables with items still block close everywhere. Empty shells are purged.
 * Closes every open badge row for that PIN user (heals duplicate sessions).
 */
export async function closePinSession(
  sessionId: string,
  establishmentId: string,
  reason: string,
  options?: { pinUserId?: number; ipAddress?: string | null }
): Promise<boolean> {
  if (options?.pinUserId != null) {
    const onVenue = await isPinPointageOnVenueNetwork(
      establishmentId,
      options.ipAddress ?? null
    );
    await clockOutOnPinClose({
      establishmentId,
      userId: options.pinUserId,
      ip: options.ipAddress ?? null,
      recordPointage: onVenue,
    });
    const n = await StaffPinSessionModel.closeAllForUser(
      options.pinUserId,
      establishmentId,
      reason
    );
    return n > 0;
  }
  return StaffPinSessionModel.close(sessionId, establishmentId, reason);
}
