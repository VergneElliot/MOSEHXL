/**
 * Page/tab entry: never treat “focused badge already holds a specific right” as enough.
 * Callers must still invoke ensureAccess / ensurePermission for specific keys.
 */

import { isBasicPermission } from '@mosehxl/types';

/**
 * True only when entry needs no step-up pad: empty list (basic page with session already
 * open — caller checks session) or every key is basic. Specific keys always return false.
 */
export function canEnterWithoutStepUpPin(permissions: string[]): boolean {
  if (permissions.length === 0) return true;
  return permissions.every((p) => isBasicPermission(p));
}
