/**
 * When may step-up skip the PIN pad because the focused badge already holds the right?
 *
 * With the équipe portal as default, a focused badge that already holds a right
 * (basic or specific) may act without re-entry. Step-up only when it lacks the right.
 */

/**
 * Returns true when the active actor holds at least one of the requested permissions.
 */
export function canSkipPinForActiveActor(
  permissions: string[],
  activeHolds: (permission: string) => boolean
): boolean {
  if (permissions.length === 0) return false;
  return permissions.some((p) => activeHolds(p));
}
