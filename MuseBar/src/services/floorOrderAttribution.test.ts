import { afterEach, describe, expect, it } from 'vitest';
import {
  getFloorOrderAttribution,
  setFloorOrderAttribution,
} from './floorOrderAttribution';

describe('floorOrderAttribution', () => {
  afterEach(() => {
    setFloorOrderAttribution(null);
  });

  it('stores and clears station attribution', () => {
    expect(getFloorOrderAttribution()).toBeNull();
    setFloorOrderAttribution({
      waiterUserId: 3,
      waiterDisplayName: 'Ann',
      tableLabel: '12',
    });
    expect(getFloorOrderAttribution()).toEqual({
      waiterUserId: 3,
      waiterDisplayName: 'Ann',
      tableLabel: '12',
    });
    setFloorOrderAttribution(null);
    expect(getFloorOrderAttribution()).toBeNull();
  });
});
