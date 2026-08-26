// ============================================
// In-Memory Cache System
// Ready for Redis upgrade
// ============================================

import { CacheEntry, QueryResponse } from '@/types';

interface CacheStore {
  [key: string]: CacheEntry;
}

// Global cache store (survives HMR in development)
const globalForCache = global as typeof globalThis & {
  _queryCache?: CacheStore;
};

if (!globalForCache._queryCache) {
  globalForCache._queryCache = {};
}

const cache: CacheStore = globalForCache._queryCache;

// Default TTL: 5 minutes (in milliseconds)
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Generate a cache key from the question
 */
function generateCacheKey(question: string): string {
  // Normalize the question for better cache hits
  return question
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,]/g, '');
}

/**
 * Get a cached response if available and not expired
 */
export function getCachedResponse(question: string): QueryResponse | null {
  const key = generateCacheKey(question);
  const entry = cache[key];

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const isExpired = now - entry.timestamp > entry.ttl;

  if (isExpired) {
    delete cache[key];
    return null;
  }

  // Return cached response with fromCache flag
  return {
    ...entry.response,
    fromCache: true,
  };
}

/**
 * Store a response in the cache
 */
export function setCachedResponse(
  question: string,
  response: QueryResponse,
  ttl: number = DEFAULT_TTL
): void {
  const key = generateCacheKey(question);
  
  cache[key] = {
    response: { ...response, fromCache: false },
    timestamp: Date.now(),
    ttl,
  };
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  Object.keys(cache).forEach((key) => {
    delete cache[key];
  });
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: Object.keys(cache).length,
    keys: Object.keys(cache),
  };
}

/**
 * Remove expired entries from cache
 */
export function cleanupCache(): number {
  const now = Date.now();
  let cleaned = 0;

  Object.entries(cache).forEach(([key, entry]) => {
    if (now - entry.timestamp > entry.ttl) {
      delete cache[key];
      cleaned++;
    }
  });

  return cleaned;
}

