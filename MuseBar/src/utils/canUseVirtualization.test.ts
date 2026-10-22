import { afterEach, describe, expect, it, vi } from 'vitest';
import { canUseVirtualization } from './canUseVirtualization';

describe('canUseVirtualization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true when ResizeObserver exists', () => {
    vi.stubGlobal('ResizeObserver', class {});
    expect(canUseVirtualization()).toBe(true);
  });

  it('is false when ResizeObserver is missing', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    expect(canUseVirtualization()).toBe(false);
  });
});
