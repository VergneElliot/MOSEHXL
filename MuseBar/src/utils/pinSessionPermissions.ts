/** PIN session permission helpers (aligned with backend pinActorHasPermission). */

import type { PinActorState } from '../contexts/PinSessionsContext';

export function pinActorHasPermission(
  actor: Pick<PinActorState, 'role' | 'permissions'> | null | undefined,
  permission: string
): boolean {
  if (!actor) return false;
  if (actor.role === 'establishment_admin' || actor.role === 'system_admin') return true;
  return actor.permissions.includes(permission);
}
