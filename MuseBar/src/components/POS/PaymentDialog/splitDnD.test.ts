import { describe, expect, it } from 'vitest';
import { SPLIT_DND_MIME, SPLIT_POOL_DROP_ID, splitBillDropId } from './splitDnD';

describe('splitDnD', () => {
  it('builds stable drop ids and mime', () => {
    expect(SPLIT_DND_MIME).toContain('split-items');
    expect(SPLIT_POOL_DROP_ID).toBe('split-pool');
    expect(splitBillDropId(0)).toBe('split-bill-0');
    expect(splitBillDropId(3)).toBe('split-bill-3');
  });
});
