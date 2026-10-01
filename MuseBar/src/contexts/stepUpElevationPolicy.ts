/**
 * When may step-up skip the PIN pad because the focused badge already holds the right?
 *
 * Specific permissions always require a PIN (cross-device safety). Basic rights may
 * use the focused actor without re-entry.
 */

import { isBasicPermission } from '@mosehxl/types';

/**
 * Returns true only when every requested key is basic and the active actor holds
 * at least one of them. Unknown names are treated as non-basic (always prompt).
 */
export function canSkipPinForActiveActor(
  permissions: string[],
  activeHolds: (permission: string) => boolean
): boolean {
  if (permissions.length === 0) return false;
  if (permissions.some((p) => !isBasicPermission(p))) return false;
  return permissions.some((p) => activeHolds(p));
}
