import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@mosehxl/types';
import { canSkipPinForActiveActor } from './stepUpElevationPolicy';

describe('canSkipPinForActiveActor', () => {
  it('allows skip for basic when the active actor holds it', () => {
    expect(
      canSkipPinForActiveActor([PERMISSIONS.access_pos], (p) => p === PERMISSIONS.access_pos)
    ).toBe(true);
  });

  it('allows skip for specific when the active actor holds it', () => {
    expect(
      canSkipPinForActiveActor([PERMISSIONS.pos_apply_remise], () => true)
    ).toBe(true);
    expect(
      canSkipPinForActiveActor([PERMISSIONS.access_settings], () => true)
    ).toBe(true);
    expect(
      canSkipPinForActiveActor([PERMISSIONS.orders_cancel], () => true)
    ).toBe(true);
  });

  it('skips when any listed key is held (OR semantics)', () => {
    expect(
      canSkipPinForActiveActor(
        [PERMISSIONS.access_pos, PERMISSIONS.pos_apply_remise],
        (p) => p === PERMISSIONS.pos_apply_remise
      )
    ).toBe(true);
  });

  it('does not skip when the actor holds none of the keys', () => {
    expect(canSkipPinForActiveActor([PERMISSIONS.access_pos], () => false)).toBe(false);
    expect(
      canSkipPinForActiveActor([PERMISSIONS.orders_cancel], () => false)
    ).toBe(false);
  });

  it('does not skip an empty permission list', () => {
    expect(canSkipPinForActiveActor([], () => true)).toBe(false);
  });
});
