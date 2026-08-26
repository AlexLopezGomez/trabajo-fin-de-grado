import type { CollectionStats } from '@/types/query-scoring';

export interface CachedCollectionStats extends CollectionStats {
  collection: string;
  indexes: IndexInfo[];
  cachedAt: Date;
  ttl: number;
}

export interface IndexInfo {
  name: string;
  keys: Record<string, number>;
  unique: boolean;
}

export interface QueryMetrics {
  docsExamined: number;
  docsReturned: number;
  executionTimeMs: number;
  indexesUsed: boolean;
  collectionScans: boolean;
  memoryUsageMB: number;
  sortInMemory: boolean;
}
