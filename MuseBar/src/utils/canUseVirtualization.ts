/**
 * Virtuoso / ResizeObserver-based windowing needs ResizeObserver.
 * Older cashier Chromium builds often lack it — fall back to full list rendering.
 */
export function canUseVirtualization(): boolean {
  return typeof ResizeObserver !== 'undefined';
}

/** Only virtualize large catalogs — VirtuosoGrid flickers on small/medium lists. */
export const PRODUCT_GRID_VIRTUALIZE_MIN = 70;

export function shouldVirtualizeProductGrid(itemCount: number): boolean {
  return canUseVirtualization() && itemCount >= PRODUCT_GRID_VIRTUALIZE_MIN;
}
