/**
 * Virtuoso / ResizeObserver-based windowing needs ResizeObserver.
 * Older cashier Chromium builds often lack it — fall back to full list rendering.
 */
export function canUseVirtualization(): boolean {
  return typeof ResizeObserver !== 'undefined';
}
