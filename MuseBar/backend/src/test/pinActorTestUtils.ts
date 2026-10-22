/**
 * Test helpers for the PIN-actor permission model (patch notes 536–541).
 *
 * Feature permissions are held only by the PIN identity: route gates read the
 * `x-pin-actor-token` header and ignore the account JWT for authorization. These
 * helpers sign a real pin_actor JWT (same secret as the account JWT, provided by
 * `setupEnv.ts`) so route tests exercise the production middleware unchanged.
 */
import type { Test } from 'supertest';
import { signPinActorToken } from '../services/auth/pinActorToken';

export const PIN_ACTOR_HEADER = 'x-pin-actor-token';

export interface PinActorTokenOptions {
  /** PIN user id (`users.id`). Defaults to 900. */
  id?: number;
  /** Must equal the account JWT `establishment_id` or the actor is ignored. */
  establishmentId: string;
  /** `establishment_admin` / `system_admin` hold every permission implicitly. */
  role?: string;
  permissions?: string[];
  email?: string;
  displayName?: string;
  /** staff_pin_sessions.id — optional, gates that only read the actor do not check it. */
  sid?: string;
}

/** Signs a real pin_actor JWT holding exactly the given permissions. */
export function pinActorTokenFor(options: PinActorTokenOptions): string {
  const id = options.id ?? 900;
  const role = options.role ?? 'staff';
  return signPinActorToken({
    id,
    email: options.email ?? `pin-${id}@example.com`,
    role,
    establishment_id: options.establishmentId,
    display_name: options.displayName ?? `PIN ${id}`,
    permissions: options.permissions ?? [],
    ...(options.sid ? { sid: options.sid } : {}),
  });
}

/** PIN actor with role `establishment_admin` — passes every permission gate. */
export function adminPinActorTokenFor(establishmentId: string, id = 901): string {
  return pinActorTokenFor({ id, establishmentId, role: 'establishment_admin' });
}

/** Sets the `x-pin-actor-token` header on a supertest request. */
export function withPinActor(req: Test, token: string): Test {
  return req.set(PIN_ACTOR_HEADER, token);
}
