import { describe, expect, it } from 'vitest';
import { createDragGhostChip, placeDragGhostChip } from './posDragGhostChip';

describe('posDragGhostChip', () => {
  it('createDragGhostChip builds a hidden chip', () => {
    const chip = createDragGhostChip('  Café  ');
    expect(chip.textContent).toBe('Café');
    expect(chip.className).toBe('pos-drag-ghost-chip');
    expect(chip.getAttribute('aria-hidden')).toBe('true');
    expect(createDragGhostChip('   ').textContent).toBe('…');
  });

  it('placeDragGhostChip offsets from the pointer', () => {
    const chip = createDragGhostChip('x');
    placeDragGhostChip(chip, 100, 50);
    expect(chip.style.left).toBe('80px');
    expect(chip.style.top).toBe('34px');
  });
});
