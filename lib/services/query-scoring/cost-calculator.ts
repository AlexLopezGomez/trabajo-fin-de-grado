import type { CostTier } from '@/types/query-scoring';
import type { QueryMetrics, CachedCollectionStats } from './types';
import { logger } from '@/lib/utils/logger';

export class CostCalculator {
  private static getTierThresholds(): { redMin: number; yellowMin: number } {
    const defaultRedMin = 71;
    const defaultYellowMin = 41;
    const redMinRaw = process.env.QUERY_TIER_RED_MIN;
    const yellowMinRaw = process.env.QUERY_TIER_YELLOW_MIN;

    const redMin = redMinRaw ? Number(redMinRaw) : defaultRedMin;
    const yellowMin = yellowMinRaw ? Number(yellowMinRaw) : defaultYellowMin;

    const isValid =
      Number.isFinite(redMin) &&
      Number.isFinite(yellowMin) &&
      redMin >= 0 &&
      redMin <= 100 &&
      yellowMin >= 0 &&
      yellowMin <= 100 &&
      redMin > yellowMin;

    if (!isValid) {
      return { redMin: defaultRedMin, yellowMin: defaultYellowMin };
    }

    return { redMin, yellowMin };
  }

  static calculateScore(
    metrics: QueryMetrics,
    stats: CachedCollectionStats
  ): number {
    let score = 0;
    const breakdown: Record<string, number> = {};

    const collectionCount = stats.count || 1;
    const scanRatio = metrics.docsExamined / collectionCount;

    logger.debug('[COST CALCULATOR] Starting score calculation');

    // Factor 1: Document Scan Ratio (0-40 points)
    let scanPoints = 0;
    if (scanRatio > 0.5) {
      scanPoints = 40;
    } else if (scanRatio > 0.2) {
      scanPoints = 30;
    } else if (scanRatio > 0.05) {
      scanPoints = 20;
    } else if (scanRatio > 0.01) {
      scanPoints = 10;
    }
    score += scanPoints;
    breakdown['scanRatio'] = scanPoints;

    logger.debug('  📄 Factor 1: Scan Ratio', {
      docsExamined: metrics.docsExamined,
      collectionSize: collectionCount,
      scanRatio: (scanRatio * 100).toFixed(2) + '%',
      points: scanPoints,
      maxPoints: 40,
    });

    // Factor 2: Execution Time (0-25 points)
    let timePoints = 0;
    if (metrics.executionTimeMs > 5000) {
      timePoints = 25;
    } else if (metrics.executionTimeMs > 2000) {
      timePoints = 20;
    } else if (metrics.executionTimeMs > 1000) {
      timePoints = 15;
    } else if (metrics.executionTimeMs > 500) {
      timePoints = 10;
    } else if (metrics.executionTimeMs > 200) {
      timePoints = 5;
    }
    score += timePoints;
    breakdown['executionTime'] = timePoints;

    logger.debug('  ⏱️  Factor 2: Execution Time', {
      executionTimeMs: metrics.executionTimeMs,
      points: timePoints,
      maxPoints: 25,
    });

    // Factor 3: Index Usage (0-25 points)
    let indexPoints = 0;
    if (!metrics.indexesUsed) {
      indexPoints += 15;
    }
    if (metrics.collectionScans) {
      indexPoints += 10;
    }
    score += indexPoints;
    breakdown['indexUsage'] = indexPoints;

    logger.debug('  🔍 Factor 3: Index Usage', {
      indexesUsed: metrics.indexesUsed,
      collectionScan: metrics.collectionScans,
      points: indexPoints,
      maxPoints: 25,
    });

    // Factor 4: Memory Usage (0-10 points)
    let memoryPoints = 0;
    if (metrics.memoryUsageMB > 100) {
      memoryPoints = 10;
    } else if (metrics.memoryUsageMB > 50) {
      memoryPoints = 7;
    } else if (metrics.memoryUsageMB > 20) {
      memoryPoints = 5;
    }
    score += memoryPoints;
    breakdown['memoryUsage'] = memoryPoints;

    logger.debug('  💾 Factor 4: Memory Usage', {
      memoryUsageMB: metrics.memoryUsageMB?.toFixed(2) || 'N/A',
      points: memoryPoints,
      maxPoints: 10,
    });

    // Factor 5: In-Memory Sort (0-10 points)
    let sortPoints = 0;
    if (metrics.sortInMemory) {
      sortPoints = 10;
    }
    score += sortPoints;
    breakdown['inMemorySort'] = sortPoints;

    logger.debug('  📊 Factor 5: In-Memory Sort', {
      sortInMemory: metrics.sortInMemory,
      points: sortPoints,
      maxPoints: 10,
    });

    const finalScore = Math.min(100, score);

    logger.debug('🎯 [COST CALCULATOR] Final score breakdown', {
      totalScore: finalScore,
      breakdown,
      cappedAt100: score > 100,
    });

    return finalScore;
  }

  static classifyTier(score: number): CostTier {
    const { redMin, yellowMin } = CostCalculator.getTierThresholds();

    if (score >= redMin) {
      return 'red';
    } else if (score >= yellowMin) {
      return 'yellow';
    } else {
      return 'green';
    }
  }

  static generateSuggestions(
    metrics: QueryMetrics,
    stats: CachedCollectionStats
  ): string[] {
    const suggestions: string[] = [];

    if (metrics.collectionScans) {
      suggestions.push(
        'Query performs a full collection scan. Consider adding an index to improve performance.'
      );
    }

    if (!metrics.indexesUsed && stats.nindexes && stats.nindexes > 0) {
      suggestions.push(
        'Query does not use any indexes. Review your query filters to ensure they match existing indexes.'
      );
    }

    const scanRatio = metrics.docsExamined / (stats.count || 1);
    suggestions.push(
      `Query scans ${(scanRatio * 100).toFixed(1)}% of the collection (${metrics.docsExamined.toLocaleString()} docs). Consider adding more selective filters.`
    );

    if (metrics.sortInMemory) {
      suggestions.push(
        'Query performs an in-memory sort. Consider adding a compound index that includes the sort fields.'
      );
    }

    suggestions.push(
      `Query uses ${metrics.memoryUsageMB.toFixed(1)}MB of memory. Consider reducing the number of documents processed or using $project to limit fields.`
    );

    if (metrics.executionTimeMs > 2000) {
      suggestions.push(
        `Query execution time is ${metrics.executionTimeMs}ms. Consider optimizing the query or breaking it into smaller operations.`
      );
    }

    if (suggestions.length === 0) {
      suggestions.push('Query appears to be well-optimized.');
    }

    return suggestions;
  }
}
