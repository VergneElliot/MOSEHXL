import { useLayoutEffect, useRef, useState } from 'react';

const GRID_GAP_PX = 16;

/**
 * Responsive column count for VirtuosoGrid from container width.
 */
export function useGridColumnCount(minColumnWidthPx: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(2);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const width = element.clientWidth;
      const next = Math.max(1, Math.floor((width + GRID_GAP_PX) / (minColumnWidthPx + GRID_GAP_PX)));
      setColumnCount(next);
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
