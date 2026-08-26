import type { Document } from 'mongodb';
import { logger } from '@/lib/utils/logger';
import { CollectionStats, QueryCostScore } from '@/types/query-scoring';
import { QueryMetrics } from './types';
import { CollectionStatsCache } from './collection-stats-cache';
import { MongoDBExplainAdapter } from './mongodb-explain-adapter';
import { CostCalculator } from './cost-calculator';
import { PatternDetector } from './pattern-detector';

export class QueryScoringService {
  private statsCache: CollectionStatsCache;

  constructor() {
    this.statsCache = new CollectionStatsCache();
  }

  async scoreQuery(
    collection: string,
    pipeline: Document[]
  ): Promise<QueryCostScore> {
    const startTime = Date.now();

    logger.debug('[QUERY SCORING] Starting query score calculation', {
      collection,
      pipelineStages: pipeline.length,
      pipeline: JSON.stringify(pipeline, null, 2),
    });

    try {
      logger.debug('[QUERY SCORING] Fetching collection stats and running explain()...');

      const [stats, explainResult] = await Promise.all([
        this.statsCache.get(collection),
        MongoDBExplainAdapter.explain(collection, pipeline),
      ]);

      logger.debug('[QUERY SCORING] Collection stats retrieved', {
        collection,
        totalDocuments: stats.count,
        collectionSizeMB: ((stats.size || 0) / (1024 * 1024)).toFixed(2),
        avgDocSizeKB: ((stats.avgObjSize || 0) / 1024).toFixed(2),
        indexes: stats.indexes.length,
        cacheHit: 'from cache', // The cache handles this internally
      });

      const metrics = MongoDBExplainAdapter.extractMetrics(explainResult, stats, pipeline);

      logger.debug('[QUERY SCORING] Query metrics estimated (no execution)', {
        estimatedDocsExamined: metrics.docsExamined,
        estimatedTimeMs: metrics.executionTimeMs,
        indexesUsed: metrics.indexesUsed,
        collectionScans: metrics.collectionScans,
        estimatedMemoryMB: metrics.memoryUsageMB?.toFixed(2) || 'N/A',
        sortInMemory: metrics.sortInMemory,
        estimatedScanRatio: ((metrics.docsExamined / stats.count) * 100).toFixed(2) + '%',
        note: 'Values are ESTIMATED from query plan analysis (query NOT executed)',
      });

      const costScore = CostCalculator.calculateScore(metrics, stats);
      const tier = CostCalculator.classifyTier(costScore);
      const suggestions = CostCalculator.generateSuggestions(metrics, stats);

      logger.debug('[QUERY SCORING] Cost score calculated', {
        costScore,
        tier: tier.toUpperCase(),
        breakdown: {
          scanRatio: ((metrics.docsExamined / stats.count) * 100).toFixed(2) + '%',
          executionTime: metrics.executionTimeMs + 'ms',
          indexUsed: metrics.indexesUsed ? 'YES' : 'NO',
          collectionScan: metrics.collectionScans ? 'YES' : 'NO',
        },
      });

      // Phase 4: Detect query patterns
      const patterns = PatternDetector.detectPatterns(pipeline);

      const scoringTime = Date.now() - startTime;

      logger.debug('[QUERY SCORING] Scoring complete', {
        collection,
        finalScore: costScore,
        tier: tier.toUpperCase(),
        totalScoringTime: scoringTime + 'ms',
        suggestions: suggestions.length,
        patterns: patterns.length,
      });

      return {
        costScore,
        tier,
        estimatedDocsToScan: metrics.docsExamined,
        estimatedTimeMs: metrics.executionTimeMs,
        usesIndex: metrics.indexesUsed,
        collectionSize: stats.count,
        suggestions,
        patterns,
        performanceMetrics: {
          scoringTime,
        },
      };
    } catch (error) {
      console.error('❌ [QUERY SCORING] Query scoring failed:', {
        collection,
        pipelineLength: pipeline.length,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      const scoringTime = Date.now() - startTime;

      return {
        costScore: 50,
        tier: 'yellow',
        estimatedDocsToScan: 0,
        estimatedTimeMs: 0,
        usesIndex: false,
        collectionSize: 0,
        suggestions: [
          'Unable to score query. Defaulting to MEDIUM impact classification.',
          'Please try again or contact support if the issue persists.',
        ],
        performanceMetrics: {
          scoringTime,
        },
      };
    }
  }

  invalidateCache(collection: string): void {
    this.statsCache.invalidate(collection);
  }

  clearCache(): void {
    this.statsCache.clear();
  }

  getCacheStats() {
    return this.statsCache.getCacheStats();
  }
}

export const queryScoringService = new QueryScoringService();
