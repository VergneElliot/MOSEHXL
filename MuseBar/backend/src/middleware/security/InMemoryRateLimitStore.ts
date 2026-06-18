/**
 * In-memory rate limit store adapter.
 * Works only in a single process; resets on restart. Use for dev or when no pool is provided.
 */

import { IRateLimitStoreAdapter } from './types';

export class InMemoryRateLimitStore implements IRateLimitStoreAdapter {
  private store: Record<string, { count: number; resetTime: number }> = {};

  async incrementAndGet(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const currentEntry = this.store[key];
    const entry = !currentEntry || now > currentEntry.resetTime
      ? {
        count: 1,
        resetTime: now + windowMs,
      }
      : {
        ...currentEntry,
        count: currentEntry.count + 1,
      };

    this.store[key] = entry;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  async getEntriesForStats(): Promise<Array<{ key: string; count: number; resetTime: number }>> {
    return Object.entries(this.store).map(([key, data]) => ({ key, ...data }));
  }

  async getCount(key: string): Promise<number> {
    return this.store[key]?.count ?? 0;
  }

  async resetKey(key: string): Promise<boolean> {
    if (this.store[key]) {
      delete this.store[key];
      return true;
    }
    return false;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const key of Object.keys(this.store)) {
      const entry = this.store[key];
      if (entry && entry.resetTime < now) {
        delete this.store[key];
      }
    }
  }
}
