/** Station-local attribution applied to the next createOrder when a PIN session is active. */

export interface FloorOrderAttribution {
  /**
   * Table owner for Z / CA. Null for comptoir (direct sale) — those sales go to Total comptoir,
   * not an individual waiter Z. Traceability still uses account + PIN session on the order.
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
