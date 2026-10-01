import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@mosehxl/types';
import { canEnterWithoutStepUpPin } from './stepUpPageEntryPolicy';

describe('canEnterWithoutStepUpPin', () => {
  it('allows empty (basic tab) without a specific step-up', () => {
    expect(canEnterWithoutStepUpPin([])).toBe(true);
  });

  it('allows basic-only keys', () => {
    expect(canEnterWithoutStepUpPin([PERMISSIONS.access_pos])).toBe(true);
  });

  it('never skips when any key is specific (even if the badge holds it)', () => {
    expect(canEnterWithoutStepUpPin([PERMISSIONS.access_closure])).toBe(false);
    expect(canEnterWithoutStepUpPin([PERMISSIONS.access_settings])).toBe(false);
    expect(
      canEnterWithoutStepUpPin([PERMISSIONS.access_pos, PERMISSIONS.access_documents])
    ).toBe(false);
  });
});
