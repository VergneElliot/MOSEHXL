import type { DragEvent as ReactDragEvent } from 'react';
import { createDragGhostChip } from './posDragGhostChip';

/**
 * Replace the browser's default drag preview (often a huge translucent clone)
 * with a compact chip so POS / split-board DnD stays readable.
 */
export function setCompactDragGhost(event: ReactDragEvent, label: string): void {
  if (typeof document === 'undefined') return;

  const ghost = createDragGhostChip(label);
  document.body.appendChild(ghost);
  try {
    event.dataTransfer.setDragImage(ghost, 20, 16);
  } catch {
    ghost.remove();
    return;
  }

  const cleanup = () => {
    ghost.remove();
  };
  const target = event.currentTarget;
  if (target && 'addEventListener' in target) {
    target.addEventListener('dragend', cleanup, { once: true });
  } else {
    window.setTimeout(cleanup, 0);
  }
}
