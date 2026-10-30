/**
 * Page/tab entry routing helper: basic tabs only need an open PIN session;
 * specific tabs always go through ensureAccess (which skips the pad when the
 * focused badge already holds the right — see canSkipPinForActiveActor).
 */

import { isBasicPermission } from '@mosehxl/types';

/**
 * True when entry is “session enough” (no ensureAccess for a specific key):
 * empty list or every key is basic. Specific keys use ensureAccess instead.
 */
export function canEnterWithoutStepUpPin(permissions: string[]): boolean {
  if (permissions.length === 0) return true;
  return permissions.every((p) => isBasicPermission(p));
}
