import type { PosProductDragPayload } from './posProductDnD';
import { POS_PRODUCT_DND_MIME } from './posProductDnD';

/** Parse product / divers / pourboire drop payload from HTML5 or touch DnD. */
export function parsePosProductDropPayload(raw: string): PosProductDragPayload | null {
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as PosProductDragPayload;
    if (!payload || typeof payload !== 'object') return null;
    if (payload.kind === 'divers' || payload.kind === 'pourboire') return payload;
    if (payload.kind === 'product' && payload.productId) {
      return {
        kind: 'product',
        productId: String(payload.productId),
        quantity: Math.max(1, Math.min(999, Number(payload.quantity) || 1)),
      };
    }
    const legacy = payload as unknown as { productId?: string; quantity?: number };
    if (legacy.productId) {
      return {
        kind: 'product',
        productId: String(legacy.productId),
        quantity: Math.max(1, Math.min(999, Number(legacy.quantity) || 1)),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function applyPosProductDropData(
  mime: string,
  data: string,
  onDropProduct: (payload: PosProductDragPayload) => void
): boolean {
  if (mime !== POS_PRODUCT_DND_MIME && mime !== 'text/plain') return false;
  const payload = parsePosProductDropPayload(data);
  if (!payload) return false;
  onDropProduct(payload);
  return true;
}
