/**
 * Cache Management for Data Fetching
 * Handles in-memory caching with expiration and invalidation
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>();

/**
 * Get cached data if valid
 */
export const getCachedData = <T>(key: string, cacheDuration: number): T | null => {
  if (!key) return null;
  
  const cached = cache.get(key);
  if (!cached) return null;
  
  const isExpired = Date.now() - cached.timestamp > cacheDuration;
  if (isExpired) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
};

/**
 * Set data in cache
 */
export const setCachedData = <T>(key: string, data: T): void => {
  if (!key) return;
  
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

/**
 * Invalidate cached data
 */
export const invalidateCache = (key: string): void => {
  if (!key) return;
  cache.delete(key);
};

/**
 * Clear all cache
 */
export const clearAllCache = (): void => {
  cache.clear();
};

/**
 * Check if data is stale
 */
export const isDataStale = (key: string, staleTime: number): boolean => {
  if (!key) return true;
  
  const cached = cache.get(key);
  if (!cached) return true;
  
  return Date.now() - cached.timestamp > staleTime;
};

/**
 * Get cache stats
 */
export const getCacheStats = () => ({
  size: cache.size,
  keys: Array.from(cache.keys()),
});
