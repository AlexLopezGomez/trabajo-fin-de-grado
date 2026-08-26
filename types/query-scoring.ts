// ============================================
// Query Cost Scoring Types
// ============================================

import type { PipelineStage } from './index';

/**
 * Cost tier classification
 */
export type CostTier = 'green' | 'yellow' | 'red';

/**
 * Query pattern detection result
 */
export interface QueryPattern {
  type: 'anti-pattern' | 'optimization' | 'best-practice';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  description: string;
  recommendation: string;
  impact: string;
}

/**
 * Query cost score result
 */
export interface QueryCostScore {
  costScore: number;
  tier: CostTier;
  estimatedDocsToScan: number;
  estimatedTimeMs: number;
  usesIndex: boolean;
  collectionSize: number;
  suggestions: string[];
  patterns?: QueryPattern[];
  performanceMetrics: {
    scoringTime: number;
  };
}

/**
 * MongoDB explain output (simplified subset)
 */
export interface ExplainResult {
  queryPlanner: {
    winningPlan: {
      stage?: string;
      inputStage?: {
        stage?: string;
        indexName?: string;
      };
    };
    namespace?: string;
  };
  serverInfo?: {
    host?: string;
    version?: string;
  };
}

/**
 * MongoDB collection stats (simplified subset)
 */
export interface CollectionStats {
  ns?: string;
  count: number;
  size?: number;
  avgObjSize?: number;
  storageSize?: number;
  totalIndexSize?: number;
  nindexes?: number;
  ok?: number;
}

/**
 * Pipeline complexity analysis
 */
export interface PipelineComplexity {
  hasEarlyMatch: boolean;
  hasLimit: boolean;
  hasLookup: boolean;
  hasUnwind: boolean;
  hasGroup: boolean;
  hasSortWithoutIndex: boolean;
  stageCount: number;
}
