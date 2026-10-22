import { describe, expect, it } from 'vitest';
import type { DiningTableDto } from '../../../services/api/floor';
import { toCanvasTables } from './floorPlansCanvas';

describe('toCanvasTables', () => {
  it('maps dining tables onto canvas geometry', () => {
    const tables = [
      {
        id: 1,
        label: '1',
        pos_x: '10',
        pos_y: '20',
        width: '64',
        height: '64',
        shape: 'circle',
        capacity: '4',
      },
      {
        id: 2,
        label: '2',
        shape: null,
        capacity: null,
      },
    ] as unknown as DiningTableDto[];

    const canvas = toCanvasTables(tables);
    expect(canvas[0]).toMatchObject({
      id: 1,
      label: '1',
      pos_x: 10,
      pos_y: 20,
      width: 64,
      height: 64,
      shape: 'circle',
      capacity: 4,
    });
    expect(canvas[1]).toMatchObject({
      id: 2,
      shape: 'rectangle',
      capacity: null,
      width: 88,
      height: 88,
    });
  });
});
