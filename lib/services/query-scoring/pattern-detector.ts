/**
 * Query Pattern Detector
 *
 * Detects common anti-patterns and optimization opportunities in MongoDB queries.
 * Identifies: N+1 queries, missing indexes, large projections, etc.
 */

import type { Document } from 'mongodb';

export interface QueryPattern {
  type: 'anti-pattern' | 'optimization' | 'best-practice';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  description: string;
  recommendation: string;
  impact: string;
}

export class PatternDetector {
  /**
   * Analyze a pipeline for common patterns and anti-patterns
   */
  static detectPatterns(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];

    // Detect N+1 query pattern
    patterns.push(...this.detectN1Pattern(pipeline));

    // Detect missing indexes
    patterns.push(...this.detectMissingIndexes(pipeline));

    // Detect large projections
    patterns.push(...this.detectLargeProjections(pipeline));

    // Detect unindexed sorts
    patterns.push(...this.detectUnindexedSorts(pipeline));

    // Detect multiple lookups
    patterns.push(...this.detectMultipleLookups(pipeline));

    // Detect regex patterns
    patterns.push(...this.detectRegexPatterns(pipeline));

    // Detect large skip operations
    patterns.push(...this.detectLargeSkips(pipeline));

    // Detect best practices
    patterns.push(...this.detectBestPractices(pipeline));

    return patterns;
  }

  /**
   * Detect potential N+1 query pattern (multiple lookups in sequence)
   */
  private static detectN1Pattern(pipeline: Document[]): QueryPattern[] {
    const lookups = pipeline.filter((stage) => stage.$lookup);

    if (lookups.length >= 3) {
      return [
        {
          type: 'anti-pattern',
          severity: 'high',
          pattern: 'N+1 Query Pattern',
          description: `Pipeline contains ${lookups.length} $lookup stages which may indicate N+1 query pattern`,
          recommendation:
            'Consider denormalizing data or using fewer lookups by combining collections. Use embedded documents for frequently accessed relationships.',
          impact: 'Multiplies database round trips, causing significant performance degradation',
        },
      ];
    }

    if (lookups.length === 2) {
      return [
        {
          type: 'optimization',
          severity: 'medium',
          pattern: 'Multiple Lookups',
          description: 'Pipeline contains 2 $lookup stages',
          recommendation:
            'Evaluate if data can be denormalized or if lookups can be combined',
          impact: 'Multiple lookups increase query execution time',
        },
      ];
    }

    return [];
  }

  /**
   * Detect queries that likely need indexes
   */
  private static detectMissingIndexes(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];

    for (const stage of pipeline) {
      // Check $match stage for fields that should be indexed
      if (stage.$match) {
        const matchFields = Object.keys(stage.$match);

        // Look for regex queries without index
        for (const field of matchFields) {
          const value = stage.$match[field];

          if (value && typeof value === 'object' && value.$regex) {
            patterns.push({
              type: 'anti-pattern',
              severity: 'high',
              pattern: 'Unindexed Regex Query',
              description: `Regex query on field "${field}" without text index`,
              recommendation: `Create a text index on "${field}" or use exact match when possible`,
              impact: 'Regex queries without indexes perform full collection scans',
            });
          }

          // Check for range queries
          if (
            value &&
            typeof value === 'object' &&
            (value.$gt !== undefined ||
              value.$gte !== undefined ||
              value.$lt !== undefined ||
              value.$lte !== undefined)
          ) {
            patterns.push({
              type: 'optimization',
              severity: 'medium',
              pattern: 'Range Query',
              description: `Range query on field "${field}" detected`,
              recommendation: `Ensure "${field}" has an index for efficient range queries`,
              impact: 'Range queries benefit significantly from indexes',
            });
          }
        }

        // Check for queries on multiple fields (compound index candidate)
        if (matchFields.length >= 2) {
          patterns.push({
            type: 'optimization',
            severity: 'medium',
            pattern: 'Multi-field Query',
            description: `Query filters on ${matchFields.length} fields: ${matchFields.join(', ')}`,
            recommendation: `Consider a compound index on (${matchFields.join(', ')})`,
            impact: 'Compound indexes can dramatically improve multi-field queries',
          });
        }
      }

      // Check $sort stage
      if (stage.$sort) {
        const sortFields = Object.keys(stage.$sort);
        patterns.push({
          type: 'optimization',
          severity: 'medium',
          pattern: 'Sort Operation',
          description: `Sort on fields: ${sortFields.join(', ')}`,
          recommendation: `Ensure index exists on sort fields to avoid in-memory sort`,
          impact: 'In-memory sorts are limited to 100MB and slow',
        });
      }
    }

    return patterns;
  }

  /**
   * Detect projections that return too many fields
   */
  private static detectLargeProjections(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];

    for (const stage of pipeline) {
      if (stage.$project) {
        const includedFields = Object.entries(stage.$project).filter(
          ([_, value]) => value === 1 || value === true
        );

        // If no explicit inclusion, it means all fields (potential issue)
        if (includedFields.length === 0 && !stage.$project._id) {
          patterns.push({
            type: 'anti-pattern',
            severity: 'medium',
            pattern: 'No Field Projection',
            description: 'Query returns all document fields',
            recommendation:
              'Use $project to return only required fields, reducing data transfer',
            impact: 'Returning unnecessary fields wastes network bandwidth and memory',
          });
        }

        // Too many fields projected
        if (includedFields.length > 20) {
          patterns.push({
            type: 'optimization',
            severity: 'low',
            pattern: 'Large Projection',
            description: `Projecting ${includedFields.length} fields`,
            recommendation:
              'Review if all fields are necessary. Consider returning fewer fields.',
            impact: 'Large projections increase memory usage and network transfer',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect sorts without supporting indexes
   */
  private static detectUnindexedSorts(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];

    // Look for $sort after $match (likely needs compound index)
    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];

      if (stage.$sort) {
        const prevStage = i > 0 ? pipeline[i - 1] : null;

        if (prevStage && prevStage.$match) {
          const matchFields = Object.keys(prevStage.$match);
          const sortFields = Object.keys(stage.$sort);

          patterns.push({
            type: 'optimization',
            severity: 'high',
            pattern: 'Match + Sort Pattern',
            description: `Matching on ${matchFields.join(', ')} then sorting by ${sortFields.join(', ')}`,
            recommendation: `Create compound index: {${matchFields.join(': 1, ')}: 1, ${sortFields.join(': 1, ')}: 1}`,
            impact: 'Without compound index, sort will be in-memory and slow',
          });
        }

        // Sort without preceding match is expensive
        if (!prevStage || !prevStage.$match) {
          patterns.push({
            type: 'anti-pattern',
            severity: 'high',
            pattern: 'Sort Without Filter',
            description: 'Sorting entire collection without filtering first',
            recommendation: 'Add $match stage before $sort to reduce documents to sort',
            impact: 'Sorting full collection is extremely expensive',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect multiple $lookup stages
   */
  private static detectMultipleLookups(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];
    let totalLookups = 0;
    let lookupAfterLookup = false;

    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];

      if (stage.$lookup) {
        totalLookups++;

        // Check if previous stage was also a lookup
        const prevStage = i > 0 ? pipeline[i - 1] : null;
        if (prevStage && prevStage.$lookup) {
          lookupAfterLookup = true;
        }
      }
    }

    if (lookupAfterLookup) {
      patterns.push({
        type: 'anti-pattern',
        severity: 'critical',
        pattern: 'Chained Lookups',
        description: 'Multiple $lookup stages in sequence',
        recommendation:
          'Denormalize frequently joined data into a single collection. Use embedded documents.',
        impact: 'Chained lookups exponentially increase query time',
      });
    }

    return patterns;
  }

  /**
   * Detect regex patterns that could be optimized
   */
  private static detectRegexPatterns(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];

    for (const stage of pipeline) {
      if (stage.$match) {
        for (const [field, value] of Object.entries(stage.$match)) {
          if (value && typeof value === 'object' && (value as any).$regex) {
            const regex = (value as any).$regex.toString();

            // Check for case-insensitive regex (very expensive)
            if ((value as any).$options && (value as any).$options.includes('i')) {
              patterns.push({
                type: 'anti-pattern',
                severity: 'high',
                pattern: 'Case-Insensitive Regex',
                description: `Case-insensitive regex on "${field}"`,
                recommendation:
                  'Use text index with case-insensitive search or normalize data to lowercase',
                impact: 'Case-insensitive regex cannot use indexes efficiently',
              });
            }

            // Check for wildcard prefix (cannot use index)
            if (regex.startsWith('.*') || !regex.startsWith('^')) {
              patterns.push({
                type: 'anti-pattern',
                severity: 'high',
                pattern: 'Wildcard Prefix Regex',
                description: `Regex on "${field}" doesn't start with anchor (^)`,
                recommendation:
                  'If possible, anchor regex to start (^pattern) to allow index usage',
                impact: 'Non-anchored regex cannot use indexes',
              });
            }
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Detect large skip operations (inefficient pagination)
   */
  private static detectLargeSkips(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];

    for (const stage of pipeline) {
      if (stage.$skip) {
        const skipAmount = stage.$skip;

        if (skipAmount > 1000) {
          patterns.push({
            type: 'anti-pattern',
            severity: 'critical',
            pattern: 'Large Skip Operation',
            description: `Skipping ${skipAmount} documents`,
            recommendation:
              'Use cursor-based pagination instead of skip. Store last document ID and query from there.',
            impact: 'Large skips scan all skipped documents, degrading linearly',
          });
        } else if (skipAmount > 100) {
          patterns.push({
            type: 'optimization',
            severity: 'medium',
            pattern: 'Moderate Skip Operation',
            description: `Skipping ${skipAmount} documents`,
            recommendation: 'Consider cursor-based pagination for better performance',
            impact: 'Skip operations scan skipped documents',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect best practices being followed
   */
  private static detectBestPractices(pipeline: Document[]): QueryPattern[] {
    const patterns: QueryPattern[] = [];

    // Check for $match at the beginning (good practice)
    if (pipeline.length > 0 && pipeline[0].$match) {
      patterns.push({
        type: 'best-practice',
        severity: 'low',
        pattern: 'Early Filtering',
        description: 'Pipeline starts with $match to filter documents early',
        recommendation: 'Good practice - continue filtering early in pipeline',
        impact: 'Reduces documents processed in later stages',
      });
    }

    // Check for $project to limit fields (good practice)
    const hasProjection = pipeline.some((stage) => stage.$project);
    if (hasProjection) {
      patterns.push({
        type: 'best-practice',
        severity: 'low',
        pattern: 'Field Projection',
        description: 'Pipeline uses $project to limit returned fields',
        recommendation: 'Good practice - only return needed fields',
        impact: 'Reduces network transfer and memory usage',
      });
    }

    // Check for $limit (good for testing/pagination)
    const hasLimit = pipeline.some((stage) => stage.$limit);
    if (hasLimit) {
      patterns.push({
        type: 'best-practice',
        severity: 'low',
        pattern: 'Result Limiting',
        description: 'Pipeline uses $limit to control result size',
        recommendation: 'Good practice for pagination and testing',
        impact: 'Prevents returning excessive documents',
      });
    }

    return patterns;
  }

  /**
   * Get pattern summary for display
   */
  static summarizePatterns(patterns: QueryPattern[]): {
    critical: number;
    high: number;
    medium: number;
    low: number;
    antiPatterns: number;
    optimizations: number;
    bestPractices: number;
  } {
    return {
      critical: patterns.filter((p) => p.severity === 'critical').length,
      high: patterns.filter((p) => p.severity === 'high').length,
      medium: patterns.filter((p) => p.severity === 'medium').length,
      low: patterns.filter((p) => p.severity === 'low').length,
      antiPatterns: patterns.filter((p) => p.type === 'anti-pattern').length,
      optimizations: patterns.filter((p) => p.type === 'optimization').length,
      bestPractices: patterns.filter((p) => p.type === 'best-practice').length,
    };
  }
}
