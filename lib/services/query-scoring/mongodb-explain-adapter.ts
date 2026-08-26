import { withDatabase } from '@/lib/db/helpers';
import type { Document } from 'mongodb';
import type { QueryMetrics } from './types';
import { validateCollectionName, validatePipeline } from './validators';
import type { CachedCollectionStats } from './types';

interface MongoExplainResult {
  executionStats?: {
    totalDocsExamined?: number;
    nReturned?: number;
    executionTimeMillis?: number;
    executionStages?: {
      stage?: string;
      indexName?: string;
      memUsage?: number;
    };
  };
  queryPlanner?: {
    winningPlan?: {
      stage?: string;
      inputStage?: {
        stage?: string;
        indexName?: string;
      };
      shards?: Array<{
        winningPlan?: {
          stage?: string;
          inputStage?: {
            stage?: string;
            indexName?: string;
          };
        };
      }>;
    };
    namespace?: string;
    indexFilterSet?: boolean;
    parsedQuery?: Record<string, unknown>;
  };
}

export class MongoDBExplainAdapter {
  private static readonly TIMEOUT_MS = 10000;

  /**
   * Explain query plan WITHOUT executing the query
   * Uses queryPlanner mode which is safe for expensive queries
   */
  static async explain(
    collection: string,
    pipeline: Document[]
  ): Promise<MongoExplainResult> {
    validateCollectionName(collection);
    validatePipeline(pipeline);

    console.log('🔎 [MONGODB EXPLAIN] Running explain() on collection', {
      collection,
      pipelineStages: pipeline.length,
      mode: 'queryPlanner (NO EXECUTION)',
    });

    return withDatabase(async (db) => {
      try {
        const explainStartTime = Date.now();

        // FIX: The global DB connection might have a default writeConcern (e.g. w:1).
        // The 'explain' command cannot be used with writeConcern.
        // We create a reference to the DB without writeConcern to run the explain command.
        const dbNoWriteConcern = db.client.db(db.databaseName, { writeConcern: undefined });

        // CRITICAL: Use queryPlanner mode to avoid executing the query
        // This is safe for expensive queries as it only analyzes the plan
        const result = await Promise.race([
          dbNoWriteConcern
            .collection(collection)
            .aggregate(pipeline)
            .explain('queryPlanner'),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Explain operation timed out')),
              this.TIMEOUT_MS
            )
          ),
        ]);

        const explainTime = Date.now() - explainStartTime;

        const winningPlan = result.queryPlanner?.winningPlan;
        const stage = winningPlan?.stage || winningPlan?.inputStage?.stage;
        const indexName = winningPlan?.inputStage?.indexName || 'none';

        console.log('✅ [MONGODB EXPLAIN] Explain completed (queryPlanner mode)', {
          explainTimeMs: explainTime,
          stage: stage,
          indexUsed: indexName,
          namespace: result.queryPlanner?.namespace,
          hasIndexFilter: result.queryPlanner?.indexFilterSet || false,
        });

        return result as MongoExplainResult;
      } catch (error) {
        console.error('❌ [MONGODB EXPLAIN] MongoDB explain() failed:', {
          collection,
          pipelineLength: pipeline.length,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        // We do NOT throw here for now, or maybe we should?
        // The service layer catches it.
        throw new Error('Unable to analyze query performance');
      }
    });
  }

  /**
   * Extract metrics from query plan and estimate cost
   * Uses queryPlanner output (NO execution) with collection stats for estimation
   */
  static extractMetrics(
    explainResult: MongoExplainResult,
    collectionStats: CachedCollectionStats,
    pipeline: Document[]
  ): QueryMetrics {
    const queryPlanner = explainResult.queryPlanner;
    const winningPlan = queryPlanner?.winningPlan;

    // Determine the stage type from query plan
    const stage = winningPlan?.stage || winningPlan?.inputStage?.stage || '';
    const inputStage = winningPlan?.inputStage;

    const isCollectionScan = stage === 'COLLSCAN';
    const hasIndexScan =
      stage === 'IXSCAN' ||
      inputStage?.stage === 'IXSCAN' ||
      Boolean(inputStage?.indexName);

    const isSortStage = stage === 'SORT';

    // ESTIMATION: Calculate estimated documents to scan
    const estimatedDocsExamined = this.estimateDocsToScan(
      winningPlan,
      collectionStats,
      pipeline,
      isCollectionScan
    );

    // ESTIMATION: Calculate estimated execution time
    const estimatedTimeMs = this.estimateExecutionTime(
      estimatedDocsExamined,
      pipeline,
      hasIndexScan
    );

    // ESTIMATION: Memory usage (if in-memory sort without index)
    const avgObjSize = collectionStats.avgObjSize || 1024; // Default 1KB if not available
    const estimatedMemoryMB = isSortStage && !hasIndexScan
      ? Math.min(estimatedDocsExamined * avgObjSize / (1024 * 1024), 100)
      : 0;

    console.log('📊 [MONGODB EXPLAIN] Metrics estimated (no execution)', {
      estimatedDocsExamined,
      estimatedTimeMs,
      indexesUsed: hasIndexScan,
      collectionScans: isCollectionScan,
      estimatedMemoryMB: estimatedMemoryMB.toFixed(2),
      sortInMemory: isSortStage && !hasIndexScan,
    });

    return {
      docsExamined: estimatedDocsExamined,
      docsReturned: Math.min(estimatedDocsExamined, this.extractLimitFromPipeline(pipeline)),
      executionTimeMs: estimatedTimeMs,
      indexesUsed: hasIndexScan,
      collectionScans: isCollectionScan,
      memoryUsageMB: estimatedMemoryMB,
      sortInMemory: isSortStage && !hasIndexScan,
    };
  }

  /**
   * Estimate documents to scan based on query plan
   */
  private static estimateDocsToScan(
    winningPlan: any,
    collectionStats: CachedCollectionStats,
    pipeline: Document[],
    isCollectionScan: boolean
  ): number {
    const collectionSize = collectionStats.count || 1;

    // Full collection scan - scan entire collection
    if (isCollectionScan) {
      console.log('  ⚠️  COLLSCAN detected - estimating full collection scan');
      return collectionSize;
    }

    // Index scan - estimate selectivity
    const selectivity = this.estimateSelectivity(pipeline, collectionStats);
    const estimated = Math.ceil(collectionSize * selectivity);

    console.log('  ✅ IXSCAN detected - estimating selective scan', {
      selectivity: (selectivity * 100).toFixed(2) + '%',
      estimatedDocs: estimated,
    });

    return estimated;
  }

  /**
   * Estimate selectivity based on $match filters
   */
  private static estimateSelectivity(
    pipeline: Document[],
    stats: CachedCollectionStats
  ): number {
    const matchStage = pipeline.find((stage) => stage.$match);
    if (!matchStage) {
      // No filters - assume moderate selectivity
      return 0.3; // 30% of collection
    }

    const matchFilters = matchStage.$match;
    const filterKeys = Object.keys(matchFilters);

    // Check for equality filters (high selectivity)
    const hasEqualityFilter = filterKeys.some((key) => {
      const value = matchFilters[key];
      return (
        typeof value !== 'object' ||
        value === null ||
        (value.$eq !== undefined)
      );
    });

    if (hasEqualityFilter) {
      // Equality on unique field (like _id or email) = very selective
      const isUniqueField = stats.indexes.some(
        (idx) => idx.unique && filterKeys.includes(Object.keys(idx.keys)[0])
      );
      if (isUniqueField) {
        return 0.0001; // 0.01% - typically 1 document
      }
      return 0.01; // 1% of collection for non-unique equality
    }

    // Check for range filters (medium selectivity)
    const hasRangeFilter = filterKeys.some((key) => {
      const value = matchFilters[key];
      return (
        typeof value === 'object' &&
        value !== null &&
        (value.$gt !== undefined ||
          value.$gte !== undefined ||
          value.$lt !== undefined ||
          value.$lte !== undefined)
      );
    });

    if (hasRangeFilter) {
      return 0.1; // 10% of collection for range queries
    }

    // Complex filters or no specific filters
    return 0.3; // 30% conservative estimate
  }

  /**
   * Estimate execution time based on operation complexity
   */
  private static estimateExecutionTime(
    estimatedDocs: number,
    pipeline: Document[],
    hasIndex: boolean
  ): number {
    // Base time: ~0.1ms per document for index scan, ~0.2ms for collection scan
    let timeMs = estimatedDocs * (hasIndex ? 0.1 : 0.2);

    // Add penalties for expensive operations
    const hasLookup = pipeline.some((stage) => stage.$lookup);
    const hasGroup = pipeline.some((stage) => stage.$group);
    const hasUnwind = pipeline.some((stage) => stage.$unwind);
    const hasSort = pipeline.some((stage) => stage.$sort);

    if (hasLookup) timeMs *= 3; // Lookups are expensive (join operation)
    if (hasGroup) timeMs *= 1.5; // Grouping requires memory
    if (hasUnwind) timeMs *= 1.3; // Array expansion
    if (hasSort && !hasIndex) timeMs *= 2; // In-memory sort is expensive

    return Math.ceil(timeMs);
  }

  /**
   * Extract $limit value from pipeline
   */
  private static extractLimitFromPipeline(pipeline: Document[]): number {
    const limitStage = pipeline.find((stage) => stage.$limit);
    return limitStage?.$limit || 100; // Default to 100 if no limit
  }
}
