/** MIME for split-board item assignment DnD (HTML5 + touch). */
export const SPLIT_DND_MIME = 'application/x-mosehxl-split-items';

export function splitBillDropId(index: number): string {
  return `split-bill-${index}`;
}

/** Drop target id for returning items to the unassigned pool. */
export const SPLIT_POOL_DROP_ID = 'split-pool';
