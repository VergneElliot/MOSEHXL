/** Station-local attribution applied to the next createOrder. */

export interface FloorOrderAttribution {
  /**
   * Waiter for Z / CA.
   * - Table: assigned owner
   * - Comptoir + PIN: PIN identity → individual Z
   * - Comptoir without PIN: null → Total comptoir
   */
  waiterUserId: number | null;
  waiterDisplayName: string | null;
  /** Null = comptoir / vente directe. */
  tableLabel: string | null;
}

let current: FloorOrderAttribution | null = null;

export function setFloorOrderAttribution(next: FloorOrderAttribution | null): void {
  current = next;
}

export function getFloorOrderAttribution(): FloorOrderAttribution | null {
  return current;
}
