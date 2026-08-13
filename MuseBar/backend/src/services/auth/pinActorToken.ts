import { signJwtToken, verifyJwtToken } from '../../security/jwtConfig';

export const PIN_ACTOR_TOKEN_USE = 'pin_actor';
export const PIN_ACTOR_EXPIRES_IN = '8h';

export interface PinActorPayload {
  token_use: typeof PIN_ACTOR_TOKEN_USE;
  id: number;
  email: string;
  role: string;
  establishment_id: string;
  display_name: string;
  permissions: string[];
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
  };
}

export function pinActorHasPermission(actor: PinActorPayload, permission: string): boolean {
  if (actor.role === 'establishment_admin' || actor.role === 'system_admin') return true;
  return actor.permissions.includes(permission);
}
