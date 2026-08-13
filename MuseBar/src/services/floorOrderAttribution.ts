/** Station-local attribution applied to the next createOrder when table/PIN are active. */

export interface FloorOrderAttribution {
  waiterUserId: number;
  waiterDisplayName: string;
  tableLabel: string | null;
}

let current: FloorOrderAttribution | null = null;

export function setFloorOrderAttribution(next: FloorOrderAttribution | null): void {
  current = next;
}

export function getFloorOrderAttribution(): FloorOrderAttribution | null {
  return current;
}
