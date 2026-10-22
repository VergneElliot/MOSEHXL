import { describe, expect, it } from 'vitest';
import { pinHeaders } from './floorApiHeaders';

describe('pinHeaders', () => {
  it('sets the PIN actor header for floor mutations', () => {
    expect(pinHeaders('actor-tok')).toEqual({ 'x-pin-actor-token': 'actor-tok' });
  });
});
