/**
 * Replace the browser's default drag preview (often a huge translucent clone)
 * with a compact chip so POS / split-board DnD stays readable.
 */

import type { DragEvent as ReactDragEvent } from 'react';

export function setCompactDragGhost(event: ReactDragEvent, label: string): void {
  if (typeof document === 'undefined') return;

  const text = label.trim() || '…';
  const ghost = document.createElement('div');
  ghost.textContent = text;
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '-1000px',
    left: '-1000px',
    zIndex: '100000',
    maxWidth: '240px',
    padding: '8px 12px',
    borderRadius: '8px',
    background: '#1565c0',
    color: '#fff',
    font: '600 14px/1.25 system-ui, sans-serif',
    boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    pointerEvents: 'none',
  });

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
