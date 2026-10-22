import { describe, expect, it, vi } from 'vitest';
import { InMemoryRateLimitStore } from './InMemoryRateLimitStore';

describe('InMemoryRateLimitStore', () => {
  it('increments within window and resets after expiry', async () => {
    vi.useFakeTimers();
    const store = new InMemoryRateLimitStore();
    const first = await store.incrementAndGet('k', 1000);
    expect(first.count).toBe(1);
    const second = await store.incrementAndGet('k', 1000);
    expect(second.count).toBe(2);
    expect(await store.getCount('k')).toBe(2);

    vi.advanceTimersByTime(1001);
    const third = await store.incrementAndGet('k', 1000);
    expect(third.count).toBe(1);

    expect(await store.resetKey('k')).toBe(true);
    expect(await store.getCount('k')).toBe(0);
    expect(await store.resetKey('missing')).toBe(false);

    await store.incrementAndGet('old', 1);
    vi.advanceTimersByTime(10);
    await store.cleanup();
    expect(await store.getEntriesForStats()).toEqual([]);
    vi.useRealTimers();
  });
});
