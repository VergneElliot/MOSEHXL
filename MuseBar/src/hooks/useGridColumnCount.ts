import { useLayoutEffect, useRef, useState } from 'react';

const GRID_GAP_PX = 16;
/** Ignore width wobble from scrollbar appearance (~15–17px). */
const WIDTH_HYSTERESIS_PX = 20;

/**
 * Responsive column count for VirtuosoGrid from container width.
 * Uses hysteresis so scrollbar show/hide does not flip columnCount and remount the grid.
 */
export function useGridColumnCount(minColumnWidthPx: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(2);
  const lastWidthRef = useRef<number | null>(null);
  const lastCountRef = useRef(2);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const width = element.clientWidth;
      const next = Math.max(1, Math.floor((width + GRID_GAP_PX) / (minColumnWidthPx + GRID_GAP_PX)));
      const prevWidth = lastWidthRef.current;

      if (
        prevWidth != null &&
        Math.abs(width - prevWidth) < WIDTH_HYSTERESIS_PX &&
        next !== lastCountRef.current
      ) {
        // Width only moved by scrollbar chrome — keep previous column count.
        lastWidthRef.current = width;
        return;
      }

      lastWidthRef.current = width;
      if (next !== lastCountRef.current) {
        lastCountRef.current = next;
        setColumnCount(next);
      }
    };

    update();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [minColumnWidthPx]);

  return { containerRef, columnCount, gridGapPx: GRID_GAP_PX };
}
