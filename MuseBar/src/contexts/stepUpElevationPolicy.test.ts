import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@mosehxl/types';
import { canSkipPinForActiveActor } from './stepUpElevationPolicy';

describe('canSkipPinForActiveActor', () => {
  it('allows skip for basic when the active actor holds it', () => {
    expect(
      canSkipPinForActiveActor([PERMISSIONS.access_pos], (p) => p === PERMISSIONS.access_pos)
    ).toBe(true);
  });

  it('never skips for a specific permission even when the actor holds it', () => {
    expect(
      canSkipPinForActiveActor([PERMISSIONS.pos_apply_remise], () => true)
    ).toBe(false);
    expect(
      canSkipPinForActiveActor([PERMISSIONS.access_settings], () => true)
    ).toBe(false);
    expect(
      canSkipPinForActiveActor([PERMISSIONS.orders_cancel], () => true)
    ).toBe(false);
  });

  it('never skips when the list mixes basic and specific', () => {
    expect(
      canSkipPinForActiveActor(
        [PERMISSIONS.access_pos, PERMISSIONS.pos_apply_remise],
        () => true
      )
    ).toBe(false);
  });

  it('does not skip basic when the actor does not hold it', () => {
    expect(canSkipPinForActiveActor([PERMISSIONS.access_pos], () => false)).toBe(false);
  });

  it('treats unknown permission names as non-basic (always prompt)', () => {
    expect(canSkipPinForActiveActor(['not_a_real_permission'], () => true)).toBe(false);
  });
});
