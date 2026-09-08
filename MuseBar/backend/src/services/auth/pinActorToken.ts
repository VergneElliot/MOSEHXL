import { signJwtToken, verifyJwtToken } from '../../security/jwtConfig';

export const PIN_ACTOR_TOKEN_USE = 'pin_actor';
/** Hard cap on a badge, whatever the activity: one long service, never a second day. */
export const PIN_ACTOR_EXPIRES_IN = '12h';
export const PIN_ACTOR_TTL_MS = 12 * 60 * 60 * 1000;

export interface PinActorPayload {
  token_use: typeof PIN_ACTOR_TOKEN_USE;
  id: number;
  email: string;
  role: string;
  establishment_id: string;
  display_name: string;
  permissions: string[];
  /** staff_pin_sessions.id — the badge-in this token belongs to. */
  sid?: string;
  /** Account the badge was opened from. */
  opened_by_user_id?: number;
}

export function buildDisplayName(firstName: string | null, lastName: string | null, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || email;
}

export function signPinActorToken(payload: Omit<PinActorPayload, 'token_use'>): string {
  return signJwtToken(
    {
      ...payload,
      token_use: PIN_ACTOR_TOKEN_USE,
    },
    PIN_ACTOR_EXPIRES_IN
  );
}

export function verifyPinActorToken(token: string): PinActorPayload {
  const decoded = verifyJwtToken(token) as Partial<PinActorPayload>;
  if (decoded.token_use !== PIN_ACTOR_TOKEN_USE) {
    throw new Error('Not a pin actor token');
  }
  if (
    typeof decoded.id !== 'number' ||
    typeof decoded.establishment_id !== 'string' ||
    typeof decoded.email !== 'string' ||
    typeof decoded.role !== 'string' ||
    !Array.isArray(decoded.permissions)
  ) {
    throw new Error('Invalid pin actor token payload');
  }
  return {
    token_use: PIN_ACTOR_TOKEN_USE,
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    establishment_id: decoded.establishment_id,
    display_name: typeof decoded.display_name === 'string' ? decoded.display_name : decoded.email,
    permissions: decoded.permissions.map(String),
    ...(typeof decoded.sid === 'string' ? { sid: decoded.sid } : {}),
    ...(typeof decoded.opened_by_user_id === 'number'
      ? { opened_by_user_id: decoded.opened_by_user_id }
      : {}),
  };
}

export function pinActorHasPermission(actor: PinActorPayload, permission: string): boolean {
  if (actor.role === 'establishment_admin' || actor.role === 'system_admin') return true;
  return actor.permissions.includes(permission);
}
