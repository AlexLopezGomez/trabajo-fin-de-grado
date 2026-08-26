import { LRUCache } from 'lru-cache';
import { withDatabase } from '@/lib/db/helpers';
import type { CachedCollectionStats, IndexInfo } from './types';
import { validateCollectionName } from './validators';

export class CollectionStatsCache {
  private cache: LRUCache<string, CachedCollectionStats>;
  private readonly TTL = 15 * 60 * 1000;
  private readonly MAX_ENTRIES = 500;
  private readonly MAX_INDEXES_TO_CACHE = 50;
  private readonly MAX_INDEX_KEY_SIZE = 100;

  constructor() {
    this.cache = new LRUCache<string, CachedCollectionStats>({
      max: this.MAX_ENTRIES,
      ttl: this.TTL,
    });
  }

  async get(collection: string): Promise<CachedCollectionStats> {
    validateCollectionName(collection);

    const cached = this.cache.get(collection);
    if (cached) {
      const age = Date.now() - cached.cachedAt.getTime();
      console.log('✨ [STATS CACHE] Cache HIT', {
        collection,
        cacheAgeSeconds: Math.round(age / 1000),
        ttlSeconds: Math.round(this.TTL / 1000),
        documentsCount: cached.count,
      });
      return cached;
    }

    console.log('💾 [STATS CACHE] Cache MISS - fetching from database', {
      collection,
      cacheSize: this.cache.size,
      maxSize: this.MAX_ENTRIES,
    });

    return withDatabase(async (db) => {
      const fetchStartTime = Date.now();

      const [stats, indexesInfo] = await Promise.all([
        db.command({ collStats: collection }).catch(() => ({
          count: 0,
          size: 0,
          avgObjSize: 0,
          storageSize: 0,
          totalIndexSize: 0,
          nindexes: 0,
        })),
        db.collection(collection).listIndexes().toArray().catch(() => []),
      ]);

      const fetchTime = Date.now() - fetchStartTime;

      const indexes: IndexInfo[] = indexesInfo
        .slice(0, this.MAX_INDEXES_TO_CACHE)
        .map((idx) => ({
          name: idx.name.substring(0, this.MAX_INDEX_KEY_SIZE),
          keys: this.sanitizeIndexKeys(idx.key || {}),
          unique: idx.unique || false,
        }));

      const entry: CachedCollectionStats = {
        collection,
        count: stats.count || 0,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        totalIndexSize: stats.totalIndexSize,
        nindexes: stats.nindexes,
        indexes,
        cachedAt: new Date(),
        ttl: this.TTL,
      };

      this.cache.set(collection, entry);

      console.log('✅ [STATS CACHE] Stats fetched and cached', {
        collection,
        fetchTimeMs: fetchTime,
        documentsCount: entry.count,
        indexesCount: entry.indexes.length,
        sizeMB: ((entry.size || 0) / (1024 * 1024)).toFixed(2),
        cacheSize: this.cache.size,
      });

      return entry;
    });
  }

  invalidate(collection: string): void {
    this.cache.delete(collection);
  }

  clear(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; max: number; ttl: number } {
    return {
      size: this.cache.size,
      max: this.MAX_ENTRIES,
      ttl: this.TTL,
    };
  }

  private sanitizeIndexKeys(keys: Record<string, number>): Record<string, number> {
    const sanitized: Record<string, number> = {};
    let count = 0;

    for (const [key, value] of Object.entries(keys)) {
      if (count >= 20) break;
      sanitized[key.substring(0, 100)] = value;
      count++;
    }

    return sanitized;
  }
}

export const collectionStatsCache = new CollectionStatsCache();
