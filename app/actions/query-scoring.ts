'use server';

/**
 * Query Scoring Actions
 *
 * Server actions for query cost scoring and optimization suggestions.
 */

import { requireAuth, logAction } from '@/lib/auth/guards';
import { authz } from '@/lib/services/authorization.service';
import { queryScoringService } from '@/lib/services/query-scoring';
import { checkScoringRateLimit, getRateLimitErrorMessage } from '@/lib/security/rate-limit';
import { getAuthDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import type { QueryCostScore } from '@/types/query-scoring';
import { error as logError } from '@/lib/utils/logger';

interface ScoreQueryInput {
  collection: string;
  pipeline: Record<string, unknown>[];
}

interface ScoreQueryResult {
  success: boolean;
  costScore?: QueryCostScore;
  error?: string;
  requiresApproval?: boolean;
}

/**
 * Score a query before execution or saving
 * Returns cost score and whether approval is required
 */
export async function scoreQueryPreview(input: ScoreQueryInput): Promise<ScoreQueryResult> {
  try {
    const user = await requireAuth();

    // Check rate limit
    const rateLimit = await checkScoringRateLimit(user.id);
    if (!rateLimit.success) {
      await logAction('query_scoring.rate_limited', user.id, {
        collection: input.collection,
        pipelineStages: input.pipeline.length,
      });
      return {
        success: false,
        error: getRateLimitErrorMessage(rateLimit.reset),
      };
    }

    const canAccess = await authz.canAccess(
      user.id,
      { type: 'collection', id: input.collection },
      'view'
    );

    if (!canAccess) {
      await logAction('query_scoring.unauthorized', user.id, {
        collection: input.collection,
      });
      return {
        success: false,
        error: `Access denied: You do not have permission to query "${input.collection}"`,
      };
    }

    const queryScore = await queryScoringService.scoreQuery(
      input.collection,
      input.pipeline
    );

    const capabilities = await authz.getEffectiveCapabilities(user.id);
    const canRunExpensiveQueries = capabilities.permissions.includes('run_expensive_queries');
    const isOperator = user.role === 'operator';
    const isHighImpact = queryScore.tier === 'red';
    const requiresApproval = isOperator && isHighImpact && !canRunExpensiveQueries;

    // Log scoring action
    await logAction('query_scoring.preview', user.id, {
      collection: input.collection,
      pipelineStages: input.pipeline.length,
      costScore: queryScore.costScore,
      tier: queryScore.tier,
      requiresApproval,
    });

    return {
      success: true,
      costScore: queryScore,
      requiresApproval,
    };
  } catch (err) {
    logError('Query scoring preview failed', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to score query',
    };
  }
}

/**
 * Re-score an existing widget query
 * Used when user wants to check if optimization helped
 */
export async function rescoreWidget(widgetId: string): Promise<ScoreQueryResult> {
  try {
    const user = await requireAuth();

    // Check rate limit
    const rateLimit = await checkScoringRateLimit(user.id);
    if (!rateLimit.success) {
      await logAction('widget.rescore_rate_limited', user.id, { widgetId });
      return {
        success: false,
        error: getRateLimitErrorMessage(rateLimit.reset),
      };
    }

    const db = await getAuthDatabase();
    const widget = await db.collection('dashboard_widgets').findOne({
      _id: new ObjectId(widgetId),
    });

    if (!widget) {
      return {
        success: false,
        error: 'Widget not found',
      };
    }

    const dashboard = await db.collection('dashboards').findOne({
      _id: new ObjectId(widget.dashboardId),
    });

    if (!dashboard || dashboard.ownerId !== user.id) {
      await logAction('widget.rescore_unauthorized', user.id, {
        widgetId,
        dashboardId: widget.dashboardId,
      });
      return {
        success: false,
        error: 'Access denied',
      };
    }

    const result = await scoreQueryPreview({
      collection: widget.collection,
      pipeline: widget.pipeline,
    });

    // Log rescoring action
    if (result.success && result.costScore) {
      await logAction('widget.rescored', user.id, {
        widgetId,
        dashboardId: widget.dashboardId,
        newCostScore: result.costScore.costScore,
        newTier: result.costScore.tier,
      });
    }

    return result;
  } catch (err) {
    logError('Widget re-scoring failed', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to re-score widget',
    };
  }
}
