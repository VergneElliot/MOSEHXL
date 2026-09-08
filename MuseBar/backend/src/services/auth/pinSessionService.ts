import { StaffPinSessionModel } from '../../models/staffPinSession';
import { Logger } from '../../utils/logger';
import { PIN_ACTOR_TTL_MS } from './pinActorToken';

/**
 * Opens the server-side record of a badge-in and returns its id, which is embedded in the PIN
 * actor token as `sid`. A failure here must not block the floor: the badge still works, it is
 * simply attributed to the PIN identity without a session id.
 */
export async function openPinSession(input: {
  establishmentId: string;
  pinUserId: number;
  openedByUserId: number;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}): Promise<string | null> {
  try {
    const session = await StaffPinSessionModel.open({
      establishmentId: input.establishmentId,
      userId: input.pinUserId,
      openedByUserId: input.openedByUserId,
      expiresAt: new Date(Date.now() + PIN_ACTOR_TTL_MS),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    return session.id;
  } catch (error) {
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
  reason: string
): Promise<boolean> {
  return StaffPinSessionModel.close(sessionId, establishmentId, reason);
}
