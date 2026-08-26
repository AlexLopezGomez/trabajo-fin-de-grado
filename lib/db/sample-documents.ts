/**
 * Sample Document Fetcher with LRU Caching
 *
 * Fetches representative sample documents from MongoDB collections for AI schema discovery.
 * Uses LRU cache with 15-minute TTL (same strategy as collection stats).
 *
 * Why cache sample documents?
 * - Sample documents are relatively stable (don't change frequently)
 * - Fetching samples can be expensive for large collections
 * - AI prompts benefit from consistent examples
 * - 15-minute TTL balances freshness with performance
 */

import { LRUCache } from 'lru-cache';
import { withDatabase } from './helpers';
import type { Document } from 'mongodb';
import { logger } from '@/lib/utils/logger';
import { CATALOG_SUMMARIES } from '@/lib/ai/generated/schema-catalog';

// ============================================
// Cache Configuration
// ============================================

interface CachedSamples {
  collection: string;
  samples: Document[];
  cachedAt: Date;
  ttl: number;
}

/**
 * LRU cache for sample documents
 * - Max 100 entries (sufficient for 80-120 collections with occasional duplicates)
 * - 15-minute TTL (matches collection stats cache)
 * - Max 5MB total size (assuming ~50KB per entry)
 */
const sampleCache = new LRUCache<string, CachedSamples>({
  max: 100,
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 5 * 1024 * 1024, // 5MB
  sizeCalculation: (value) => {
    return JSON.stringify(value.samples).length;
  },
  dispose: (value, key) => {
    logger.debug('[SAMPLE CACHE] Evicted entry', { key });
  },
});

// ============================================
// Sample Document Fetcher
// ============================================

export interface SampleDocumentOptions {
  /**
   * Bypass cache and fetch fresh samples (default: false)
   */
  bypassCache?: boolean;

  /**
   * Sampling strategy (default: 'random')
   * - 'random': Use MongoDB's $sample (faster, less deterministic)
   * - 'recent': Sort by _id descending (recent documents)
   * - 'first': First N documents (fastest, but not representative)
   */
  strategy?: 'random' | 'recent' | 'first';

  /**
   * Timeout in milliseconds (default: 3000ms)
   */
  timeout?: number;
}

/**
 * Fetch sample documents from a collection
 *
 * @param collection - Collection name
 * @param limit - Number of samples to fetch (default: 2, max: 10)
 * @param options - Fetching options
 * @returns Array of sample documents
 *
 * @example
 * ```ts
 * const samples = await getSampleDocuments('users', 2);
 * console.log(samples); // [{ _id: ..., email: ..., ... }, ...]
 * ```
 */
export async function getSampleDocuments(
  collection: string,
  limit: number = 2,
  options: SampleDocumentOptions = {}
): Promise<Document[]> {
  const {
    bypassCache = false,
    strategy = 'random',
    timeout = 2000, // Reduced from 3000ms to 2000ms (Security Fix #2)
  } = options;

  // Security Fix #3: Validate collection name against catalog
  const validCollections = CATALOG_SUMMARIES.map((c) => c.name);
  if (!validCollections.includes(collection)) {
    throw new Error(`Invalid collection name: ${collection}`);
  }

  // Sanitize collection name for cache key (remove special chars)
  const sanitizedCollection = collection.replace(/[^a-z0-9_]/gi, '');

  // Enforce limit bounds
  const safeLimit = Math.max(1, Math.min(limit, 10));

  logger.debug('[SAMPLE DOCS] Fetching samples', {
    collection,
    sanitizedCollection,
    limit: safeLimit,
    strategy,
    bypassCache,
  });

  // Check cache first (unless bypass is requested)
  if (!bypassCache) {
    const cacheKey = `${sanitizedCollection}:${safeLimit}:${strategy}`;
    const cached = sampleCache.get(cacheKey);

    if (cached) {
      logger.debug('[SAMPLE DOCS] Cache hit', {
        collection,
        age: Date.now() - cached.cachedAt.getTime(),
      });
      return cached.samples;
    }
  }

  // Fetch from database
  try {
    const startTime = Date.now();

    const samples = await Promise.race([
      fetchSamplesFromDatabase(collection, safeLimit, strategy),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sample fetch timed out')), timeout)
      ),
    ]);

    const fetchTime = Date.now() - startTime;

    logger.debug('[SAMPLE DOCS] Fetched from database', {
      collection,
      count: samples.length,
      fetchTimeMs: fetchTime,
      strategy,
    });

    // Store in cache (using sanitized collection name)
    const cacheKey = `${sanitizedCollection}:${safeLimit}:${strategy}`;
    sampleCache.set(cacheKey, {
      collection,
      samples,
      cachedAt: new Date(),
      ttl: 15 * 60 * 1000,
    });

    return samples;
  } catch (error) {
    logger.error('❌ [SAMPLE DOCS] Fetch failed', {
      collection,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Fetch samples from MongoDB using specified strategy
 */
async function fetchSamplesFromDatabase(
  collection: string,
  limit: number,
  strategy: 'random' | 'recent' | 'first'
): Promise<Document[]> {
  return withDatabase(async (db) => {
    const coll = db.collection(collection);

    switch (strategy) {
      case 'random':
        // Use MongoDB's $sample aggregation (fast, random sampling)
        return coll.aggregate([{ $sample: { size: limit } }]).toArray();

      case 'recent':
        // Sort by _id descending (recent documents first)
        return coll.find().sort({ _id: -1 }).limit(limit).toArray();

      case 'first':
        // First N documents (fastest, but not representative)
        return coll.find().limit(limit).toArray();

      default:
        throw new Error(`Unknown sampling strategy: ${strategy}`);
    }
  });
}

// ============================================
// Batch Fetcher
// ============================================

/**
 * Fetch samples for multiple collections in parallel
 *
 * @param collections - Array of collection names
 * @param samplesPerCollection - Number of samples per collection (default: 2)
 * @param options - Fetching options
 * @returns Map of collection name to sample documents
 *
 * @example
 * ```ts
 * const samples = await getSampleDocumentsBatch(['users', 'wallets'], 2);
 * console.log(samples.get('users')); // [{ ... }, { ... }]
 * ```
 */
export async function getSampleDocumentsBatch(
  collections: string[],
  samplesPerCollection: number = 2,
  options: SampleDocumentOptions = {}
): Promise<Map<string, Document[]>> {
  logger.debug('[SAMPLE DOCS] Batch fetching samples', {
    collections,
    samplesPerCollection,
  });

  const startTime = Date.now();

  // Fetch in parallel
  const results = await Promise.allSettled(
    collections.map((collection) =>
      getSampleDocuments(collection, samplesPerCollection, options)
    )
  );

  const sampleMap = new Map<string, Document[]>();

  results.forEach((result, index) => {
    const collection = collections[index];
    if (result.status === 'fulfilled') {
      sampleMap.set(collection, result.value);
    } else {
      logger.warn(`Failed to fetch samples for ${collection}:`, result.reason);
      sampleMap.set(collection, []);
    }
  });

  const fetchTime = Date.now() - startTime;

  logger.debug('[SAMPLE DOCS] Batch fetch completed', {
    requestedCount: collections.length,
    returnedCount: sampleMap.size,
    fetchTimeMs: fetchTime,
    successCount: Array.from(sampleMap.values()).filter((s) => s.length > 0).length,
  });

  return sampleMap;
}

// ============================================
// Cache Management
// ============================================

/**
 * Clear sample cache for a specific collection
 */
export function invalidateSampleCache(collection: string): void {
  // Clear all cache entries for this collection (different limits/strategies)
  const keysToDelete: string[] = [];
  sampleCache.forEach((_, key) => {
    if (key.startsWith(`${collection}:`)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => sampleCache.delete(key));

  logger.debug('[SAMPLE CACHE] Invalidated cache', {
    collection,
    entriesDeleted: keysToDelete.length,
  });
}

/**
 * Clear entire sample cache
 */
export function clearSampleCache(): void {
  const size = sampleCache.size;
  sampleCache.clear();

  logger.debug('[SAMPLE CACHE] Cleared entire cache', {
    entriesDeleted: size,
  });
}

/**
 * Get cache statistics
 */
export function getSampleCacheStats() {
  return {
    size: sampleCache.size,
    maxSize: sampleCache.max,
    calculatedSize: sampleCache.calculatedSize,
    maxCalculatedSize: sampleCache.maxSize,
  };
}
