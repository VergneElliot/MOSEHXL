/**
 * Compact drag chip used by HTML5 setDragImage and custom touch DnD.
 */

export function createDragGhostChip(label: string): HTMLElement {
  const text = label.trim() || '…';
  const ghost = document.createElement('div');
  ghost.textContent = text;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.className = 'pos-drag-ghost-chip';
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
  return ghost;
}

export function placeDragGhostChip(ghost: HTMLElement, clientX: number, clientY: number): void {
  ghost.style.top = `${clientY - 16}px`;
  ghost.style.left = `${clientX - 20}px`;
}
