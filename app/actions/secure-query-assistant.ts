"use server";

/**
 * Secure Query Assistant with Authentication, RBAC, Rate Limiting
 * Wraps the original query assistant with security layers
 * 
 * @module secure-query-assistant
 * @description Thin security wrapper around query-assistant.ts
 * 
 * Security layers:
 * 1. Authentication check
 * 2. Rate limiting  
 * 3. Query generation (delegated to query-assistant)
 * 4. RBAC validation
 * 5. Field masking
 * 6. Audit logging
 */

import { auth } from "@/auth";
import { authz } from "@/lib/services/authorization.service";
import {
  checkQueryRateLimit,
  getRateLimitErrorMessage,
} from "@/lib/security/rate-limit";
import { generateAndExecuteQuery, QueryResult } from "./query-assistant";
import { logger } from "@/lib/utils/logger";
import { queryScoringService } from "@/lib/services/query-scoring";

/**
 * Extended Query Result with security metadata
 */
export interface SecureQueryResult extends QueryResult {
  // Security metadata only - cost scoring UI is disabled
  auditLogged?: boolean;
}

/**
 * Execute a secure query with full security stack
 * 
 * @param userQuestion - Natural language query
 * @returns SecureQueryResult with data and security metadata
 */
export async function executeSecureQuery(
  userQuestion: string
): Promise<SecureQueryResult> {
  const startTime = Date.now();

  try {
    // ========================================
    // PHASE 1: Authentication
    // ========================================
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        data: [],
        pipeline: [],
        collection: "",
        explanation: "",
        suggestedVisualization: "table",
        executionTime: Date.now() - startTime,
        error: "Authentication required. Please log in.",
      };
    }

    const { id: userId, role } = session.user;

    logger.info('[SECURE_QUERY] User request', {
      userId,
      role,
      questionPreview: userQuestion.substring(0, 120),
    });

    // ========================================
    // PHASE 2: Rate Limiting
    // ========================================
    const rateLimitResult = await checkQueryRateLimit(userId);

    if (!rateLimitResult.success) {
      const errorMessage = getRateLimitErrorMessage(rateLimitResult.reset);

      logger.warn('[SECURE_QUERY] Rate limit exceeded', {
        userId,
        resetAt: new Date(rateLimitResult.reset).toISOString(),
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit,
      });

      return {
        success: false,
        data: [],
        pipeline: [],
        collection: "",
        explanation: "",
        suggestedVisualization: "table",
        executionTime: Date.now() - startTime,
        error: errorMessage,
      };
    }

    logger.info('[SECURE_QUERY] Rate limit OK', {
      userId,
      remaining: rateLimitResult.remaining,
      limit: rateLimitResult.limit,
    });

    // ========================================
    // PHASE 3: Generate Query (without execution)
    // ========================================
    const result = await generateAndExecuteQuery(userQuestion);

    if (!result.success) {
      return result;
    }

    // Query generated successfully - proceed with execution
    logger.info('[SECURE_QUERY] Query generated', {
      collection: result.collection,
      pipelineStages: result.pipeline.length,
      userId,
    });

    // ========================================
    // PHASE 3.5: Query Cost Scoring & Enforcement
    // ========================================
    let queryScore;
    try {
      queryScore = await queryScoringService.scoreQuery(
        result.collection,
        result.pipeline as Record<string, unknown>[]
      );

      logger.info('[SECURE_QUERY] Query scored', {
        collection: result.collection,
        costScore: queryScore.costScore,
        tier: queryScore.tier,
        userId,
      });

      const capabilities = await authz.getEffectiveCapabilities(userId);
      const canRunExpensiveQueries = capabilities.permissions.includes('run_expensive_queries');

      if (queryScore.tier === 'red' && role === 'operator' && !canRunExpensiveQueries) {
        logger.warn('[SECURE_QUERY] High-impact query blocked', {
          userId,
          role,
          collection: result.collection,
          costScore: queryScore.costScore,
          tier: queryScore.tier,
        });

        await logQueryExecution({
          userId,
          userRole: role,
          question: userQuestion,
          collection: result.collection,
          pipeline: result.pipeline as Record<string, unknown>[],
          resultCount: 0,
          executionTime: Date.now() - startTime,
          success: false,
          error: 'High-impact query blocked pending approval',
          costScore: queryScore.costScore,
          costTier: queryScore.tier,
          estimatedDocsToScan: queryScore.estimatedDocsToScan,
          estimatedTimeMs: queryScore.estimatedTimeMs,
          userAction: 'blocked_requires_approval',
          hasExpensiveQueryPermission: false,
        });

        return {
          success: false,
          data: [],
          pipeline: result.pipeline,
          collection: result.collection,
          explanation: "",
          suggestedVisualization: "table",
          executionTime: Date.now() - startTime,
          requiresApproval: true,
          error: `This query requires significant database resources and needs Supervisor approval. Please save it as a widget to request approval.\n\nFor better performance, consider:\n- Adding filters to reduce data scanned\n- Using indexed fields\n- Limiting result set size`,
        };
      }
    } catch (error) {
      logger.warn('[SECURE_QUERY] Query scoring failed, allowing execution', {
        collection: result.collection,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      queryScore = null;
    }

    // ========================================
    // PHASE 4: RBAC Validation
    // ========================================

    // Validate that the user can access the queried collection
    const canAccess = await authz.canAccess(
      userId,
      { type: 'collection', id: result.collection },
      'view'
    );

    logger.info('[SECURE_QUERY] RBAC Result', {
      canAccess,
      collection: result.collection,
    });

    if (!canAccess) {
      logger.warn('[SECURE_QUERY] Access denied', {
        userId,
        role,
        collection: result.collection,
      });

      return {
        success: false,
        data: [],
        pipeline: [],
        collection: result.collection,
        explanation: "",
        suggestedVisualization: "table",
        executionTime: Date.now() - startTime,
        error: `Access denied: You do not have permission to query the "${result.collection}" collection`,
      };
    }

    // ========================================
    // PHASE 5: Field Masking
    // ========================================
    const maskedData = await authz.maskFields(
      result.data,
      userId,
      { collection: result.collection }
    );

    // ========================================
    // PHASE 4: Audit Logging
    // ========================================
    await logQueryExecution({
      userId,
      userRole: role,
      question: userQuestion,
      collection: result.collection,
      pipeline: result.pipeline as Record<string, unknown>[],
      resultCount: maskedData.length,
      executionTime: result.executionTime,
      success: true,
      costScore: queryScore?.costScore,
      costTier: queryScore?.tier,
      estimatedDocsToScan: queryScore?.estimatedDocsToScan,
      estimatedTimeMs: queryScore?.estimatedTimeMs,
    });

    logger.info('[SECURE_QUERY] Success', {
      collection: result.collection,
      resultCount: maskedData.length,
      executionTimeMs: result.executionTime,
      userId,
    });

    // Return results with masked data
    return {
      ...result,
      data: maskedData as Record<string, unknown>[],
      auditLogged: true,
    };
  } catch (error) {
    logger.error('[SECURE_QUERY] Unexpected error', error, {
      questionPreview: userQuestion.substring(0, 120),
    });

    // Log failed query
    const session = await auth();
    if (session?.user) {
      await logQueryExecution({
        userId: session.user.id,
        userRole: session.user.role,
        question: userQuestion,
        collection: "",
        pipeline: [],
        resultCount: 0,
        executionTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return {
      success: false,
      data: [],
      pipeline: [],
      collection: "",
      explanation: "",
      suggestedVisualization: "table",
      executionTime: Date.now() - startTime,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred",
    };
  }
}

/**
 * Log query execution to MongoDB for audit trail
 */
async function logQueryExecution(log: {
  userId: string;
  userRole: string;
  question: string;
  collection: string;
  pipeline: Array<Record<string, unknown>>;
  resultCount: number;
  executionTime: number;
  success: boolean;
  error?: string;
  costScore?: number;
  costTier?: string;
  estimatedDocsToScan?: number;
  estimatedTimeMs?: number;
  userAction?: string;
  hasExpensiveQueryPermission?: boolean;
}): Promise<void> {
  try {
    const { withAuthDatabase } = await import("@/lib/db/helpers");
    const { withNamespaceField } = await import("@/lib/db/namespace");

    await withAuthDatabase(async (db) => {
      await db.collection("query_audit_logs").insertOne(withNamespaceField({
        ...log,
        executedAt: new Date(),
      }));
    });
  } catch (error) {
    logger.error('[AUDIT_LOG] Failed to log query', error);
  }
}

/**
 * Get user's query statistics
 * Useful for usage dashboards
 */
export async function getUserQueryStats() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Authentication required");
  }

  try {
    const { withAuthDatabase } = await import("@/lib/db/helpers");
    const { namespaceOrLegacyFilter } = await import("@/lib/db/namespace");

    return await withAuthDatabase(async (db) => {
      const stats = await db
        .collection("query_audit_logs")
        .aggregate([
          {
            $match: {
              userId: session.user.id,
              ...namespaceOrLegacyFilter(),
              executedAt: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: null,
              totalQueries: { $sum: 1 },
              successfulQueries: {
                $sum: { $cond: ["$success", 1, 0] },
              },
              failedQueries: {
                $sum: { $cond: ["$success", 0, 1] },
              },
              avgExecutionTime: { $avg: "$executionTime" },
              totalResults: { $sum: "$resultCount" },
            },
          },
        ])
        .toArray();

      return stats[0] || {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        avgExecutionTime: 0,
        totalResults: 0,
      };
    });
  } catch (error) {
    logger.error('[STATS] Failed to get user stats', error, { userId: session?.user?.id });
    throw error;
  }
}

/**
 * Get user's recent queries
 */
export async function getUserRecentQueries(limit: number = 10) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Authentication required");
  }

  try {
    const { withAuthDatabase } = await import("@/lib/db/helpers");
    const { namespaceOrLegacyFilter } = await import("@/lib/db/namespace");

    return await withAuthDatabase(async (db) => {
      const queries = await db
        .collection("query_audit_logs")
        .find({
          userId: session.user.id,
          ...namespaceOrLegacyFilter(),
        })
        .sort({ executedAt: -1 })
        .limit(limit)
        .toArray();

      return queries.map((q) => ({
        question: q.question,
        collection: q.collection,
        success: q.success,
        executedAt: q.executedAt,
        executionTime: q.executionTime,
        resultCount: q.resultCount,
      }));
    });
  } catch (error) {
    logger.error('[HISTORY] Failed to get user history', error, { userId: session.user.id });
    throw error;
  }
}
