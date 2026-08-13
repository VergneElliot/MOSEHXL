/** HTML5 DnD MIME for dragging a POS product / special card onto the cart. */
export const POS_PRODUCT_DND_MIME = 'application/x-mosehxl-pos-product';

export type PosProductDragPayload =
  | { kind: 'product'; productId: string; quantity: number }
  | { kind: 'divers' }
  | { kind: 'pourboire' };
